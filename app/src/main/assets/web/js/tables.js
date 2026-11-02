/* Tables: the table list, the stake control, each game's flow, focus mode, and the block screen. */
(function () {
  "use strict";
  const App = window.App;
  const { A, G, FX, esc, fmt, signed } = App;
  const ui = App.ui;
  let table = null; // mounted game controller

  /* ---------- stake ---------- */
  const stakeLimit = () => App.lim(ui.stakePkg);
  App.ensureStakeApp = function () {
    if (App.BLOCK) { ui.stakePkg = App.CTX.pkg; return; }
    const cur = stakeLimit();
    if (cur && cur.leftSec >= 60) return;
    const best = App.S.limits.filter(l => l.leftSec >= 60).sort((a, b) => b.leftSec - a.leftSec)[0];
    ui.stakePkg = best ? best.pkg : (App.S.limits[0] || {}).pkg || null;
  };
  function clampStake() {
    const l = stakeLimit(); if (!l) return;
    ui.stake = Math.max(60, Math.min(ui.stake, Math.max(60, Math.floor(l.leftSec / 60) * 60)));
  }
  const canStake = extra => { const l = stakeLimit(); return !!l && l.leftSec >= (extra || ui.stake) && ui.stake >= 60; };

  /** Stake steps: a minute at a time, five once the stake reaches ten minutes. */
  const stepUp = () => (ui.stake >= 600 ? 300 : 60);
  const stepDown = () => (ui.stake > 600 ? 300 : 60);
  /** Apps whose minutes can be staked right now. */
  const stakeable = () => App.S.limits.filter(l => l.leftSec >= 60);

  /**
   * The one stake control every table uses: − stake + and the play button, in one row.
   * Tapping the stake switches which app's minutes are on the line. `count` is the number
   * of bets the stake is multiplied by (roulette).
   */
  function stakeRow(locked, action, opts) {
    const o = Object.assign({ count: 1, perBet: false, label: "Play", empty: "" }, opts);
    const l = stakeLimit(); if (!l) return "";
    clampStake();
    const dis = locked ? "disabled" : "", n = Math.max(1, o.count), total = ui.stake * o.count;
    const canSwitch = !App.BLOCK && stakeable().length > 1 && !locked;
    let btn;
    if (o.empty) btn = `<button class="btn primary big rgo" disabled>${esc(o.empty)}</button>`;
    else if (canStake(total) || locked) btn = `<button class="btn primary big rgo" data-a="${action}" ${ui.busy ? "disabled" : ""}><span>${esc(o.label)}</span><small>${o.count > 1 ? `${o.count} bets · ` : ""}${esc(fmt(total))}</small></button>`;
    else btn = `<button class="btn primary big rgo" disabled><span>Not enough</span><small>${esc(fmt(l.leftSec))} left</small></button>`;
    return `<div class="rstake-row">
      <div class="rstake" role="group" aria-label="${o.perBet ? "Stake per bet" : "Stake"}">
        <button class="step" data-a="stake" data-d="-1" aria-label="Less" ${dis || (ui.stake <= 60 ? "disabled" : "")}>−</button>
        <button class="rstake-val" id="stake-val" data-a="stakeCycle" ${canSwitch ? "" : "disabled"} aria-label="Stake ${esc(fmt(ui.stake))}${o.perBet ? " per bet" : ""} from ${esc(l.label)}, ${esc(fmt(l.leftSec))} left${canSwitch ? ". Tap to stake another app" : ""}">
          <span class="dotnum" data-fit="22">${fmt(ui.stake)}</span>
          <small>${App.appIcon(l.pkg, "xs")}<span class="num">${esc(fmt(l.leftSec))}</span></small></button>
        <button class="step" data-a="stake" data-d="1" aria-label="More" ${dis || ((ui.stake + stepUp()) * n > l.leftSec ? "disabled" : "")}>+</button>
      </div>${btn}</div>`;
  }

  /* ---------- list ---------- */
  App.views.tables = function () {
    App.ensureStakeApp();
    const S = App.S, l = stakeLimit();
    const head = App.BLOCK
      ? `<header class="topbar">${App.backBtn("toBlock", `Back to ${App.CTX.label}`)}<div class="grow"><p class="eyebrow">Playing with ${esc(App.CTX.label)} time</p><h1 class="h2">Tables</h1></div>${App.soundBtn()}</header>`
      : `<header class="topbar"><div class="grow"><h1 class="h1">Play</h1><p class="muted">Stake minutes. Wins go back to that app; losses are gone for today.</p></div>${App.soundBtn()}</header>`;
    if (!App.tablesOn()) {
      return `<div class="screen" id="screen">${head}<section class="panel"><h2 class="h3">The tables are off</h2><p class="muted">Ante works as a plain blocker. Turn the tables back on in Settings.</p></section></div>`;
    }
    if (!l || l.leftSec < 60) {
      return `<div class="screen" id="screen">${head}<section class="panel"><h2 class="h3">Nothing to stake</h2><p class="muted">${S.limits.length ? "Every limited app is under a minute for today. Budgets reset at midnight." : "Add a limit on Home first. Its minutes are your chips."}</p></section></div>`;
    }
    const games = G.GAMES.map(g => `<button class="game ${g.feature ? "feature" : ""} g-${g.id}" data-a="game" data-id="${g.id}">
        <span class="art" aria-hidden="true">${FX.GAME_ART[g.id]()}</span>
        <span class="gtext"><span class="gname">${g.name}</span><span class="grule">${g.rule}</span></span>
        <span class="rtp"><span class="num">${g.rtp}</span> back</span></button>`).join("");
    return `<div class="screen" id="screen">${head}
      ${App.freeSpinCard()}
      <section class="games" aria-label="Tables">${games}</section>
      <p class="fine">No real money. "Back" is the average share of a stake each table returns, so the house keeps a little every round.</p>
    </div>`;
  };
  App.afterTables = () => { const art = document.querySelector(".g-roulette .art"); if (art) FX.miniWheel(art); };

  /* ---------- game screen ---------- */
  App.views.game = function () {
    const g = G.GAMES.find(x => x.id === ui.game);
    return `<div class="screen game-screen" id="screen" data-game="${g.id}">
      <header class="topbar">${App.backBtn("leave", "Back to tables")}<div class="grow"><h1 class="h2">${g.name}</h1><p class="muted">Returns ${g.rtp} on average</p></div>${App.soundBtn()}</header>
      <section class="felt" id="table" aria-label="${g.name} table"></section>
      <p class="result" id="result" aria-live="polite"></p>
      <section class="panel controls" id="controls"></section>
    </div>`;
  };

  App.mountGame = function () {
    if (table && table.destroy) table.destroy();
    const el = document.getElementById("table");
    ui.res = null; ui.round = null;
    if (ui.game === "coin") { ui.pick = ui.pick || "H"; table = FX.Coin(el); }
    if (ui.game === "roulette") { ui.rbets = (ui.rbets || ["red"]).filter(G.isRouletteBet); ui.hist = ui.hist || []; ui.rTab = ui.rTab || "outside";
      table = FX.Roulette(el, { fitHeight: true, onFlick: (dir, power) => {
        // A flick is another way to press Spin, with the same checks.
        const b = document.querySelector('#controls [data-a="rSpin"]');
        if (!b || b.disabled) { if (!ui.busy) App.toast((ui.rbets || []).length ? `Not enough ${App.labelOf(ui.stakePkg)} time for those bets.` : "Put a bet on the table first."); return false; }
        ui.flick = { dir, power }; b.click(); return true;
      } }); }
    if (ui.game === "slots") { table = FX.Slots(el, ["seven", "bell", "cherry"]); paytableSlots(el); }
    if (ui.game === "blackjack") table = FX.Blackjack(el);
    if (App.extraGames && App.extraGames[ui.game]) { App.extraGameDefaults(); table = App.extraGames[ui.game].mount(el); }
    if (ui.game === "poker") {
      table = FX.Poker(el, i => {
        if (ui.round && ui.round.phase === "dealt" && !ui.busy) { ui.round.held[i] = !ui.round.held[i]; table.setHold(i, ui.round.held[i]); App.haptic("tap"); App.SFX.play("chip"); }
      });
    }
    watchFit();
  };
  App.unmountGame = () => { if (table && table.destroy) table.destroy(); table = null; if (fitRo) { fitRo.disconnect(); fitRo = null; } if (fitMo) { fitMo.disconnect(); fitMo = null; } };

  /* Every table fits one screen: the felt gets whatever height is left, and its contents are
     zoomed down (never up) to fit it. Roulette sizes its own wheel, so it is left alone. */
  const MIN_FIT = 0.55;
  let fitRo = null, fitMo = null, fitRaf = 0;
  function fitFelt() {
    const felt = document.getElementById("table");
    if (!felt || ui.game === "roulette") return;
    const kids = [...felt.children].filter(k => getComputedStyle(k).position !== "absolute");
    if (!kids.length) return;
    const cs = getComputedStyle(felt);
    const gap = parseFloat(cs.rowGap || cs.gap || 0) || 0;
    const room = felt.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - gap * (kids.length - 1);
    const z = parseFloat(felt.style.getPropertyValue("--fit")) || 1;
    const natural = kids.reduce((a, k) => a + k.getBoundingClientRect().height, 0) / z;
    if (natural <= 0 || room <= 0) return;
    const next = Math.max(MIN_FIT, Math.min(1, room / natural));
    if (Math.abs(next - z) > 0.01) felt.style.setProperty("--fit", next.toFixed(3));
  }
  App.fitFelt = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitFelt); };
  function watchFit() {
    const felt = document.getElementById("table"); if (!felt || !window.ResizeObserver) return;
    if (fitRo) fitRo.disconnect();
    if (fitMo) fitMo.disconnect();
    fitRo = new ResizeObserver(App.fitFelt);
    fitRo.observe(felt);
    [...felt.children].forEach(k => fitRo.observe(k));
    if (window.MutationObserver) {
      fitMo = new MutationObserver(() => { [...felt.children].forEach(k => fitRo && fitRo.observe(k)); App.fitFelt(); });
      fitMo.observe(felt, { childList: true, subtree: true });
    }
    App.fitFelt();
  }
  function paytableSlots(el) {
    const rows = [["seven", "100×"], ["bar", "40×"], ["bell", "20×"], ["diamond", "10×"], ["cherry", "5×"]];
    const div = document.createElement("div");
    div.className = "slot-pays";
    div.innerHTML = rows.map(([s, m]) => `<div class="sp" data-key="three-${s}"><span class="sp-art">${FX.slotSvg(s).repeat(3)}</span><span class="num">${m}</span></div>`).join("")
      + `<div class="sp" data-key="two-sevens"><span class="sp-txt">Any two 7s</span><span class="num">5×</span></div><div class="sp" data-key="pair"><span class="sp-txt">Any other pair</span><span class="num">0.4×</span></div>`;
    el.appendChild(div);
  }

  App.renderControls = function () {
    const c = document.getElementById("controls"); if (!c) return;
    const r = document.getElementById("result");
    if (r) { r.className = "result " + (ui.res ? ui.res.tone : ""); if (!ui.res) r.textContent = ""; }
    const locked = ui.busy || !!ui.round;
    let html = "";
    if (ui.game === "coin") {
      html = `<div class="seg2" role="group" aria-label="Your call">
          <button class="chip" data-a="coinPick" data-v="H" aria-pressed="${ui.pick === "H"}" ${locked ? "disabled" : ""}>Heads</button>
          <button class="chip" data-a="coinPick" data-v="T" aria-pressed="${ui.pick === "T"}" ${locked ? "disabled" : ""}>Tails</button></div>
        ${stakeRow(locked, "coinFlip", { label: "Flip" })}`;
    } else if (ui.game === "roulette") {
      const bets = ui.rbets || [], n = bets.length, total = ui.stake * n, dis = locked ? "disabled" : "";
      const on = id => bets.includes(id);
      const nums = bets.filter(b => b.startsWith("n:")).length, outs = n - nums;
      const cell = k => `<button class="rnum ${G.pocketColor(k)}" data-a="rToggle" data-v="n:${k}" aria-pressed="${on("n:" + k)}" aria-label="Number ${k}" ${dis}>${k}</button>`;
      const tab = (id, label, count) => `<button role="tab" class="rtab" data-a="rTab" data-v="${id}" aria-selected="${ui.rTab === id}" ${dis}>${label}${count ? ` <span class="rcount">${count}</span>` : ""}</button>`;
      const board = ui.rTab === "numbers"
        ? `<div class="rboard rgrid" role="group" aria-label="Single numbers, ${G.STRAIGHT_MULTIPLE}× each">${cell(0)}${Array.from({ length: 36 }, (_, i) => cell(i + 1)).join("")}</div>`
        : `<div class="rboard bets" role="group" aria-label="Outside bets">${Object.entries(G.ROULETTE_BETS).map(([id, b]) => `<button class="chip bet-${id}" data-a="rToggle" data-v="${id}" aria-pressed="${on(id)}" ${dis}><span>${b.label}</span><span class="pays">${b.multiple}×</span></button>`).join("")}</div>`;
      html = `<div class="rtop"><div class="history" aria-label="Last numbers">${(ui.hist || []).slice(0, 6).map(k => `<span class="${G.pocketColor(k)}">${k}</span>`).join("") || `<span class="none">Flick the wheel or press Spin</span>`}</div>
</div>
        <div class="rtabs" role="tablist" aria-label="Bets">${tab("outside", "Outside", outs)}${tab("numbers", `Numbers <span class="pays">${G.STRAIGHT_MULTIPLE}×</span>`, nums)}
          <button class="rclear" data-a="rClear" aria-label="Clear all bets" ${n && !locked ? "" : "disabled"}>Clear</button></div>
        ${board}
        ${stakeRow(locked, "rSpin", { count: n, perBet: true, label: "Spin", empty: n ? "" : "Pick a bet" })}`;
    } else if (ui.game === "slots") {
      html = stakeRow(locked, "sSpin", { label: "Spin" });
    } else if (ui.game === "blackjack") {
      const R = ui.round;
      if (R && R.phase === "play") {
        const canDouble = R.p.length === 2 && stakeLimit() && stakeLimit().leftSec >= R.stake;
        html = `<div class="btn-row three"><button class="btn quiet" data-a="bjHit" ${ui.busy ? "disabled" : ""}>Hit</button>
          <button class="btn primary" data-a="bjStand" ${ui.busy ? "disabled" : ""}>Stand</button>
          <button class="btn quiet" data-a="bjDouble" ${ui.busy || !canDouble ? "disabled" : ""}>Double</button></div>
          <p class="stake-from center">Stake <span class="num">${fmt(R.stake)}</span> on the table</p>`;
      } else html = stakeRow(locked, "bjDeal", { label: "Deal" });
    } else if (App.extraGames && App.extraGames[ui.game]) {
      html = App.extraGames[ui.game].controls(locked);
    } else if (ui.game === "poker") {
      const R = ui.round;
      if (R && R.phase === "dealt") {
        html = `<p class="muted center">Tap the cards you want to keep, then draw.</p><button class="btn primary big" data-a="pDraw" ${ui.busy ? "disabled" : ""}>Draw</button>
          <p class="stake-from center">Stake <span class="num">${fmt(R.stake)}</span> in play</p>`;
      } else html = stakeRow(locked, "pDeal", { label: "Deal" });
    }
    c.innerHTML = html;
    App.fitText(); // long stakes shrink to fit their box
    App.renderNav();
  };

  /* ---------- focus mode: the table takes the whole screen while a round runs ---------- */
  let focusTimer = null;
  function enterFocus() {
    clearTimeout(focusTimer);
    const scr = document.getElementById("screen"), felt = document.getElementById("table");
    if (!scr || !felt || scr.classList.contains("focus")) return Promise.resolve();
    const first = felt.getBoundingClientRect();
    scr.classList.add("focus");
    App.$app.classList.add("focusing");
    const last = felt.getBoundingClientRect();
    if (!FX.reduced()) {
      felt.style.transformOrigin = "0 0"; // FLIP deltas are measured from the top-left corner
      felt.animate([
        { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`, borderRadius: "24px" },
        { transform: "none", borderRadius: "0px" },
      ], { duration: 420, easing: "cubic-bezier(.2,.9,.25,1)" });
    }
    if (table && table.resize) table.resize();
    return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }
  function exitFocus(delay) {
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      const scr = document.getElementById("screen"), felt = document.getElementById("table");
      if (!scr || !scr.classList.contains("focus") || ui.busy || ui.round) return;
      const first = felt.getBoundingClientRect();
      scr.classList.remove("focus");
      App.$app.classList.remove("focusing");
      const last = felt.getBoundingClientRect();
      if (!FX.reduced()) {
        felt.style.transformOrigin = "0 0";
        felt.animate([
          { transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`, borderRadius: "0px" },
          { transform: "none", borderRadius: "24px" },
        ], { duration: 380, easing: "cubic-bezier(.2,.9,.25,1)" });
      }
      if (table && table.resize) table.resize();
    }, delay);
  }
  App.exitFocusNow = () => exitFocus(0);

  /* ---------- rounds ----------
     Every round is decided by A.play / A.bj* / A.pk* (natively on the phone, since 0.6.0): the
     stake comes off, the result is drawn and paid in one step, and the page only animates it. */
  const INVALID_SETTLE = -2147483648;
  /** Starts a round, or explains why it couldn't. */
  function start(r) {
    if (r && r.ok) { App.refresh(); return true; }
    const why = r && r.error;
    if (why === "bet" && A.native && App.extraGames && App.extraGames[ui.game] && !A.has09) { App.toast("Install the new app version (0.9.0) for this table."); return false; }
    App.toast(why === "stake" ? `Not enough ${App.labelOf(ui.stakePkg)} time for that stake.` : why === "round" ? "That hand is already over." : "That bet isn't on the table.");
    return false;
  }
  /** Runs a round. If the animation breaks, the result still counts and is shown. */
  function guarded(fn) {
    return async function () {
      try { await fn.apply(this, arguments); }
      catch (err) {
        console.warn("round failed", err);
        ui.busy = false; ui.round = null; ui.res = { tone: "loss", text: "The animation broke. Your balance is up to date." };
        App.refresh(); App.renderControls(); exitFocus(0);
      }
    };
  }
  /** Shows a settled round [r] ({stake, ret, net, multiple}). */
  function finish(r, prefix) {
    const { stake, ret, net, multiple } = r;
    App.refresh();
    ui.busy = false; ui.round = null;
    if (net === INVALID_SETTLE) {
      ui.res = { tone: "loss", text: "This round couldn't be paid out because Ante restarted mid-round." };
    } else {
      const app = App.labelOf(ui.stakePkg);
      if (net > 0) ui.res = { tone: "win", text: `${prefix}You win ${fmt(net)} of ${app}.` };
      else if (net === 0) ui.res = { tone: "", text: `${prefix}Push. Your stake comes back.` };
      else if (ret > 0) ui.res = { tone: "loss", text: `${prefix}${fmt(ret)} comes back. Net ${signed(net)}.` };
      else ui.res = { tone: "loss", text: `${prefix}You lose ${fmt(stake)}.` };
      if (net > 0) { FX.burst(document.getElementById("table"), { power: multiple >= 10 ? 1.5 : 1 }); App.haptic("win"); App.SFX.play(multiple >= 10 ? "bigWin" : "win"); if (multiple >= 10) App.milestone("bigwin"); }
      else if (net < 0) { App.haptic("loss"); App.SFX.play("lose"); }
      else App.SFX.play("push");
    }
    const el = document.getElementById("result"); if (el) el.textContent = ui.res.text;
    App.renderControls();
    exitFocus(1700);
  }
  async function begin() { ui.busy = true; ui.res = null; App.renderControls(); await enterFocus(); }
  // For the extra tables in js/tables2.js.
  App.Tables = { start, begin, finish, guarded, stakeRow: (...a) => stakeRow(...a), table: () => table };

  async function coinFlip() {
    const r = A.play(ui.stakePkg, "coin", ui.stake, { pick: ui.pick }); if (!start(r)) return;
    await begin();
    await table.flip(r.result);
    finish(r, r.result === "H" ? "Heads. " : "Tails. ");
  }
  async function rSpin() {
    const bets = [...new Set((ui.rbets || []).filter(G.isRouletteBet))];
    const flick = ui.flick; ui.flick = null; // set when the wheel was flicked by hand
    if (!bets.length) return;
    const r = A.play(ui.stakePkg, "roulette", ui.stake, { bets }); if (!start(r)) return;
    await begin();
    const n = r.n;
    let ticks = 0;
    await table.spin(n, () => { if (++ticks % 2 === 0) App.haptic("tick"); }, flick);
    ui.hist = [n, ...(ui.hist || [])].slice(0, 10);
    const won = bets.filter(b => G.rouletteReturn([b], n) > 0).map(b => b.startsWith("n:") ? b.slice(2) : G.ROULETTE_BETS[b].label);
    const hits = bets.length > 1 && won.length ? `${won.join(", ")} ${won.length === 1 ? "hits" : "hit"}. ` : "";
    finish(r, `${n} ${G.pocketColor(n)}. ${hits}`);
  }
  async function sSpin() {
    const r = A.play(ui.stakePkg, "slots", ui.stake, {}); if (!start(r)) return;
    await begin();
    await table.spin(r.reels, () => App.haptic("tick"));
    document.querySelectorAll(".slot-pays .sp").forEach(e => e.classList.toggle("on", e.dataset.key === r.key));
    if (r.multiple >= 1) table.win();
    finish(r, r.multiple >= 10 ? "Jackpot row. " : "");
  }
  async function bjDeal() {
    const r = A.bjDeal(ui.stakePkg, ui.stake); if (!start(r)) return;
    const R = ui.round = { phase: "deal", stake: r.stake || ui.stake, p: r.p.slice(), up: r.d[0] };
    await begin();
    table.chip(fmt(R.stake));
    await table.deal(R.p, [R.up], App.haptic);
    table.values(G.handValue(R.p), G.handValue([R.up]));
    if (r.done) return bjShow(r);
    R.phase = "play"; ui.busy = false; App.renderControls();
  }
  async function bjHit() {
    const R = ui.round; if (!R || ui.busy) return;
    const r = A.bjHit(); if (!start(r)) return;
    ui.busy = true; App.renderControls();
    R.p.push(r.card);
    await table.hit(r.card, App.haptic);
    table.values(G.handValue(R.p), G.handValue([R.up]));
    if (r.done) return bjShow(r);
    ui.busy = false; App.renderControls();
  }
  async function bjDouble() {
    const R = ui.round; if (!R || ui.busy) return;
    const r = A.bjDouble(); if (!start(r)) return;
    R.stake = r.stake; table.chip(fmt(R.stake));
    ui.busy = true; App.renderControls();
    R.p.push(r.card);
    await table.hit(r.card, App.haptic);
    table.values(G.handValue(R.p), G.handValue([R.up]));
    await bjShow(r);
  }
  async function bjStand() {
    const R = ui.round; if (!R || ui.busy) return;
    const r = A.bjStand(); if (!start(r)) return;
    await bjShow(r);
  }
  /** Turns the hole card, plays out the dealer's draws, and shows the settled hand [r]. */
  async function bjShow(r) {
    ui.busy = true; App.renderControls();
    const d = r.d, pv = G.handValue(r.p);
    await table.reveal(d[1]);
    for (let i = 2; i < d.length; i++) { table.values(pv, G.handValue(d.slice(0, i))); await table.dealer(d[i], App.haptic); }
    const dv = G.handValue(d);
    table.values(pv, dv);
    const words = { blackjack: "Blackjack!", "dealer-blackjack": "Dealer blackjack", bust: "Bust", "dealer-bust": "Dealer busts", win: "You win", push: "Push", lose: "Dealer wins" };
    table.banner(words[r.outcome], r.multiple > 1 ? "win" : r.multiple === 1 ? "" : "loss");
    const prefix = r.outcome === "win" ? `${pv} beats ${dv}. ` : r.outcome === "lose" ? `Dealer's ${dv} beats ${pv}. ` : r.outcome === "bust" ? `Bust at ${pv}. ` : r.outcome === "dealer-bust" ? `Dealer busts at ${dv}. ` : "";
    finish(r, prefix);
    table.chip("");
  }
  async function pDeal() {
    const r = A.pkDeal(ui.stakePkg, ui.stake); if (!start(r)) return;
    const R = ui.round = { phase: "deal", stake: ui.stake, hand: r.hand, held: [false, false, false, false, false] };
    await begin();
    await table.deal(R.hand, App.haptic);
    table.highlight(G.pokerRank(R.hand));
    R.phase = "dealt"; ui.busy = false; table.enable(true); App.renderControls();
  }
  async function pDraw() {
    const R = ui.round; if (!R || ui.busy) return;
    const r = A.pkDraw(R.held.reduce((m, h, i) => (h ? m | (1 << i) : m), 0)); if (!start(r)) return;
    ui.busy = true; table.enable(false); App.renderControls();
    R.hand = r.hand;
    await table.draw(R.hand, R.held, App.haptic);
    table.highlight(r.rank);
    finish(r, r.rank ? `${r.rank}. ` : "No pair of jacks or better. ");
  }

  /* ---------- block screen ---------- */
  const BREATH_S = Number(new URLSearchParams(location.search).get("breath") || 5);
  let breathEnds = 0, breathTimer = null;
  const breathLeft = () => Math.max(0, Math.ceil((breathEnds - Date.now()) / 1000));
  /** A short pause before a blocked app can be opened. Restarts each time the block screen returns. */
  App.startBreath = function () {
    if (!App.BLOCK || BREATH_S <= 0) return;
    breathEnds = Date.now() + BREATH_S * 1000;
    clearInterval(breathTimer);
    breathTimer = setInterval(() => {
      const b = document.getElementById("open-app"), left = breathLeft();
      if (b) {
        const l = App.lim(App.CTX.pkg);
        b.disabled = left > 0;
        b.textContent = left > 0 ? `Take a breath · ${left}` : `Open ${App.CTX.label || (l && l.label) || "app"} · ${fmt(ui.openPick)}`;
      }
      if (left <= 0) clearInterval(breathTimer);
    }, 250);
  };

  function vGuard() {
    // Google Play builds let the uninstaller open after the wait too (CTX.hardStrict false).
    const CTX = App.CTX, installer = /packageinstaller/.test(CTX.pkg || "") && CTX.hardStrict !== false;
    return `<div class="screen block" id="screen">
      <div class="block-top"><span class="appicon xl lockicon" aria-hidden="true">${App.ICON.lock}</span><p class="eyebrow">Strict mode</p>
        <h1 class="h1">${installer ? "Installing and removing apps is locked" : `${esc(CTX.label || "Settings")} is locked`}</h1></div>
      <p class="muted">${installer ? "Strict mode keeps Ante installed until the lock ends. Then installing and removing apps works again." : "Strict mode covers this so blocking can't be switched off on impulse. Wait 30 seconds to use it for 2 minutes."}</p>
      <div class="grow"></div>
      ${installer ? `<button class="btn primary" data-a="openAnte">Open Ante</button>` : `<button class="btn primary" data-a="guardWait">Start the 30-second wait</button>`}
      <button class="btn ghost" data-a="closeBlock">Back to home screen</button>
    </div>`;
  }
  App.views.block = function () {
    const CTX = App.CTX;
    if (CTX.note === "strict") return vGuard();
    const l = App.lim(CTX.pkg), label = esc(CTX.label || (l && l.label) || "This app");
    if (l && (CTX.note === "focus" || (App.modes && App.modes().focus))) return App.focusBlock(label);
    if (!l) return `<div class="screen block" id="screen"><div class="block-top">${App.appIcon(CTX.pkg, "xl")}<h1 class="h1">${label} has no limit</h1></div>
        <div class="grow"></div><button class="btn primary" data-a="closeBlock">Back to home screen</button></div>`;
    if (l.leftSec <= 0) return `<div class="screen block" id="screen">
        <div class="block-top">${App.appIcon(CTX.pkg, "xl")}<p class="eyebrow">${CTX.note ? esc(CTX.note) : "Daily limit reached"}</p><h1 class="h1">${label} is done for today</h1></div>
        <div class="dotclock-box"><p class="dotclock loss" data-fit="140">0:00</p></div><p class="muted">Your ${fmt(l.limitSec)} resets at midnight.</p>
        <div class="grow"></div>
        <button class="btn primary" data-a="closeBlock">Back to home screen</button>
        <button class="btn ghost" data-a="openAnte">Open Ante</button></div>`;
    const opts = [[300, "5 min"], [600, "10 min"], [900, "15 min"], [l.leftSec, "All"]];
    if (ui.openPick > l.leftSec) ui.openPick = l.leftSec;
    return `<div class="screen block" id="screen">
      <div class="block-top">${App.appIcon(CTX.pkg, "xl")}<p class="eyebrow">${CTX.note ? esc(CTX.note) : "Daily limit"}</p><h1 class="h1">${label}</h1></div>
      <div><div class="dotclock-box"><p class="dotclock" data-fit="140">${fmt(l.leftSec)}</p></div><p class="muted">left today of ${fmt(l.limitSec)}</p></div>
      <div class="grow"></div>
      <section class="panel">
        <p class="eyebrow">Open for</p>
        <div class="chips">${opts.map(([v, t]) => `<button class="chip" data-a="pickOpen" data-v="${v}" aria-pressed="${ui.openPick === v}" ${v > l.leftSec ? "disabled" : ""}>${t}</button>`).join("")}</div>
        <button class="btn primary" id="open-app" data-a="openApp" ${breathLeft() > 0 ? "disabled" : ""}>${breathLeft() > 0 ? `Take a breath · ${breathLeft()}` : `Open ${label} · ${fmt(ui.openPick)}`}</button>
        ${App.tablesOn() ? `<button class="btn quiet" data-a="toTables" ${l.leftSec < 60 ? "disabled" : ""}>Play for more time</button>` : ""}
      </section>
      <button class="btn ghost" data-a="closeBlock">Not now</button>
    </div>`;
  };

  Object.assign(App.act, {
    stake(d) {
      const n = ui.game === "roulette" ? Math.max(1, (ui.rbets || []).length) : 1, l = stakeLimit();
      const next = Number(d.d) > 0 ? ui.stake + stepUp() : ui.stake - stepDown();
      if (Number(d.d) > 0 && l && next * n > l.leftSec) return;
      ui.stake = next; clampStake(); App.chipFx(); App.renderControls();
    },
    stakeCycle() {
      const apps = stakeable(); if (apps.length < 2 || ui.busy || ui.round) return;
      const i = apps.findIndex(a => a.pkg === ui.stakePkg);
      ui.stakePkg = apps[(i + 1) % apps.length].pkg; clampStake();
      App.chipFx(); App.renderControls(); App.toast(`Staking ${App.labelOf(ui.stakePkg)} time.`);
    },
    game(d) { ui.game = d.id; ui.view = "game"; App.render(); },
    leave() { if (ui.busy || ui.round) return; ui.view = "tables"; ui.game = null; App.render(); },
    coinPick(d) { ui.pick = d.v; App.chipFx(); App.renderControls(); },
    rToggle(d) {
      if (!G.isRouletteBet(d.v)) return;
      const cur = ui.rbets || [];
      ui.rbets = cur.includes(d.v) ? cur.filter(b => b !== d.v) : [...cur, d.v];
      App.chipFx(); App.renderControls();
    },
    rClear() { ui.rbets = []; App.chipFx(); App.renderControls(); },
    rTab(d) { ui.rTab = d.v === "numbers" ? "numbers" : "outside"; App.chipFx(); App.renderControls(); },
    coinFlip: guarded(coinFlip), rSpin: guarded(rSpin), sSpin: guarded(sSpin),
    bjDeal: guarded(bjDeal), bjHit: guarded(bjHit), bjStand: guarded(bjStand),
    bjDouble: guarded(bjDouble), pDeal: guarded(pDeal), pDraw: guarded(pDraw),
    pickOpen(d) { ui.openPick = Number(d.v); App.chipFx(); App.render(); },
    openApp() {
      if (!A.open(App.CTX.pkg, ui.openPick)) { App.toast("Couldn't open that app. It may have been uninstalled."); return; }
      App.refresh(); App.render();
    },
    toTables() { ui.view = "tables"; App.render(); },
    toBlock() { ui.view = "block"; ui.game = null; App.render(); },
    closeBlock() { A.closeBlock(); },
    openAnte() { A.openAnte(); },
  });
})();
