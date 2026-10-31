package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Focus (cover every limited app for a while) and timed Strict mode (can't be undone early). */
class ModesTest {
    private val own = "com.ante.app"
    private val ig = "com.instagram.android"
    private val maps = "com.google.android.apps.maps"
    private val settings = "com.android.settings"
    private val installer = "com.google.android.packageinstaller"
    private val home = "com.google.android.apps.nexuslauncher"
    private val hour = 3_600_000L
    private val day = 24 * hour

    private fun bank() = TimeBank().apply { rollover("2026-10-31"); setLimit(ig, "Instagram", 1200) }
    private fun watcher() = Watcher(own, passable = setOf(settings), locked = setOf(installer))

    @Test fun focusBlocksAnAppThatStillHasTime() {
        val b = bank()
        b.startFocus(0, hour)
        assertTrue(b.isFocus(1))
        assertFalse("no session can start during focus", b.startSession(ig, 300, 1))
        assertEquals(1200, b.limitFor(ig)!!.leftSec)
        val a = watcher().onWindow(b, ig, true, false, false, 2)
        assertTrue(a is Watcher.Action.Block && a.note == Watcher.FOCUS_NOTE)
    }

    @Test fun focusEndsARunningSessionAndRefundsIt() {
        val b = bank()
        assertTrue(b.startSession(ig, 600, 0))
        b.startFocus(60_000, hour)
        assertEquals(null, b.state.session)
        assertEquals(1200 - 60, b.limitFor(ig)!!.leftSec)
    }

    @Test fun focusLeavesOtherAppsAlone() {
        val b = bank(); b.startFocus(0, hour)
        assertEquals(Watcher.Action.None, watcher().onWindow(b, maps, true, false, false, 5))
    }

    @Test fun focusEndsByItself() {
        val b = bank(); b.startFocus(0, hour)
        assertFalse(b.isFocus(hour))
        assertTrue(b.startSession(ig, 300, hour + 1))
    }

    @Test fun focusDurationIsBounded() {
        val b = bank()
        assertFalse(b.startFocus(0, 0))
        assertFalse(b.startFocus(0, TimeBank.FOCUS_MAX_MS + 1))
        assertTrue(b.startFocus(0, TimeBank.FOCUS_MAX_MS))
    }

    @Test fun timedStrictCoversSettingsAndCannotBeTurnedOffEarly() {
        val b = bank(); val w = watcher()
        assertTrue(b.startStrict(0, day))
        assertTrue(b.isStrict(1))
        assertFalse(b.canLeaveStrict(day - 1))
        assertTrue(w.onWindow(b, settings, true, false, false, 10) is Watcher.Action.Block)
        assertTrue(w.onWindow(b, installer, true, false, false, 20) is Watcher.Action.Block)
    }

    @Test fun timedStrictEndsByItself() {
        val b = bank(); val w = watcher()
        b.startStrict(0, day)
        assertFalse(b.isStrict(day))
        w.onWindow(b, home, true, false, true, day + 1)
        assertEquals(Watcher.Action.None, w.onWindow(b, installer, true, false, false, day + 2))
    }

    @Test fun strictCanOnlyBeExtendedNotShortened() {
        val b = bank()
        b.startStrict(0, 7 * day)
        b.startStrict(day, day) // a shorter lock never cuts the running one
        assertEquals(7 * day, b.state.strictUntilMs)
        b.startStrict(day, 30 * day)
        assertEquals(31 * day, b.state.strictUntilMs)
    }

    @Test fun strictDurationIsBounded() {
        val b = bank()
        assertFalse(b.startStrict(0, 0))
        assertFalse(b.startStrict(0, TimeBank.STRICT_MAX_MS + 1))
    }

    @Test fun legacyStrictWithoutEndStillWorks() {
        val b = bank()
        b.setStrict(true)
        assertTrue(b.isStrict(123))
        assertTrue("untimed strict leaves after the wait as before", b.canLeaveStrict(123))
    }

    @Test fun modesSurviveSaveAndLoad() {
        val b = bank(); b.startFocus(0, hour); b.startStrict(0, day)
        val back = Codec.decode(Codec.encode(b.state))
        assertEquals(hour, back.focusUntilMs)
        assertEquals(day, back.strictUntilMs)
    }
}
