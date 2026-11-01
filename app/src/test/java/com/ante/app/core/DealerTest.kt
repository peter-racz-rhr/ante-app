package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random

/** Rounds run natively: stakes come out of the budget, payouts follow the rules, nothing is free. */
class DealerTest {
    private val ig = "com.instagram.android"
    private fun bank(limit: Int = 86_400) = TimeBank().apply { rollover("2026-11-01"); setLimit(ig, "Instagram", limit) }
    private fun left(b: TimeBank) = b.limitFor(ig)!!.leftSec

    @Test fun coinPaysOneNinetyOrNothingAndMatchesTheBudget() {
        val b = bank(); val d = Dealer(Random(5))
        repeat(200) {
            val before = left(b)
            val r = d.coin(b, ig, 100, "H", 0)
            assertTrue(r.getBoolean("ok"))
            val won = r.getString("result") == "H"
            assertEquals(if (won) 90 else -100, r.getInt("net"))
            assertEquals(before + r.getInt("net"), left(b))
        }
    }

    @Test fun stakesMustBeAffordableAndBetsValid() {
        val b = bank(limit = 60); val d = Dealer(Random(1))
        assertEquals("stake", d.coin(b, ig, 61, "H", 0).getString("error"))
        assertEquals("bet", d.coin(b, ig, 10, "X", 0).getString("error"))
        assertEquals("bet", d.roulette(b, ig, 10, listOf("bogus", "n:40"), 0).getString("error"))
        assertEquals("stake", d.coin(b, "com.other", 10, "H", 0).getString("error"))
        assertEquals(60, left(b))
    }

    @Test fun rouletteStakesPerBetAndPaysTheSum() {
        val b = bank(); val d = Dealer(Random(9))
        repeat(300) {
            val before = left(b)
            val r = d.roulette(b, ig, 10, listOf("red", "n:7", "red"), 0)
            val n = r.getInt("n")
            assertEquals(20, r.getInt("stake"))
            assertEquals(Games.rouletteReturn(listOf("red", "n:7"), n) * 10, r.getInt("ret"))
            assertEquals(before - 20 + r.getInt("ret"), left(b))
        }
    }

    @Test fun houseEdgeHoldsOverManyRounds() {
        val b = bank(); val d = Dealer(Random(42))
        var staked = 0L; var back = 0L
        repeat(60_000) { val r = d.slots(b, ig, 10, 0); staked += 10; back += r.getInt("ret") }
        val rtp = back.toDouble() / staked
        assertTrue("slots returned $rtp", rtp in 0.88..0.98)
    }

    @Test fun blackjackRoundPaysOnceAndTheDealerDrawsToSeventeen() {
        val b = bank(); val d = Dealer(Random(7))
        repeat(400) {
            val before = left(b)
            var r = d.bjDeal(b, ig, 100, 0)
            assertTrue(r.getBoolean("ok"))
            while (!r.getBoolean("done")) r = d.bjStand(b, 0)
            val dealer = r.getJSONArray("d").let { a -> (0 until a.length()).map { Games.Card(a.getJSONObject(it).getInt("r"), a.getJSONObject(it).getInt("s")) } }
            val player = r.getJSONArray("p").let { a -> (0 until a.length()).map { Games.Card(a.getJSONObject(it).getInt("r"), a.getJSONObject(it).getInt("s")) } }
            if (!Games.isBlackjack(player) && !Games.isBlackjack(dealer)) assertTrue(Games.handValue(dealer) >= 17)
            assertEquals(Games.blackjack(player, dealer).second, r.getString("outcome"))
            assertEquals(before + r.getInt("net"), left(b))
            assertEquals("round", d.bjStand(b, 0).getString("error"))
        }
    }

    @Test fun doubleTakesASecondStakeOnlyOnTheFirstTwoCards() {
        val b = bank(); val d = Dealer(Random(11))
        var r = d.bjDeal(b, ig, 100, 0)
        while (r.getBoolean("done")) r = d.bjDeal(b, ig, 100, 0)
        val before = left(b)
        r = d.bjDouble(b, 0)
        assertTrue(r.getBoolean("done"))
        assertEquals(200, r.getInt("stake"))
        assertEquals(3, r.getJSONArray("p").length())
        assertEquals(before - 100 + r.getInt("ret"), left(b))
    }

    @Test fun anAbandonedHandKeepsItsStake() {
        val b = bank(); val d = Dealer(Random(2))
        var r = d.bjDeal(b, ig, 100, 0)
        while (r.getBoolean("done")) r = d.bjDeal(b, ig, 100, 0)
        val before = left(b)
        d.bjDeal(b, ig, 100, 0) // deal again instead of finishing
        assertTrue(left(b) <= before)
    }

    @Test fun pokerKeepsHeldCardsAndPaysTheRank() {
        val b = bank(); val d = Dealer(Random(4))
        repeat(300) {
            val before = left(b)
            val deal = d.pkDeal(b, ig, 100)
            val first = deal.getJSONArray("hand")
            val r = d.pkDraw(b, 0b10101, 0)
            val hand = r.getJSONArray("hand")
            for (i in listOf(0, 2, 4)) assertEquals(first.getJSONObject(i).toString(), hand.getJSONObject(i).toString())
            val cards = (0 until 5).map { Games.Card(hand.getJSONObject(it).getInt("r"), hand.getJSONObject(it).getInt("s")) }
            assertEquals(Games.pokerMultiple(cards) * 100, r.getInt("ret"))
            assertEquals(before + r.getInt("net"), left(b))
        }
        assertEquals("round", d.pkDraw(b, 0, 0).getString("error"))
        assertFalse(d.pkDraw(b, 99, 0).getBoolean("ok"))
    }

    @Test fun freeSpinNeedsAGoodYesterdayAndWorksOncePerDay() {
        val b = TimeBank().apply { rollover("2026-10-31"); setLimit(ig, "Instagram", 1200) }
        val d = Dealer(Random(3))
        b.rollover("2026-11-01") // yesterday: nothing used, within the limit
        assertTrue(b.freeSpinAvailable())
        val before = left(b)
        val r = d.freeSpin(b, ig, 0)
        assertTrue(r.getBoolean("ok"))
        assertTrue(r.getInt("prizeSec") in Dealer.FREE_SPIN_PRIZES)
        assertEquals(before + r.getInt("prizeSec"), left(b))
        assertEquals("used", d.freeSpin(b, ig, 0).getString("error"))

        // A day over the limit earns no spin.
        b.startSession(ig, 1200, 0); b.expireSession(1_300_000)
        b.setLimit(ig, "Instagram", 600)
        b.rollover("2026-11-02")
        assertFalse(b.freeSpinAvailable())
    }
}
