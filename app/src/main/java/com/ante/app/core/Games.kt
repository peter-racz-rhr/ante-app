package com.ante.app.core

import java.util.Random

/**
 * Ante's table rules, decided natively so the page can't choose its own luck. A straight port of
 * `assets/web/js/games.js` (the page keeps its copy for animation and for older app versions);
 * [GamesTest] checks both agree on every payout and on the house edge.
 */
object Games {
    data class Card(val r: Int, val s: Int) // rank 1..13 (1 = ace), suit 0..3

    /* ---------- coin ---------- */
    const val COIN_RETURN = 1.9

    /* ---------- roulette (single zero) ---------- */
    val REDS = setOf(1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36)
    private const val STRAIGHT = 36
    private val OUTSIDE: Map<String, Pair<Int, (Int) -> Boolean>> = mapOf(
        "red" to (2 to { n: Int -> n in REDS }),
        "black" to (2 to { n: Int -> n != 0 && n !in REDS }),
        "even" to (2 to { n: Int -> n != 0 && n % 2 == 0 }),
        "odd" to (2 to { n: Int -> n % 2 == 1 }),
        "low" to (2 to { n: Int -> n in 1..18 }),
        "high" to (2 to { n: Int -> n >= 19 }),
        "d1" to (3 to { n: Int -> n in 1..12 }),
        "d2" to (3 to { n: Int -> n in 13..24 }),
        "d3" to (3 to { n: Int -> n >= 25 }),
    )
    private val NUM = Regex("^n:(\\d{1,2})$")

    fun isRouletteBet(id: String): Boolean = id in OUTSIDE || NUM.matchEntire(id)?.groupValues?.get(1)?.toInt()?.let { it <= 36 } == true

    /** Total multiple for one equal stake on each bet: every winning bet adds its own multiple. */
    fun rouletteReturn(bets: Collection<String>, n: Int): Int = bets.toSet().filter(::isRouletteBet).sumOf { id ->
        val num = NUM.matchEntire(id)?.groupValues?.get(1)?.toInt()
        if (num != null) (if (num == n) STRAIGHT else 0) else OUTSIDE.getValue(id).let { (m, wins) -> if (wins(n)) m else 0 }
    }

    /* ---------- slots ---------- */
    val SLOT_SYMBOLS = listOf("seven", "bar", "bell", "diamond", "cherry")
    private val SLOT_WEIGHTS = listOf(1, 2, 3, 4, 5)
    private val SLOT_THREE = mapOf("seven" to 100.0, "bar" to 40.0, "bell" to 20.0, "diamond" to 10.0, "cherry" to 5.0)

    fun slotSymbol(rng: Random): String {
        var r = rng.nextInt(SLOT_WEIGHTS.sum())
        for (i in SLOT_SYMBOLS.indices) { r -= SLOT_WEIGHTS[i]; if (r < 0) return SLOT_SYMBOLS[i] }
        return SLOT_SYMBOLS.last()
    }

    /** Multiple and the pay-table row it hit ("three-seven", "two-sevens", "pair" or ""). */
    fun slotPay(reels: List<String>): Pair<Double, String> {
        val (a, b, c) = reels
        if (a == b && b == c) return SLOT_THREE.getValue(a) to "three-$a"
        if (reels.count { it == "seven" } == 2) return 5.0 to "two-sevens"
        if (reels.toSet().size == 2) return 0.4 to "pair"
        return 0.0 to ""
    }

    /** Exact long-run return of the slot machine. */
    fun slotReturn(): Double {
        val total = SLOT_WEIGHTS.sum().toDouble()
        var sum = 0.0
        for (a in SLOT_SYMBOLS.indices) for (b in SLOT_SYMBOLS.indices) for (c in SLOT_SYMBOLS.indices) {
            val w = SLOT_WEIGHTS[a] * SLOT_WEIGHTS[b] * SLOT_WEIGHTS[c] / (total * total * total)
            sum += w * slotPay(listOf(SLOT_SYMBOLS[a], SLOT_SYMBOLS[b], SLOT_SYMBOLS[c])).first
        }
        return sum
    }

    /* ---------- cards ---------- */
    fun deck(rng: Random, decks: Int = 1): MutableList<Card> {
        val d = ArrayList<Card>(52 * decks)
        repeat(decks) { for (s in 0..3) for (r in 1..13) d.add(Card(r, s)) }
        for (i in d.size - 1 downTo 1) { val j = rng.nextInt(i + 1); val t = d[i]; d[i] = d[j]; d[j] = t }
        return d
    }

    fun handValue(cards: List<Card>): Int {
        var total = 0; var aces = 0
        for (c in cards) if (c.r == 1) { aces++; total += 11 } else total += minOf(10, c.r)
        while (total > 21 && aces > 0) { total -= 10; aces-- }
        return total
    }

    fun isBlackjack(cards: List<Card>) = cards.size == 2 && handValue(cards) == 21

    /** Return multiple (stake included) and the outcome word the page shows. */
    fun blackjack(player: List<Card>, dealer: List<Card>): Pair<Double, String> {
        val pbj = isBlackjack(player); val dbj = isBlackjack(dealer)
        if (pbj && dbj) return 1.0 to "push"
        if (pbj) return 2.5 to "blackjack"
        if (dbj) return 0.0 to "dealer-blackjack"
        val pv = handValue(player); val dv = handValue(dealer)
        return when {
            pv > 21 -> 0.0 to "bust"
            dv > 21 -> 2.0 to "dealer-bust"
            pv > dv -> 2.0 to "win"
            pv == dv -> 1.0 to "push"
            else -> 0.0 to "lose"
        }
    }

    /* ---------- video poker: jacks or better ---------- */
    val POKER_PAYS = linkedMapOf(
        "Royal flush" to 250, "Straight flush" to 50, "Four of a kind" to 25, "Full house" to 8,
        "Flush" to 5, "Straight" to 4, "Three of a kind" to 3, "Two pair" to 2, "Jacks or better" to 1,
    )

    fun pokerRank(hand: List<Card>): String? {
        val rs = hand.map { if (it.r == 1) 14 else it.r }.sorted()
        val counts = rs.groupingBy { it }.eachCount()
        val cv = counts.values.sortedDescending()
        val flush = hand.all { it.s == hand[0].s }
        val straight = rs.toSet().size == 5 && (rs[4] - rs[0] == 4 || rs == listOf(2, 3, 4, 5, 14))
        return when {
            straight && flush && rs[0] == 10 -> "Royal flush"
            straight && flush -> "Straight flush"
            cv[0] == 4 -> "Four of a kind"
            cv[0] == 3 && cv[1] == 2 -> "Full house"
            flush -> "Flush"
            straight -> "Straight"
            cv[0] == 3 -> "Three of a kind"
            cv[0] == 2 && cv[1] == 2 -> "Two pair"
            cv[0] == 2 && counts.entries.first { it.value == 2 }.key >= 11 -> "Jacks or better"
            else -> null
        }
    }

    fun pokerMultiple(hand: List<Card>): Int = pokerRank(hand)?.let { POKER_PAYS[it] } ?: 0
}
