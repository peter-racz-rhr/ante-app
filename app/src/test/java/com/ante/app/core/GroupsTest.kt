package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Categories with one shared budget: Instagram and TikTok spend from "Social media" together. */
class GroupsTest {
    private val ig = "com.instagram.android"
    private val tt = "com.zhiliaoapp.musically"
    private val yt = "com.google.android.youtube"
    private val own = "com.ante.app"
    private fun bank() = TimeBank().apply { rollover("2026-11-02") }

    @Test fun membersShareOneBudget() {
        val b = bank()
        assertTrue(b.setGroup("cat:social", "Social media", listOf(ig, tt), 1800, 0))
        assertEquals("cat:social", b.limitFor(ig)!!.pkg)
        assertEquals("cat:social", b.limitFor(tt)!!.pkg)
        assertTrue(b.startSession(ig, 600, 0))
        assertEquals(1200, b.limitFor(tt)!!.leftSec)
        // Switching between members keeps the same session running.
        assertEquals(Decision.ALLOW, b.onForeground(tt, 1000))
        assertTrue(b.isSessionActive(tt, 1000))
        b.expireSession(600_000)
        assertEquals(Decision.BLOCK, b.onForeground(ig, 600_001))
        assertEquals(600, b.state.usedTodayByApp["cat:social"])
    }

    @Test fun watcherCoversEveryMember() {
        val b = bank(); b.setGroup("cat:social", "Social media", listOf(ig, tt), 1800, 0)
        val w = Watcher(own)
        assertTrue(w.onWindow(b, tt, true, false, false, 0) is Watcher.Action.Block)
        assertEquals(Watcher.Action.None, w.onWindow(b, yt, true, false, false, 1))
    }

    @Test fun ownLimitsMoveIntoTheCategory() {
        val b = bank(); b.setLimit(ig, "Instagram", 600)
        assertTrue(b.setGroup("cat:social", "Social media", listOf(ig, tt), 1800, 0))
        assertEquals(1, b.state.limits.size)
        // Giving a member its own limit takes it out of the category.
        b.setLimit(tt, "TikTok", 300)
        assertEquals(tt, b.limitFor(tt)!!.pkg)
        assertEquals(listOf(ig), b.state.groups["cat:social"])
    }

    @Test fun cantDropAppsWhileLocked() {
        val b = bank(); b.setGroup("cat:social", "Social media", listOf(ig, tt), 1800, 0)
        b.startStrict(0, 86_400_000)
        assertFalse("dropping TikTok would uncover it", b.setGroup("cat:social", "Social media", listOf(ig), 1800, 1))
        assertTrue("adding an app is fine", b.setGroup("cat:social", "Social media", listOf(ig, tt, yt), 1800, 1))
        assertFalse(b.canRemoveLimits(1))
    }

    @Test fun betsAndRemovalUseTheCategory() {
        val b = bank(); b.setGroup("cat:social", "Social media", listOf(ig, tt), 1800, 0)
        assertTrue(b.placeBet("cat:social", 300))
        assertEquals(300 + 0, b.settleBet("cat:social", "Coin flip", 300, 600, 0))
        assertEquals(2100, b.limitFor(ig)!!.leftSec)
        b.removeLimit("cat:social", 0)
        assertNull(b.limitFor(ig)); assertTrue(b.state.groups.isEmpty())
    }

    @Test fun groupsSurviveSaving() {
        val b = bank(); b.setGroup("cat:games", "Games", listOf("com.supercell.clashroyale"), 3600, 0)
        assertEquals(b.state.groups, Codec.decode(Codec.encode(b.state)).groups)
        assertFalse(TimeBank.isGroupKey("cat:Bad!")); assertFalse(TimeBank.isGroupKey(ig))
    }
}
