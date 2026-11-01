package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime
import java.time.ZoneId

/** Repeating Focus windows: work hours, sleep mode, and no way out while they run. */
class ScheduleTest {
    private val zone = ZoneId.of("Europe/Budapest")
    private val ig = "com.instagram.android"
    private val own = "com.ante.app"
    private fun at(y: Int, mo: Int, d: Int, h: Int, mi: Int = 0) = LocalDateTime.of(y, mo, d, h, mi).atZone(zone).toInstant().toEpochMilli()

    private val work = Schedule(1, "Work", Schedule.WEEKDAYS, 9 * 60, 17 * 60)
    private val sleep = Schedule(2, "Sleep", Schedule.ALL_DAYS, 22 * 60, 7 * 60)

    private fun bank() = TimeBank().apply { zone = this@ScheduleTest.zone; rollover("2026-11-02"); setLimit(ig, "Instagram", 1200) }

    @Test fun workHoursCoverWeekdaysOnly() {
        // 2 November 2026 is a Monday; 7 November a Saturday.
        assertEquals(at(2026, 11, 2, 17), work.activeEnd(at(2026, 11, 2, 9), zone))
        assertEquals(at(2026, 11, 2, 17), work.activeEnd(at(2026, 11, 2, 16, 59), zone))
        assertNull(work.activeEnd(at(2026, 11, 2, 17), zone))
        assertNull(work.activeEnd(at(2026, 11, 2, 8, 59), zone))
        assertNull(work.activeEnd(at(2026, 11, 7, 10), zone))
    }

    @Test fun sleepRunsPastMidnight() {
        assertEquals(at(2026, 11, 3, 7), sleep.activeEnd(at(2026, 11, 2, 23), zone))
        assertEquals(at(2026, 11, 3, 7), sleep.activeEnd(at(2026, 11, 3, 6, 30), zone))
        assertNull(sleep.activeEnd(at(2026, 11, 3, 7), zone))
        // A weekday-only night that starts Friday still covers early Saturday, but not Saturday night.
        val weeknights = sleep.copy(days = Schedule.WEEKDAYS)
        assertEquals(at(2026, 11, 7, 7), weeknights.activeEnd(at(2026, 11, 7, 3), zone))
        assertNull(weeknights.activeEnd(at(2026, 11, 7, 23), zone))
    }

    @Test fun invalidSchedulesAreRefused() {
        val b = bank()
        assertFalse(b.setSchedule(Schedule(1, "x", 0, 60, 120), 0))
        assertFalse(b.setSchedule(Schedule(1, "x", 1, 60, 60), 0))
        assertFalse(b.setSchedule(Schedule(1, "x", 1, -1, 60), 0))
        assertFalse(b.setSchedule(Schedule(1, "x", 200, 60, 120), 0))
        repeat(Schedule.MAX) { assertTrue(b.setSchedule(Schedule(it + 1, "s$it", 1, 60, 120), 0)) }
        assertFalse("at most ${Schedule.MAX}", b.setSchedule(Schedule(99, "one more", 1, 60, 120), 0))
    }

    @Test fun aRunningWindowIsFocusAndCantBeEditedAway() {
        val b = bank()
        assertTrue(b.setSchedule(work, at(2026, 11, 2, 8)))
        val now = at(2026, 11, 2, 10)
        assertTrue(b.isFocus(now))
        assertEquals(at(2026, 11, 2, 17), b.focusEndsAt(now))
        assertFalse(b.startSession(ig, 300, now))
        assertFalse("can't switch it off while it runs", b.setSchedule(work.copy(on = false), now))
        assertFalse(b.removeSchedule(1, now))
        assertFalse(b.canRemoveLimits(now))
        assertTrue("adding another still works", b.setSchedule(sleep, now))
        // After work, it can be changed again.
        assertTrue(b.setSchedule(work.copy(startMin = 10 * 60), at(2026, 11, 2, 18)))
    }

    @Test fun strictModeFreezesSchedules() {
        val b = bank()
        b.setSchedule(work, 0)
        val evening = at(2026, 11, 2, 20)
        b.startStrict(evening, 24 * 3_600_000L)
        assertFalse(b.removeSchedule(1, evening + 1))
        assertTrue(b.removeSchedule(1, evening + 25 * 3_600_000L))
    }

    @Test fun endingAWindowEarlySkipsItUntilItsEnd() {
        val b = bank()
        b.setSchedule(work, 0)
        val now = at(2026, 11, 2, 10)
        b.endFocus(now)
        assertFalse(b.isFocus(now + 1))
        assertFalse(b.isFocus(at(2026, 11, 2, 16)))
        assertTrue("back the next workday", b.isFocus(at(2026, 11, 3, 9, 30)))
    }

    @Test fun aWindowStartingMidSessionCoversTheApp() {
        val b = bank()
        b.setSchedule(work, 0)
        val w = Watcher(own)
        val before = at(2026, 11, 2, 8, 55)
        assertTrue(b.startSession(ig, 900, before))
        assertEquals(Watcher.Action.None, w.onWindow(b, ig, true, false, false, before))
        val a = w.onTimer(b, at(2026, 11, 2, 9, 0))
        assertTrue(a is Watcher.Action.Block && a.note == Watcher.FOCUS_NOTE)
        assertNull(b.state.session)
        assertEquals("unused time comes back", 1200 - 300, b.limitFor(ig)!!.leftSec)
    }

    @Test fun nextChangeWakesForStartsAndEnds() {
        val b = bank()
        b.setSchedule(work, 0)
        assertEquals(at(2026, 11, 2, 9), b.nextScheduleChange(at(2026, 11, 2, 7)))
        assertEquals(at(2026, 11, 2, 17), b.nextScheduleChange(at(2026, 11, 2, 12)))
        assertEquals(at(2026, 11, 9, 9), b.nextScheduleChange(at(2026, 11, 6, 18)))
    }

    @Test fun schedulesSurviveSaving() {
        val b = bank()
        b.setSchedule(work, 0); b.setSchedule(sleep, 0)
        val back = Codec.decode(Codec.encode(b.state))
        assertEquals(listOf(work, sleep), back.schedules)
    }
}
