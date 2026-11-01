package com.ante.app.core

import org.json.JSONObject

/**
 * Backups to the user's own Google Drive (a private app folder only Ante can see), so limits,
 * schedules, history and settings move to a new phone with the Google account.
 *
 * Restoring is a merge with rules that make it useless for cheating: it never gives back time
 * already used today, never ends or shortens a Strict lock or Focus, and never removes a schedule.
 */
object Backup {
    const val VERSION = 1
    const val FILE_NAME = "ante-backup.json"

    /** The backup file: the time bank, plus the page's settings (theme, name, language…) as given. */
    fun export(state: BankState, prefs: String, nowMs: Long): String = JSONObject()
        .put("app", "ante").put("version", VERSION).put("savedAtMs", nowMs)
        .put("bank", Codec.toJson(state.copy(session = null, clock = ClockAnchor())))
        .put("prefs", try { JSONObject(prefs) } catch (e: Exception) { JSONObject() })
        .toString()

    data class Parsed(val bank: BankState, val prefs: JSONObject, val savedAtMs: Long)

    /** Reads a backup file; null when it isn't one of Ante's. */
    fun parse(raw: String?): Parsed? = try {
        val o = JSONObject(raw ?: "")
        if (o.optString("app") != "ante" || o.optInt("version", 0) !in 1..VERSION) null
        else Parsed(Codec.decode(o.optJSONObject("bank")?.toString()), o.optJSONObject("prefs") ?: JSONObject(), o.optLong("savedAtMs", 0))
    } catch (e: Exception) {
        null
    }

    /** Merges backup [b] into this phone's state [local], following the rules above. */
    fun merge(local: BankState, b: BankState, nowMs: Long): BankState {
        val today = local.day
        val sameDay = b.day == today && today.isNotEmpty()
        // Limits: keep this phone's; add apps only the backup has. Today's time left can only go down.
        val limits = local.limits.map { l ->
            val bl = b.limits.firstOrNull { it.pkg == l.pkg }
            if (bl != null && sameDay) l.copy(leftSec = minOf(l.leftSec, bl.leftSec)) else l
        } + b.limits.filter { bl -> local.limits.none { it.pkg == bl.pkg } && bl.pkg !in local.parked }.map { bl ->
            bl.copy(leftSec = if (sameDay) minOf(bl.leftSec, bl.limitSec) else bl.limitSec)
        }
        // History: every day either side knows; when both know a day, the busier record wins.
        val days = (local.history + b.history).groupBy { it.day }.map { (_, v) -> v.maxBy { it.usedSec } }
            .sortedByDescending { it.day }.take(TimeBank.HISTORY_MAX)
        // Locks only ever extend.
        val strictUntil = maxOf(local.strictUntilMs, b.strictUntilMs.takeIf { it > nowMs } ?: 0L)
        val untimedStrict = (local.strict && local.strictUntilMs == 0L) || (b.strict && b.strictUntilMs == 0L)
        val schedules = (local.schedules + b.schedules.filter { s -> local.schedules.none { it.id == s.id } }).take(Schedule.MAX)
        return local.copy(
            limits = limits,
            history = days.filter { it.day != today },
            strict = local.strict || untimedStrict || strictUntil > nowMs,
            // A timed lock (no early exit) beats an untimed one (which ends after the wait).
            strictUntilMs = if (strictUntil > nowMs) strictUntil else 0L,
            focusUntilMs = maxOf(local.focusUntilMs, b.focusUntilMs.takeIf { it > nowMs } ?: 0L),
            schedules = schedules,
            freeSpinDay = maxOf(local.freeSpinDay, b.freeSpinDay),
            usedTodaySec = if (sameDay) maxOf(local.usedTodaySec, b.usedTodaySec) else local.usedTodaySec,
            usedTodayByApp = if (sameDay) (local.usedTodayByApp.keys + b.usedTodayByApp.keys).associateWith { maxOf(local.usedTodayByApp[it] ?: 0, b.usedTodayByApp[it] ?: 0) } else local.usedTodayByApp,
        )
    }
}
