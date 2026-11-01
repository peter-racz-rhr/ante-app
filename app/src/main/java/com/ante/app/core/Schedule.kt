package com.ante.app.core

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * A repeating Focus window, like "Work, weekdays 9:00–17:00" or "Sleep, every night 22:00–07:00".
 * [days] has one bit per weekday, bit 0 = Monday … bit 6 = Sunday, for the day the window starts.
 * Minutes count from local midnight; an [endMin] at or before [startMin] runs into the next day.
 */
data class Schedule(
    val id: Int,
    val label: String,
    val days: Int,
    val startMin: Int,
    val endMin: Int,
    val on: Boolean = true,
) {
    val valid: Boolean get() = id > 0 && days in 1..ALL_DAYS && startMin in 0 until DAY_MIN && endMin in 0 until DAY_MIN && startMin != endMin

    /** The end of the window covering [nowMs], or null when none does. */
    fun activeEnd(nowMs: Long, zone: ZoneId): Long? {
        if (!on || !valid) return null
        val today = Instant.ofEpochMilli(nowMs).atZone(zone).toLocalDate()
        // A window covering now started today, or yesterday if it runs past midnight.
        for (start in listOf(today, today.minusDays(1))) {
            if (!runsOn(start)) continue
            val from = at(start, startMin, zone)
            val to = at(if (endMin > startMin) start else start.plusDays(1), endMin, zone)
            if (nowMs in from until to) return to
        }
        return null
    }

    /** The next start or end of this schedule after [nowMs], for waking up on time. */
    fun nextChange(nowMs: Long, zone: ZoneId): Long? {
        if (!on || !valid) return null
        activeEnd(nowMs, zone)?.let { return it }
        val today = Instant.ofEpochMilli(nowMs).atZone(zone).toLocalDate()
        for (k in 0..7L) {
            val d = today.plusDays(k)
            if (!runsOn(d)) continue
            val from = at(d, startMin, zone)
            if (from > nowMs) return from
        }
        return null
    }

    private fun runsOn(d: LocalDate) = days and (1 shl (d.dayOfWeek.value - 1)) != 0

    private fun at(d: LocalDate, minute: Int, zone: ZoneId): Long =
        d.atStartOfDay(zone).plusMinutes(minute.toLong()).toInstant().toEpochMilli()

    companion object {
        const val ALL_DAYS = 0b1111111
        const val WEEKDAYS = 0b0011111
        const val DAY_MIN = 24 * 60
        const val MAX = 8
    }
}
