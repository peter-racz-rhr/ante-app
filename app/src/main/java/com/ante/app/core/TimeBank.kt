package com.ante.app.core

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * All of Ante's time accounting. Pure Kotlin so it can be unit tested on the JVM.
 * Not thread safe: callers (see [com.ante.app.Bank]) synchronize access.
 */
class TimeBank(initial: BankState = BankState()) {
    var state: BankState = initial
        private set

    /** Local time zone, for schedules. [com.ante.app.Bank] keeps it current; tests set it. */
    var zone: ZoneId = ZoneId.systemDefault()

    /** Stakes placed but not settled yet, per app. Kept in memory only: an unfinished hand is lost. */
    private val openStakes = mutableMapOf<String, Int>()

    /** Resets every budget when the calendar day changes. Returns true when a reset happened. */
    fun rollover(today: String, nowMs: Long? = null): Boolean {
        if (state.day == today) return false
        // A session still running at midnight counts towards the day it ran in.
        val running = state.session
        if (running != null && nowMs != null) {
            val used = ((nowMs - running.startedAtMs).coerceAtLeast(0) / 1000L).toInt().coerceAtMost(running.grantedSec)
            addUsed(running.pkg, used)
        }
        val archived = if (state.day.isEmpty()) state.history else {
            (listOf(DaySummary(state.day, state.usedTodaySec, state.wonTodaySec, state.lostTodaySec, state.usedTodayByApp)) + state.history).take(HISTORY_MAX)
        }
        state = state.copy(
            history = archived,
            usedTodaySec = 0,
            usedTodayByApp = emptyMap(),
            wonTodaySec = 0,
            lostTodaySec = 0,
            day = today,
            limits = state.limits.map { it.copy(leftSec = it.limitSec) },
            ledger = emptyList(),
            session = null,
            parked = emptyMap(),
        )
        openStakes.clear()
        return true
    }

    /**
     * Resets the day when trusted time has crossed local midnight. A reset also needs at least
     * 23 hours since the current day began (the shortest day, with daylight saving), so hopping
     * time zones can't bring tomorrow's budget early.
     */
    fun rolloverIfDue(nowMs: Long, zone: ZoneId): Boolean {
        val date = Instant.ofEpochMilli(nowMs).atZone(zone).toLocalDate()
        val today = date.toString()
        if (today == state.day) {
            // Saves from before the 23 h gate existed: give today its start so the gate applies now.
            if (state.dayStartMs == 0L) state = state.copy(dayStartMs = date.atStartOfDay(zone).toInstant().toEpochMilli())
            return false
        }
        if (state.dayStartMs != 0L && nowMs < state.dayStartMs + MIN_DAY_MS) return false
        rollover(today, nowMs)
        state = state.copy(dayStartMs = date.atStartOfDay(zone).toInstant().toEpochMilli())
        return true
    }

    /** Replaces the state with a restored backup (see [Backup.merge]); the clock anchor stays this phone's. */
    fun replaceState(next: BankState) {
        state = next.copy(clock = state.clock, session = state.session)
        openStakes.clear()
    }

    /** Deletes everything (the user asked to delete their data), keeping only the clock anchor. */
    fun wipe(today: String) {
        state = BankState(clock = state.clock)
        openStakes.clear()
        rollover(today)
    }

    fun setStrict(on: Boolean) {
        state = state.copy(strict = on, settingsPassUntilMs = if (on) state.settingsPassUntilMs else 0, strictUntilMs = if (on) state.strictUntilMs else 0)
    }

    /**
     * Timed strict mode: on for [durationMs] and no way off until then. A new lock can only push
     * the end further out, never pull it in.
     */
    fun startStrict(nowMs: Long, durationMs: Long): Boolean {
        if (durationMs <= 0 || durationMs > STRICT_MAX_MS) return false
        val end = maxOf(nowMs + durationMs, if (isStrict(nowMs)) state.strictUntilMs else 0L)
        state = state.copy(strict = true, strictUntilMs = end)
        return true
    }

    /** Strict mode is on now: untimed (legacy) or timed and not yet over. */
    fun isStrict(nowMs: Long): Boolean = state.strict && (state.strictUntilMs == 0L || nowMs < state.strictUntilMs)

    /** A timed lock can't be left before its end; the old untimed mode leaves after the wait. */
    fun canLeaveStrict(nowMs: Long): Boolean = state.strictUntilMs == 0L || nowMs >= state.strictUntilMs

    /** Focus for [durationMs]: ends any open session (refunding what's left) so the app is covered now. */
    fun startFocus(nowMs: Long, durationMs: Long): Boolean {
        if (durationMs <= 0 || durationMs > FOCUS_MAX_MS) return false
        endSession(nowMs)
        state = state.copy(focusUntilMs = nowMs + durationMs)
        return true
    }

    /** Ends Focus now, the manual one and any scheduled window running (until that window is over). */
    fun endFocus(nowMs: Long = 0) {
        val skip = scheduledFocusEnd(nowMs) ?: state.scheduleSkipUntilMs
        state = state.copy(focusUntilMs = 0, scheduleSkipUntilMs = skip)
    }

    fun isFocus(nowMs: Long): Boolean = nowMs < state.focusUntilMs || scheduledFocusEnd(nowMs) != null

    /** When Focus ends, counting both a manual session and scheduled windows (0 = not in Focus). */
    fun focusEndsAt(nowMs: Long): Long {
        val manual = if (nowMs < state.focusUntilMs) state.focusUntilMs else 0L
        return maxOf(manual, scheduledFocusEnd(nowMs) ?: 0L)
    }

    /** The end of the scheduled window covering now (the latest, if they overlap), unless it was skipped. */
    fun scheduledFocusEnd(nowMs: Long): Long? {
        if (nowMs < state.scheduleSkipUntilMs) return null
        return state.schedules.mapNotNull { it.activeEnd(nowMs, zone) }.maxOrNull()
    }

    /** The next time a schedule starts or ends, so the watcher can wake up for it. */
    fun nextScheduleChange(nowMs: Long): Long? =
        (state.schedules.mapNotNull { it.nextChange(nowMs, zone) } + listOf(state.scheduleSkipUntilMs).filter { it > nowMs }).minOrNull()

    /** During Focus no session runs: one still open (it started before a window began) ends with a refund. */
    fun enforceFocus(nowMs: Long): String? {
        val s = state.session ?: return null
        if (!isFocus(nowMs)) return null
        endSession(nowMs)
        return s.pkg
    }

    /**
     * Adds or changes a schedule. Changing or removing one is refused while Strict mode is on or
     * while any scheduled window runs, since that would be a way out; adding one always works.
     */
    fun setSchedule(s: Schedule, nowMs: Long): Boolean {
        val clean = s.copy(label = s.label.trim().take(24))
        if (!clean.valid) return false
        val existing = state.schedules.firstOrNull { it.id == clean.id }
        if (existing == null) {
            if (state.schedules.size >= Schedule.MAX) return false
        } else if (!canEditSchedules(nowMs)) return false
        state = state.copy(schedules = if (existing == null) state.schedules + clean else state.schedules.map { if (it.id == clean.id) clean else it })
        return true
    }

    fun removeSchedule(id: Int, nowMs: Long): Boolean {
        if (state.schedules.none { it.id == id } || !canEditSchedules(nowMs)) return false
        state = state.copy(schedules = state.schedules.filterNot { it.id == id })
        return true
    }

    fun canEditSchedules(nowMs: Long): Boolean = !isStrict(nowMs) && scheduledFocusEnd(nowMs) == null

    fun nextScheduleId(): Int = (state.schedules.maxOfOrNull { it.id } ?: 0) + 1

    /* ---------- daily free spin ---------- */

    /** Yesterday was spent within today's total budget, and today's spin is still unused. */
    fun freeSpinAvailable(): Boolean {
        if (state.day.isEmpty() || state.freeSpinDay == state.day) return false
        val budget = state.limits.sumOf { it.limitSec.toLong() }
        if (budget <= 0) return false
        val yesterday = try { LocalDate.parse(state.day).minusDays(1).toString() } catch (e: Exception) { return false }
        val y = state.history.firstOrNull { it.day == yesterday } ?: return false
        return y.usedSec <= budget
    }

    /** Adds the free spin's [prizeSec] to [pkg] and uses up today's spin. */
    fun claimFreeSpin(pkg: String, prizeSec: Int, nowMs: Long): Boolean {
        if (!freeSpinAvailable() || limitFor(pkg) == null || prizeSec !in 1..FREE_SPIN_MAX_SEC) return false
        adjustLeft(pkg, prizeSec)
        state = state.copy(
            freeSpinDay = state.day,
            ledger = (listOf(Bet(FREE_SPIN_GAME, pkg, prizeSec, nowMs)) + state.ledger).take(LEDGER_MAX),
            wonTodaySec = state.wonTodaySec + prizeSec,
        )
        return true
    }

    /** While Focus or Strict runs, a limit can't be removed: that would uncover the app and end the lock early. */
    fun canRemoveLimits(nowMs: Long): Boolean = !isFocus(nowMs) && !isStrict(nowMs)

    /** Clears modes whose time is up, so the stored state reads plainly. Returns true when something changed. */
    fun expireModes(nowMs: Long): Boolean {
        var s = state
        if (s.strict && s.strictUntilMs > 0 && nowMs >= s.strictUntilMs) s = s.copy(strict = false, strictUntilMs = 0, settingsPassUntilMs = 0)
        if (s.focusUntilMs > 0 && nowMs >= s.focusUntilMs) s = s.copy(focusUntilMs = 0)
        if (s.scheduleSkipUntilMs > 0 && nowMs >= s.scheduleSkipUntilMs) s = s.copy(scheduleSkipUntilMs = 0)
        if (s == state) return false
        state = s
        return true
    }

    /** Opens Settings for a short while in strict mode, after the user waited it out. */
    fun grantSettingsPass(nowMs: Long) {
        state = state.copy(settingsPassUntilMs = nowMs + SETTINGS_PASS_MS)
    }

    fun isGuardActive(nowMs: Long): Boolean = isStrict(nowMs) && nowMs >= state.settingsPassUntilMs

    fun setClock(anchor: ClockAnchor) {
        if (anchor != state.clock) state = state.copy(clock = anchor)
    }

    fun limitFor(pkg: String): Limit? = state.limits.firstOrNull { it.pkg == pkg }

    /**
     * Adds or changes a limit. Lowering a limit takes effect now; raising one only adds time from
     * tomorrow, so a limit can't be pushed up to get around today's block. A limit removed earlier
     * today comes back with the time it had left.
     */
    fun setLimit(pkg: String, label: String, limitSec: Int): Limit {
        val clamped = limitSec.coerceIn(MIN_LIMIT_SEC, MAX_LIMIT_SEC)
        val existing = limitFor(pkg)
        val updated = if (existing == null) {
            val left = state.parked[pkg]?.coerceAtMost(clamped) ?: clamped
            Limit(pkg, label, clamped, left)
        } else {
            val cut = (existing.limitSec - clamped).coerceAtLeast(0)
            val left = (existing.leftSec - cut).coerceAtLeast(0)
            existing.copy(label = label, limitSec = clamped, leftSec = left)
        }
        state = state.copy(
            limits = if (existing == null) state.limits + updated else state.limits.map { if (it.pkg == pkg) updated else it },
            parked = state.parked - pkg,
        )
        return updated
    }

    fun removeLimit(pkg: String, nowMs: Long? = null) {
        val existing = limitFor(pkg) ?: return
        val session = state.session
        if (session != null && session.pkg == pkg && nowMs != null) {
            val used = ((nowMs - session.startedAtMs).coerceAtLeast(0) / 1000L).toInt().coerceAtMost(session.grantedSec)
            addUsed(pkg, used)
        }
        // Unused session time counts as left when parking the limit.
        val reserved = if (session != null && session.pkg == pkg) session.grantedSec else 0
        state = state.copy(
            limits = state.limits.filterNot { it.pkg == pkg },
            session = session?.takeUnless { it.pkg == pkg },
            parked = state.parked + (pkg to (existing.leftSec + reserved).coerceAtMost(existing.limitSec)),
        )
        openStakes.remove(pkg)
    }

    fun isSessionActive(pkg: String, nowMs: Long): Boolean {
        val s = state.session ?: return false
        return s.pkg == pkg && nowMs < s.endsAtMs
    }

    /** Reserves [seconds] from the app's budget. Ends any other session first. */
    fun startSession(pkg: String, seconds: Int, nowMs: Long): Boolean {
        val limit = limitFor(pkg) ?: return false
        if (seconds <= 0 || seconds > limit.leftSec || isFocus(nowMs)) return false
        endSession(nowMs)
        adjustLeft(pkg, -seconds)
        state = state.copy(session = Session(pkg, nowMs, seconds))
        return true
    }

    /** Ends the current session and refunds the unused seconds. Returns the refund. */
    fun endSession(nowMs: Long): Int {
        val s = state.session ?: return 0
        val usedSec = ((nowMs - s.startedAtMs).coerceAtLeast(0) / 1000L).toInt()
        val refund = (s.grantedSec - usedSec).coerceIn(0, s.grantedSec)
        state = state.copy(session = null)
        addUsed(s.pkg, s.grantedSec - refund)
        if (refund > 0) adjustLeft(s.pkg, refund)
        return refund
    }

    /** Clears a session whose time has run out. Returns its package, or null when nothing expired. */
    fun expireSession(nowMs: Long): String? {
        val s = state.session ?: return null
        if (nowMs < s.endsAtMs) return null
        state = state.copy(session = null)
        addUsed(s.pkg, s.grantedSec)
        return s.pkg
    }

    /**
     * Called whenever a different app comes to the front. A session ends early (with a refund) only
     * when the user goes home or opens another limited app; pickers, permission dialogs and browser
     * tabs opened from inside the app leave it running.
     */
    fun onForeground(pkg: String, nowMs: Long, isHome: Boolean = false): Decision {
        val session = state.session
        val limited = limitFor(pkg) != null
        if (session != null) {
            if (session.pkg == pkg) {
                if (nowMs < session.endsAtMs) return Decision.ALLOW
                expireSession(nowMs)
            } else if (isHome || limited) {
                endSession(nowMs)
            }
        }
        return if (limited) Decision.BLOCK else Decision.ALLOW
    }

    /** Takes a stake from the app's budget. */
    fun placeBet(pkg: String, stakeSec: Int): Boolean {
        val limit = limitFor(pkg) ?: return false
        if (stakeSec <= 0 || stakeSec > limit.leftSec) return false
        adjustLeft(pkg, -stakeSec)
        openStakes[pkg] = (openStakes[pkg] ?: 0) + stakeSec
        return true
    }

    /**
     * Pays [returnSec] back for a stake placed earlier with [placeBet]. Returns the net change.
     * A settle without a matching open stake pays nothing and returns [INVALID_SETTLE]; the return is capped.
     */
    fun settleBet(pkg: String, game: String, stakeSec: Int, returnSec: Int, nowMs: Long): Int {
        val open = openStakes[pkg] ?: 0
        if (stakeSec <= 0 || stakeSec > open || limitFor(pkg) == null) return INVALID_SETTLE
        openStakes[pkg] = open - stakeSec
        val ret = returnSec.toLong().coerceIn(0, stakeSec.toLong() * MAX_RETURN_MULTIPLE).toInt()
        if (ret > 0) adjustLeft(pkg, ret)
        val net = ret - stakeSec
        val bet = Bet(game.take(32), pkg, net, nowMs)
        state = state.copy(
            ledger = (listOf(bet) + state.ledger).take(LEDGER_MAX),
            wonTodaySec = state.wonTodaySec + net.coerceAtLeast(0),
            lostTodaySec = state.lostTodaySec + (-net).coerceAtLeast(0),
        )
        return net
    }

    /** Adds screen time used in [pkg] today, to the total and to the per-app split. */
    private fun addUsed(pkg: String, sec: Int) {
        if (sec <= 0) return
        state = state.copy(
            usedTodaySec = state.usedTodaySec + sec,
            usedTodayByApp = state.usedTodayByApp + (pkg to ((state.usedTodayByApp[pkg] ?: 0) + sec)),
        )
    }

    private fun adjustLeft(pkg: String, delta: Int) {
        state = state.copy(limits = state.limits.map {
            if (it.pkg == pkg) it.copy(leftSec = (it.leftSec.toLong() + delta).coerceIn(0, Int.MAX_VALUE.toLong()).toInt()) else it
        })
    }

    companion object {
        const val MIN_LIMIT_SEC = 60
        const val MAX_LIMIT_SEC = 24 * 60 * 60
        const val MAX_RETURN_MULTIPLE = 250 // the best real payout: a royal flush in video poker
        const val LEDGER_MAX = 50
        const val HISTORY_MAX = 186
        const val MIN_DAY_MS = 23L * 60 * 60 * 1000
        const val SETTINGS_PASS_MS = 2L * 60 * 1000
        /** Longest Focus session: 12 hours. */
        const val FOCUS_MAX_MS = 12 * 60 * 60_000L
        /** Longest strict lock: 31 days. */
        const val STRICT_MAX_MS = 31 * 24 * 60 * 60_000L

        const val FREE_SPIN_GAME = "Daily spin"
        const val FREE_SPIN_MAX_SEC = 15 * 60

        /** Returned by [settleBet] when there is no matching open stake. */
        const val INVALID_SETTLE = Int.MIN_VALUE
    }
}
