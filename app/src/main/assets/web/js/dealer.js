/* The table rounds in JavaScript, with the same calls and answers as the native dealer
   (core/Dealer.kt). Used by the browser demo, and by app versions older than 0.6.0, which still
   take a stake with bet() and pay with settle(). On 0.6.0 and later the phone deals instead. */
(function () {
  "use strict";
  window.AnteDealer = function (bet, settle) {
    const G = window.AnteGames;
    let shoe = [], bj = null, pk = null;
    const fail = error => ({ ok: false, error });
    const pay = (pkg, game, stake, multiple) => {
      const ret = Math.round(stake * multiple);
      return { ok: true, stake, ret, multiple, net: settle(pkg, game, stake, ret) };
    };
    const draw = () => { if (shoe.length < 20) shoe = G.newShoe(); return shoe.pop(); };
    let bacShoe = [];
    const bacDraw = () => { if (bacShoe.length < 20) bacShoe = G.newShoe(null, 8); return bacShoe.pop(); };
    function bjFinish(r) {
      bj = null;
      if (G.handValue(r.p) <= 21 && !G.isBlackjack(r.p) && !G.isBlackjack(r.d)) G.dealerPlay(r.d, draw);
      const res = G.blackjackMultiple(r.p, r.d);
      return Object.assign(pay(r.pkg, "Blackjack", r.stake, res.multiple), { p: r.p.slice(), d: r.d.slice(), outcome: res.outcome, done: true });
    }
    return {
      play(pkg, game, stake, args) {
        args = args || {};
        if (game === "coin") {
          if (args.pick !== "H" && args.pick !== "T") return fail("bet");
          if (!bet(pkg, stake)) return fail("stake");
          const r = G.coinFlip(args.pick);
          return Object.assign(pay(pkg, "Coin flip", stake, r.multiple), { result: r.result });
        }
        if (game === "roulette") {
          const bets = [...new Set(args.bets || [])].filter(G.isRouletteBet);
          if (!bets.length || stake <= 0) return fail("bet");
          if (!bet(pkg, stake * bets.length)) return fail("stake");
          const n = G.rouletteSpin();
          return Object.assign(pay(pkg, "Roulette", stake * bets.length, G.rouletteReturn(bets, n) / bets.length), { n, bets });
        }
        if (game === "plinko") {
          if (!bet(pkg, stake)) return fail("stake");
          const path = G.plinkoDrop(), slot = G.plinkoSlot(path);
          return Object.assign(pay(pkg, "Plinko", stake, G.PLINKO_PAYS[slot]), { path, slot });
        }
        if (game === "crash") {
          const target = Number(args.target);
          if (!G.isCrashTarget(target)) return fail("bet");
          if (!bet(pkg, stake)) return fail("stake");
          const point = G.crashPoint();
          return Object.assign(pay(pkg, "Crash", stake, point >= target ? target : 0), { point, target });
        }
        if (game === "dice") {
          const under = args.under | 0;
          if (under < G.DICE_MIN || under > G.DICE_MAX) return fail("bet");
          if (!bet(pkg, stake)) return fail("stake");
          const roll = G.diceRoll();
          return Object.assign(pay(pkg, "Dice", stake, roll < under ? G.diceMultiple(under) : 0), { roll, under });
        }
        if (game === "baccarat") {
          const b = args.bet;
          if (!Object.prototype.hasOwnProperty.call(G.BACCARAT_BETS, b)) return fail("bet");
          if (!bet(pkg, stake)) return fail("stake");
          const coup = G.baccaratCoup(bacDraw);
          return Object.assign(pay(pkg, "Baccarat", stake, G.baccaratMultiple(b, coup.winner)), { p: coup.p, b: coup.b, winner: coup.winner, bet: b });
        }
        if (game === "keno") {
          const picks = (args.picks || []).map(Number);
          if (!G.isKenoPicks(picks)) return fail("bet");
          if (!bet(pkg, stake)) return fail("stake");
          const drawn = G.kenoDraw(), hits = G.kenoHits(picks, drawn);
          return Object.assign(pay(pkg, "Keno", stake, G.KENO_PAYS[hits]), { drawn, hits });
        }
        if (game === "slots") {
          if (!bet(pkg, stake)) return fail("stake");
          const reels = G.slotSpin(), p = G.slotPay(reels);
          return Object.assign(pay(pkg, "Slots", stake, p.multiple), { reels, key: p.key });
        }
        return fail("bet");
      },
      bjDeal(pkg, stake) {
        if (!bet(pkg, stake)) return fail("stake");
        const r = bj = { pkg, stake, p: [draw(), draw()], d: [draw(), draw()] };
        if (G.isBlackjack(r.p) || G.isBlackjack(r.d)) return bjFinish(r);
        return { ok: true, p: r.p.slice(), d: [r.d[0]], done: false };
      },
      bjHit() {
        const r = bj; if (!r) return fail("round");
        const card = draw(); r.p.push(card);
        if (G.handValue(r.p) >= 21) return Object.assign(bjFinish(r), { card });
        return { ok: true, card, p: r.p.slice(), done: false };
      },
      bjDouble() {
        const r = bj; if (!r || r.p.length !== 2) return fail("round");
        if (!bet(r.pkg, r.stake)) return fail("stake");
        r.stake *= 2;
        const card = draw(); r.p.push(card);
        return Object.assign(bjFinish(r), { card });
      },
      bjStand() { return bj ? bjFinish(bj) : fail("round"); },
      pkDeal(pkg, stake) {
        if (!bet(pkg, stake)) return fail("stake");
        const deck = G.shuffledDeck();
        pk = { pkg, stake, hand: deck.splice(0, 5), deck };
        return { ok: true, hand: pk.hand.slice() };
      },
      pkDraw(held) {
        const r = pk; if (!r) return fail("round");
        if (!(Number.isInteger(held) && held >= 0 && held <= 31)) return fail("bet");
        pk = null;
        const hand = r.hand.map((c, i) => (held & (1 << i) ? c : r.deck.shift()));
        const res = G.pokerMultiple(hand);
        return Object.assign(pay(r.pkg, "Poker", r.stake, res.multiple), { hand, rank: res.rank });
      },
    };
  };
})();
