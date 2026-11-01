package com.ante.app.core

import com.ante.app.core.Games.Card
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Random

/** The native rules match the page's (games.js) and keep the house edge Ante promises. */
class GamesTest {
    @Test fun rouletteReturnsThirtySixOverThirtySevenForEveryBet() {
        val bets = listOf("red", "black", "even", "odd", "low", "high", "d1", "d2", "d3", "n:0", "n:17", "n:36")
        for (b in bets) {
            val sum = (0..36).sumOf { Games.rouletteReturn(listOf(b), it) }
            assertEquals(b, 36.0 / 37, sum / 37.0, 1e-9)
        }
    }

    @Test fun rouletteSumsSeveralBetsAndIgnoresBadOnes() {
        assertEquals(2 + 2 + 36, Games.rouletteReturn(listOf("black", "odd", "n:17"), 17))
        assertEquals(2, Games.rouletteReturn(listOf("black", "black", "bogus", "n:99"), 17))
        assertEquals(0, Games.rouletteReturn(listOf("red", "black"), 0))
        for (bad in listOf("n:37", "n:-1", "n:1.5", "n:", "num", "toString", "")) assertFalse(bad, Games.isRouletteBet(bad))
    }

    @Test fun slotsPayLikeThePage() {
        assertEquals(100.0 to "three-seven", Games.slotPay(listOf("seven", "seven", "seven")))
        assertEquals(5.0 to "two-sevens", Games.slotPay(listOf("seven", "bar", "seven")))
        assertEquals(0.4 to "pair", Games.slotPay(listOf("bell", "bell", "cherry")))
        assertEquals(0.0 to "", Games.slotPay(listOf("bell", "bar", "cherry")))
        val rtp = Games.slotReturn()
        assertTrue("slots return $rtp", rtp in 0.90..0.96)
    }

    @Test fun slotSymbolsFollowTheirWeights() {
        val rng = Random(1)
        val n = 150_000
        val counts = List(n) { Games.slotSymbol(rng) }.groupingBy { it }.eachCount()
        assertEquals(1.0 / 15, counts.getValue("seven").toDouble() / n, 0.004)
        assertEquals(5.0 / 15, counts.getValue("cherry").toDouble() / n, 0.006)
    }

    @Test fun blackjackHandsAndPayouts() {
        assertEquals(21, Games.handValue(listOf(Card(1, 0), Card(13, 1))))
        assertEquals(12, Games.handValue(listOf(Card(1, 0), Card(1, 1))))
        assertEquals(2.5 to "blackjack", Games.blackjack(listOf(Card(1, 0), Card(12, 0)), listOf(Card(10, 1), Card(9, 1))))
        assertEquals(1.0 to "push", Games.blackjack(listOf(Card(1, 0), Card(12, 0)), listOf(Card(1, 1), Card(10, 1))))
        assertEquals(0.0 to "bust", Games.blackjack(listOf(Card(10, 0), Card(9, 0), Card(5, 0)), listOf(Card(10, 1), Card(13, 1), Card(5, 2))))
        assertEquals(2.0 to "dealer-bust", Games.blackjack(listOf(Card(10, 0), Card(8, 0)), listOf(Card(10, 1), Card(6, 1), Card(9, 2))))
        assertEquals(0.0 to "lose", Games.blackjack(listOf(Card(10, 0), Card(7, 0)), listOf(Card(10, 1), Card(8, 1))))
    }

    @Test fun pokerRanks() {
        fun h(vararg c: Pair<Int, Int>) = c.map { Card(it.first, it.second) }
        assertEquals("Royal flush", Games.pokerRank(h(10 to 0, 11 to 0, 12 to 0, 13 to 0, 1 to 0)))
        assertEquals("Straight flush", Games.pokerRank(h(5 to 2, 6 to 2, 7 to 2, 8 to 2, 9 to 2)))
        assertEquals("Straight", Games.pokerRank(h(1 to 0, 2 to 1, 3 to 2, 4 to 3, 5 to 0)))
        assertEquals("Full house", Games.pokerRank(h(3 to 0, 3 to 1, 3 to 2, 9 to 0, 9 to 1)))
        assertEquals("Jacks or better", Games.pokerRank(h(11 to 0, 11 to 1, 2 to 2, 5 to 0, 9 to 1)))
        assertNull(Games.pokerRank(h(10 to 0, 10 to 1, 2 to 2, 5 to 0, 9 to 1)))
        assertEquals(250, Games.pokerMultiple(h(10 to 3, 11 to 3, 12 to 3, 13 to 3, 1 to 3)))
    }

    @Test fun decksAreFullAndShuffled() {
        val d = Games.deck(Random(3), 6)
        assertEquals(312, d.size)
        assertEquals(6, d.count { it == Card(1, 0) })
        assertTrue(d.take(13) != (1..13).map { Card(it, 0) })
    }
}
