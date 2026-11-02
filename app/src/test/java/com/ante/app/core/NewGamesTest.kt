package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random

/** Plinko, Crash, Dice, Baccarat and Keno: fair rules, the promised edge, and payouts that match the budget. */
class NewGamesTest {
    private val ig = "com.instagram.android"
    private fun bank() = TimeBank().apply { rollover("2026-11-02"); setLimit(ig, "Instagram", 86_400) }
    private fun left(b: TimeBank) = b.limitFor(ig)!!.leftSec

    @Test fun plinkoReturnIsExactAndPathsAddUp() {
        assertEquals(0.967, Games.plinkoReturn(), 0.001)
        val b = bank(); val d = Dealer(Random(1))
        repeat(300) {
            val before = left(b)
            val r = d.plinko(b, ig, 100, 0)
            val path = r.getJSONArray("path")
            assertEquals(Games.PLINKO_ROWS, path.length())
            val slot = (0 until path.length()).sumOf { path.getInt(it) }
            assertEquals(slot, r.getInt("slot"))
            assertEquals(kotlin.math.round(100 * Games.PLINKO_PAYS[slot]).toInt(), r.getInt("ret"))
            assertEquals(before + r.getInt("net"), left(b))
        }
    }

    @Test fun crashPaysTheTargetWhenTheRocketGetsThere() {
        val rng = Random(7)
        val n = 200_000
        val reached = (1..n).count { Games.crashPoint(rng) >= 2.0 }
        assertEquals(0.97 / 2, reached.toDouble() / n, 0.005)
        val b = bank(); val d = Dealer(Random(3))
        repeat(300) {
            val r = d.crash(b, ig, 100, 3.0, 0)
            assertEquals(if (r.getDouble("point") >= 3.0) 300 else 0, r.getInt("ret"))
        }
        assertEquals("bet", d.crash(b, ig, 100, 2.5, 0).getString("error"))
    }

    @Test fun diceWinsUnderTheNumberAndKeepsThreePercent() {
        assertEquals(1.94, Games.diceMultiple(50), 1e-9)
        for (u in Games.DICE_RANGE) assertTrue("under $u", u / 100.0 * Games.diceMultiple(u) <= 0.97 + 1e-9)
        val b = bank(); val d = Dealer(Random(5))
        repeat(300) {
            val r = d.dice(b, ig, 100, 30, 0)
            assertEquals(r.getDouble("roll") < 30, r.getInt("ret") > 0)
        }
        assertEquals("bet", d.dice(b, ig, 100, 99, 0).getString("error"))
    }

    @Test fun baccaratFollowsTheThirdCardRulesAndTheEdge() {
        val rng = Random(11)
        var shoe = Games.deck(rng, 8)
        val draw = { if (shoe.size < 10) shoe = Games.deck(rng, 8); shoe.removeAt(shoe.size - 1) }
        var banker = 0.0; var player = 0.0; val n = 200_000
        repeat(n) {
            val c = Games.baccaratCoup(draw)
            assertTrue(c.player.size in 2..3 && c.banker.size in 2..3)
            banker += Games.baccaratMultiple("banker", c.winner); player += Games.baccaratMultiple("player", c.winner)
        }
        assertEquals(0.9894, banker / n, 0.006)
        assertEquals(0.9876, player / n, 0.006)
        // A natural stands: player 9 against banker 0 draws nothing.
        val fixed = ArrayDeque(listOf(Games.Card(9, 0), Games.Card(10, 0), Games.Card(13, 1), Games.Card(12, 2)))
        val coup = Games.baccaratCoup { fixed.removeFirst() }
        assertEquals("player", coup.winner); assertEquals(2, coup.player.size); assertEquals(2, coup.banker.size)
    }

    @Test fun kenoPaysByHits() {
        assertEquals(0.948, Games.kenoReturn(), 0.002)
        val b = bank(); val d = Dealer(Random(9))
        val picks = listOf(1, 7, 13, 22, 40)
        repeat(300) {
            val before = left(b)
            val r = d.keno(b, ig, 100, picks, 0)
            val drawn = r.getJSONArray("drawn").let { a -> (0 until a.length()).map { a.getInt(it) } }
            assertEquals(Games.KENO_DRAW, drawn.toSet().size)
            assertEquals(picks.count { it in drawn }, r.getInt("hits"))
            assertEquals(before + r.getInt("net"), left(b))
        }
        assertEquals("bet", d.keno(b, ig, 100, listOf(1, 1, 2, 3, 4), 0).getString("error"))
        assertEquals("bet", d.keno(b, ig, 100, listOf(1, 2, 3, 4, 41), 0).getString("error"))
    }
}
