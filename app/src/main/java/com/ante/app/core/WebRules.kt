package com.ante.app.core

import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * The website filter's settings and its lock. A lock (a number of days, or No Nut November: until
 * 1 December) keeps the adult filter on; until it ends nothing can be loosened. Tightening (more
 * lists, more sites) always works. Strict mode freezes loosening too.
 */
data class WebRules(
    val on: Boolean = false,
    val adult: Boolean = true,
    val gambling: Boolean = false,
    val custom: List<String> = emptyList(),
    val lockUntilMs: Long = 0,
    /** End of a No Nut November lock (1 December), kept after it ends for the badge. */
    val nnnUntilMs: Long = 0,
) {
    fun isLocked(nowMs: Long) = nowMs < lockUntilMs

    /** True when [next] only adds blocking compared with this. */
    fun onlyTightens(next: WebRules): Boolean =
        (!on || next.on) && (!adult || next.adult) && (!gambling || next.gambling) && next.custom.containsAll(custom)

    /**
     * The change to [next], or null when it is refused: loosening while locked or in Strict mode.
     * The lock fields can't be changed this way (see [lock]).
     */
    fun change(next: WebRules, nowMs: Long, strict: Boolean): WebRules? {
        val clean = next.copy(custom = cleanList(next.custom), lockUntilMs = lockUntilMs, nnnUntilMs = nnnUntilMs)
        if ((isLocked(nowMs) || strict) && !onlyTightens(clean)) return null
        return clean
    }

    /** Locks the adult filter on until [untilMs] (a lock can only get longer). */
    fun lock(nowMs: Long, untilMs: Long, nnn: Boolean = false): WebRules? {
        if (untilMs <= nowMs || untilMs - nowMs > MAX_LOCK_MS) return null
        val end = maxOf(untilMs, lockUntilMs)
        return copy(on = true, adult = true, lockUntilMs = end, nnnUntilMs = if (nnn) maxOf(nnnUntilMs, untilMs) else nnnUntilMs)
    }

    /** No Nut November done: a November lock that ran to its end. */
    fun nnnDone(nowMs: Long) = nnnUntilMs in 1..nowMs

    companion object {
        const val MAX_LOCK_MS = 31L * 24 * 60 * 60 * 1000

        fun cleanList(list: List<String>): List<String> =
            list.mapNotNull { Domains.fromInput(it) }.distinct().take(Domains.MAX_CUSTOM)

        /** Midnight at the start of 1 December, when it is November in [zone]; else null. */
        fun novemberEnd(nowMs: Long, zone: ZoneId): Long? {
            val now = ZonedDateTime.ofInstant(Instant.ofEpochMilli(nowMs), zone)
            if (now.monthValue != 11) return null
            return now.withMonth(12).withDayOfMonth(1).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli()
        }
    }
}

/** Decides one DNS name against the rules and the lists. */
class WebFilterCore(private val adultList: DomainSet, private val gamblingList: DomainSet) {
    fun blocked(rawName: String, r: WebRules): Boolean {
        if (!r.on) return false
        val name = Domains.normalize(rawName) ?: return false
        if (r.adult && (Domains.adultWord(name) || adultList.matches(name))) return true
        if (r.gambling && gamblingList.matches(name)) return true
        if (r.custom.isNotEmpty() && Domains.parents(name).any { it in r.custom }) return true
        return false
    }
}
