// The JavaScript dealer (browser demo and apps before 0.6.0) answers like the native one.
const test = require("node:test");
const assert = require("node:assert/strict");
global.window = {};
window.AnteGames = require("../app/src/main/assets/web/js/games.js");
require("../app/src/main/assets/web/js/dealer.js");

function bank(left) {
  const b = { left, open: 0 };
  b.bet = (pkg, s) => { if (s <= 0 || s > b.left) return false; b.left -= s; b.open += s; return true; };
  b.settle = (pkg, g, s, ret) => { if (s > b.open) return -2147483648; b.open -= s; b.left += ret; return ret - s; };
  return b;
}

test("one-shot games take the stake and pay the result", () => {
  const b = bank(1e9), D = window.AnteDealer(b.bet, b.settle);
  for (let i = 0; i < 500; i++) {
    const before = b.left;
    const r = D.play("p", ["coin", "roulette", "slots"][i % 3], 100, { pick: "T", bets: ["red", "n:3"] });
    assert.ok(r.ok);
    assert.equal(b.left, before + r.net);
    assert.equal(r.net, r.ret - r.stake);
  }
  assert.equal(b.open, 0);
});

test("unaffordable stakes and bad bets are refused", () => {
  const b = bank(50), D = window.AnteDealer(b.bet, b.settle);
  assert.equal(D.play("p", "coin", 51, { pick: "H" }).error, "stake");
  assert.equal(D.play("p", "coin", 5, { pick: "X" }).error, "bet");
  assert.equal(D.play("p", "roulette", 5, { bets: ["nope"] }).error, "bet");
  assert.equal(D.bjStand().error, "round");
  assert.equal(b.left, 50);
});

test("blackjack and poker rounds settle exactly once", () => {
  const b = bank(1e9), D = window.AnteDealer(b.bet, b.settle);
  for (let i = 0; i < 300; i++) {
    let r = D.bjDeal("p", 100);
    while (!r.done) r = D.bjStand();
    assert.equal(D.bjStand().error, "round");
    D.pkDeal("p", 100);
    const p = D.pkDraw(0b00111);
    assert.ok(p.ok);
    assert.equal(D.pkDraw(0).error, "round");
  }
  assert.equal(b.open, 0);
});
