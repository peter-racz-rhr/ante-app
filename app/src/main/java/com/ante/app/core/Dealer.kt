package com.ante.app.core

import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom
import java.util.Random
import kotlin.math.roundToInt

/**
 * Runs every round at the tables natively: takes the stake, rolls or deals with a secure random
 * source, and pays out from the rules in [Games]. The page only animates what comes back, so a
 * changed page (or a leaked update key) can't decide its own wins.
 *
 * Cards and open hands live in memory only; a round left unfinished (the app was closed, or a new
 * hand was dealt) keeps its stake, so a bad hand can't be thrown back for a refund.
 * Not thread safe: [com.ante.app.Bank] serializes access.
 */
class Dealer(private val rng: Random = SecureRandom()) {
    private class Bj(val pkg: String, var stake: Int, val p: MutableList<Games.Card>, val d: MutableList<Games.Card>)
    private class Pk(val pkg: String, val stake: Int, val deck: MutableList<Games.Card>, val hand: List<Games.Card>)

    private var shoe: MutableList<Games.Card> = mutableListOf()
    private var bj: Bj? = null
    private var pk: Pk? = null

    /* ---------- one-shot games ---------- */

    fun coin(bank: TimeBank, pkg: String, stake: Int, pick: String, nowMs: Long): JSONObject {
        if (pick != "H" && pick != "T") return fail("bet")
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val result = if (rng.nextBoolean()) "H" else "T"
        val multiple = if (result == pick) Games.COIN_RETURN else 0.0
        return settle(bank, pkg, "Coin flip", stake, multiple, nowMs).put("result", result)
    }

    /** [per] on each of [bets]; the stake is [per] times the number of different valid bets. */
    fun roulette(bank: TimeBank, pkg: String, per: Int, bets: List<String>, nowMs: Long): JSONObject {
        val valid = bets.toSet().filter(Games::isRouletteBet)
        if (valid.isEmpty() || per <= 0 || valid.size > MAX_ROULETTE_BETS) return fail("bet")
        val stake = per.toLong() * valid.size
        if (stake > Int.MAX_VALUE || !bank.placeBet(pkg, stake.toInt())) return fail("stake")
        val n = rng.nextInt(37)
        val total = Games.rouletteReturn(valid, n)
        return settle(bank, pkg, "Roulette", stake.toInt(), total.toDouble() / valid.size, nowMs)
            .put("n", n).put("bets", JSONArray(valid))
    }

    fun slots(bank: TimeBank, pkg: String, stake: Int, nowMs: Long): JSONObject {
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val reels = List(3) { Games.slotSymbol(rng) }
        val (multiple, key) = Games.slotPay(reels)
        return settle(bank, pkg, "Slots", stake, multiple, nowMs).put("reels", JSONArray(reels)).put("key", key)
    }

    /* ---------- plinko, crash, dice, baccarat, keno: one call each ---------- */

    fun plinko(bank: TimeBank, pkg: String, stake: Int, nowMs: Long): JSONObject {
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val path = List(Games.PLINKO_ROWS) { if (rng.nextBoolean()) 1 else 0 }
        val slot = path.sum()
        return settle(bank, pkg, "Plinko", stake, Games.PLINKO_PAYS[slot], nowMs).put("path", JSONArray(path)).put("slot", slot)
    }

    /** Auto cash-out at [target]: pays target× when the crash point reaches it. */
    fun crash(bank: TimeBank, pkg: String, stake: Int, target: Double, nowMs: Long): JSONObject {
        if (Games.CRASH_TARGETS.none { it == target }) return fail("bet")
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val point = Games.crashPoint(rng)
        return settle(bank, pkg, "Crash", stake, if (point >= target) target else 0.0, nowMs).put("point", point).put("target", target)
    }

    fun dice(bank: TimeBank, pkg: String, stake: Int, under: Int, nowMs: Long): JSONObject {
        if (under !in Games.DICE_RANGE) return fail("bet")
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val roll = rng.nextInt(10_000) / 100.0
        return settle(bank, pkg, "Dice", stake, if (roll < under) Games.diceMultiple(under) else 0.0, nowMs).put("roll", roll).put("under", under)
    }

    fun baccarat(bank: TimeBank, pkg: String, stake: Int, bet: String, nowMs: Long): JSONObject {
        if (bet !in Games.BACCARAT_PAYS) return fail("bet")
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val coup = Games.baccaratCoup { bacDraw() }
        return settle(bank, pkg, "Baccarat", stake, Games.baccaratMultiple(bet, coup.winner), nowMs)
            .put("p", cards(coup.player)).put("b", cards(coup.banker)).put("winner", coup.winner).put("bet", bet)
    }

    fun keno(bank: TimeBank, pkg: String, stake: Int, picks: List<Int>, nowMs: Long): JSONObject {
        if (!Games.isKenoPicks(picks)) return fail("bet")
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val pool = (1..Games.KENO_N).toMutableList()
        for (i in pool.size - 1 downTo 1) { val j = rng.nextInt(i + 1); val t = pool[i]; pool[i] = pool[j]; pool[j] = t }
        val drawn = pool.take(Games.KENO_DRAW)
        val hits = picks.count { it in drawn }
        return settle(bank, pkg, "Keno", stake, Games.KENO_PAYS[hits], nowMs).put("drawn", JSONArray(drawn)).put("hits", hits)
    }

    private var bacShoe: MutableList<Games.Card> = mutableListOf()
    private fun bacDraw(): Games.Card {
        if (bacShoe.size < RESHUFFLE_AT) bacShoe = Games.deck(rng, BACCARAT_DECKS)
        return bacShoe.removeAt(bacShoe.size - 1)
    }

    /* ---------- blackjack: 6-deck shoe, dealer stands on all 17s, blackjack pays 3 to 2 ---------- */

    fun bjDeal(bank: TimeBank, pkg: String, stake: Int, nowMs: Long): JSONObject {
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val r = Bj(pkg, stake, mutableListOf(draw(), draw()), mutableListOf(draw(), draw()))
        bj = r
        if (Games.isBlackjack(r.p) || Games.isBlackjack(r.d)) return bjFinish(bank, r, nowMs)
        return ok().put("p", cards(r.p)).put("d", cards(r.d.take(1))).put("done", false)
    }

    fun bjHit(bank: TimeBank, nowMs: Long): JSONObject {
        val r = bj ?: return fail("round")
        val card = draw()
        r.p.add(card)
        if (Games.handValue(r.p) >= 21) return bjFinish(bank, r, nowMs).put("card", card(card))
        return ok().put("card", card(card)).put("p", cards(r.p)).put("done", false)
    }

    /** Doubles the stake on the first two cards, draws exactly one card and stands. */
    fun bjDouble(bank: TimeBank, nowMs: Long): JSONObject {
        val r = bj ?: return fail("round")
        if (r.p.size != 2) return fail("round")
        if (!bank.placeBet(r.pkg, r.stake)) return fail("stake")
        r.stake *= 2
        val card = draw()
        r.p.add(card)
        return bjFinish(bank, r, nowMs).put("card", card(card))
    }

    fun bjStand(bank: TimeBank, nowMs: Long): JSONObject {
        val r = bj ?: return fail("round")
        return bjFinish(bank, r, nowMs)
    }

    private fun bjFinish(bank: TimeBank, r: Bj, nowMs: Long): JSONObject {
        bj = null
        val pv = Games.handValue(r.p)
        if (pv <= 21 && !Games.isBlackjack(r.p) && !Games.isBlackjack(r.d)) {
            while (Games.handValue(r.d) < 17) r.d.add(draw())
        }
        val (multiple, outcome) = Games.blackjack(r.p, r.d)
        return settle(bank, r.pkg, "Blackjack", r.stake, multiple, nowMs)
            .put("p", cards(r.p)).put("d", cards(r.d)).put("outcome", outcome).put("done", true)
    }

    private fun draw(): Games.Card {
        if (shoe.size < RESHUFFLE_AT) shoe = Games.deck(rng, SHOE_DECKS)
        return shoe.removeAt(shoe.size - 1)
    }

    /* ---------- video poker: jacks or better, one draw ---------- */

    fun pkDeal(bank: TimeBank, pkg: String, stake: Int): JSONObject {
        if (!bank.placeBet(pkg, stake)) return fail("stake")
        val deck = Games.deck(rng)
        val hand = deck.take(5)
        pk = Pk(pkg, stake, deck.drop(5).toMutableList(), hand)
        return ok().put("hand", cards(hand))
    }

    /** [held] has one bit per card, bit 0 for the first: held cards stay, the others are replaced. */
    fun pkDraw(bank: TimeBank, held: Int, nowMs: Long): JSONObject {
        val r = pk ?: return fail("round")
        if (held !in 0..31) return fail("bet")
        pk = null
        var next = 0
        val hand = r.hand.mapIndexed { i, c -> if (held and (1 shl i) != 0) c else r.deck[next++] }
        val multiple = Games.pokerMultiple(hand)
        return settle(bank, r.pkg, "Poker", r.stake, multiple.toDouble(), nowMs)
            .put("hand", cards(hand)).put("rank", Games.pokerRank(hand) ?: JSONObject.NULL)
    }

    /* ---------- the daily free spin ---------- */

    /** Rolls a prize and adds it to [pkg], once a day after a day spent within the limits. */
    fun freeSpin(bank: TimeBank, pkg: String, nowMs: Long): JSONObject {
        if (!bank.freeSpinAvailable()) return fail("used")
        val index = pickWeighted(FREE_SPIN_WEIGHTS)
        val prize = FREE_SPIN_PRIZES[index]
        if (!bank.claimFreeSpin(pkg, prize, nowMs)) return fail("stake")
        return ok().put("index", index).put("prizeSec", prize)
    }

    private fun pickWeighted(weights: List<Int>): Int {
        var r = rng.nextInt(weights.sum())
        for (i in weights.indices) { r -= weights[i]; if (r < 0) return i }
        return weights.size - 1
    }

    /* ---------- helpers ---------- */

    private fun settle(bank: TimeBank, pkg: String, game: String, stake: Int, multiple: Double, nowMs: Long): JSONObject {
        val ret = (stake * multiple).roundToInt()
        val net = bank.settleBet(pkg, game, stake, ret, nowMs)
        return ok().put("stake", stake).put("ret", ret).put("multiple", multiple).put("net", net)
    }

    private fun ok() = JSONObject().put("ok", true)
    private fun fail(error: String) = JSONObject().put("ok", false).put("error", error)
    private fun card(c: Games.Card) = JSONObject().put("r", c.r).put("s", c.s)
    private fun cards(cs: List<Games.Card>) = JSONArray().apply { cs.forEach { put(card(it)) } }

    companion object {
        const val SHOE_DECKS = 6
        const val BACCARAT_DECKS = 8
        const val RESHUFFLE_AT = 20
        const val MAX_ROULETTE_BETS = 46 // every outside bet and every number
        /** Free spin prizes in seconds, and how often each comes up (out of 100). */
        val FREE_SPIN_PRIZES = listOf(60, 120, 180, 300, 600, 900)
        val FREE_SPIN_WEIGHTS = listOf(30, 25, 20, 15, 8, 2)
    }
}
