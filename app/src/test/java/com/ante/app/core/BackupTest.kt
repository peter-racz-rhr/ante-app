package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Restoring a backup moves everything to a new phone, and can never be used to cheat. */
class BackupTest {
    private val ig = "com.instagram.android"
    private val yt = "com.google.android.youtube"
    private val day = 86_400_000L

    private fun phone(today: String = "2026-11-01") = TimeBank().apply { rollover(today) }

    @Test fun roundTripsLimitsSchedulesHistoryAndPrefs() {
        val old = phone("2026-10-31").apply {
            setLimit(ig, "Instagram", 1200); setSchedule(Schedule(1, "Work", Schedule.WEEKDAYS, 540, 1020), 0)
            rollover("2026-11-01")
        }
        val file = Backup.export(old.state, """{"theme":"mocha","name":"Peti"}""", 5)
        val parsed = Backup.parse(file)
        assertNotNull(parsed)
        assertEquals("mocha", parsed!!.prefs.getString("theme"))
        val fresh = phone()
        val merged = Backup.merge(fresh.state, parsed.bank, 10)
        assertEquals(1200, merged.limits.single().limitSec)
        assertEquals(1200, merged.limits.single().leftSec)
        assertEquals(listOf("Work"), merged.schedules.map { it.label })
        assertEquals(listOf("2026-10-31"), merged.history.map { it.day })
    }

    @Test fun restoringAnOlderBackupNeverGivesTimeBack() {
        val p = phone().apply { setLimit(ig, "Instagram", 1200) }
        val morning = Backup.parse(Backup.export(p.state, "{}", 0))!!.bank
        p.startSession(ig, 900, 0); p.expireSession(900_000)
        val merged = Backup.merge(p.state, morning, 1_000_000)
        assertEquals(300, merged.limits.single().leftSec)
    }

    @Test fun restoringNeverEndsOrShortensALock() {
        val p = phone().apply { setLimit(ig, "Instagram", 1200); startStrict(0, 7 * day); setSchedule(Schedule(1, "Sleep", Schedule.ALL_DAYS, 1320, 420), 0) }
        val empty = Backup.parse(Backup.export(phone().state, "{}", 0))!!.bank
        val merged = Backup.merge(p.state, empty, 1)
        assertTrue(merged.strict)
        assertEquals(7 * day, merged.strictUntilMs)
        assertEquals(1, merged.schedules.size)
        assertEquals(1, merged.limits.size)
        // A backup with a longer lock extends it.
        val longer = phone().apply { startStrict(0, 30 * day) }
        assertEquals(30 * day, Backup.merge(p.state, longer.state, 1).strictUntilMs)
    }

    @Test fun anExpiredLockInTheBackupDoesNothing() {
        val b = phone().apply { startStrict(0, day) }.state
        val merged = Backup.merge(phone().state, b, 2 * day)
        assertFalse(merged.strict)
    }

    @Test fun addsAppsOnlyTheBackupHas() {
        val p = phone().apply { setLimit(ig, "Instagram", 1200) }
        val b = phone().apply { setLimit(ig, "Instagram", 9000); setLimit(yt, "YouTube", 600) }.state
        val merged = Backup.merge(p.state, b, 0)
        assertEquals(1200, merged.limits.first { it.pkg == ig }.limitSec)
        assertEquals(600, merged.limits.first { it.pkg == yt }.leftSec)
    }

    @Test fun rejectsFilesThatArentAnteBackups() {
        assertNull(Backup.parse("{}"))
        assertNull(Backup.parse("not json"))
        assertNull(Backup.parse("""{"app":"ante","version":99}"""))
    }
}
