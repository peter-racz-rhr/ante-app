/* Five more tables: Plinko, Crash, Baccarat, Keno and Dice. Every round is decided by A.play
   (natively on the phone, since 0.9.0) and only animated here. They plug into tables.js through
   App.extraGames: mount(el) builds the felt, controls(locked) the panel under it. */
(function () {
  "use strict";
  const App = window.App, A = App.A, G = App.G, FX = App.FX, esc = App.esc, ui = App.ui;
  const T = () => App.Tables; // round helpers from tables.js (start, begin, finish, stakeRow)
  const sleep = ms => new Promise(r => setTimeout(r, FX.reduced() ? 0 : ms));
  const mul = m => `${Number.isInteger(m) ? m : m.toFixed(m < 10 ? 2 : 1).replace(/0$/, "")}×`;

  /* ---------- Plinko ---------- */
  const PL_ROWS = G.PLINKO_ROWS, PL_SLOTS = PL_ROWS + 1, PL_STEP = 100 / (PL_SLOTS + 1);
  const pegX = (r, i) => 50 + (i - r / 2) * PL_STEP;
  const heat = m => (m >= 10 ? "hot" : m >= 2 ? "warm" : m >= 1 ? "even" : "cold");
  function Plinko(el) {
    let pegs = "";
    for (let r = 0; r < PL_ROWS; r++) for (let i = 0; i <= r + 2; i++) pegs += `<i class="peg" style="left:${pegX(r + 2, i)}%;top:${((r + 1) / (PL_ROWS + 1)) * 100}%"></i>`;
    el.innerHTML = `<div class="plk"><div class="plk-board" aria-hidden="true">${pegs}<span class="plk-ball"></span></div>
      <div class="plk-slots">${G.PLINKO_PAYS.map((m, k) => `<span class="plk-slot ${heat(m)}" data-k="${k}">${mul(m)}</span>`).join("")}</div></div>`;
    const ball = el.querySelector(".plk-ball"), slots = [...el.querySelectorAll(".plk-slot")];
    return {
      async drop(path) {
        slots.forEach(s => s.classList.remove("hit"));
        let x = 50, k = 0;
        const frames = [{ left: "50%", top: "-4%" }];
        path.forEach((dir, r) => {
          k += dir; x = 50 + (k - (r + 1) / 2) * PL_STEP;
          frames.push({ left: `${x}%`, top: `${((r + 1.6) / (PL_ROWS + 1)) * 100}%`, easing: "cubic-bezier(.3,0,.6,1)" });
        });
        frames.push({ left: `${x}%`, top: "100%" });
        ball.style.opacity = "1";
        const per = FX.reduced() ? 0 : 120;
        let ticks = 0; const tick = setInterval(() => { if (++ticks <= PL_ROWS) { App.haptic("tick"); App.SFX.play("chip"); } else clearInterval(tick); }, per || 1);
        const anim = ball.animate(frames, { duration: Math.max(1, per * (PL_ROWS + 2)), fill: "forwards" });
        await anim.finished.catch(() => {});
        clearInterval(tick);
        const s = slots[path.reduce((a, b) => a + b, 0)];
        if (s) s.classList.add("hit");
      },
    };
  }

  /* ---------- Crash ---------- */
  function Crash(el) {
    el.innerHTML = `<div class="crash"><svg class="crash-plot" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">
        <path class="crash-area" d="M0 150 L0 150 Z"/><path class="crash-line" d="M0 150"/></svg>
      <p class="crash-x dotnum" id="crash-x">1.00×</p><p class="crash-note" id="crash-note"></p></div>`;
    const x = el.querySelector("#crash-x"), note = el.querySelector("#crash-note"), line = el.querySelector(".crash-line"), area = el.querySelector(".crash-area"), box = el.querySelector(".crash");
    return {
      async launch(point, target) {
        box.classList.remove("crashed", "cashed"); note.textContent = "";
        const k = Math.max(0.35, Math.log(point) / 5); // growth rate: a long flight takes at most ~5 s
        const total = Math.log(point) / k * 1000, t0 = performance.now();
        let cashed = false;
        await new Promise(res => {
          const step = now => {
            const t = FX.reduced() ? total : Math.min(total, now - t0), m = Math.min(point, Math.exp(k * t / 1000));
            x.textContent = `${m.toFixed(2)}×`;
            if (!cashed && m >= target) { cashed = true; box.classList.add("cashed"); note.textContent = `Cashed out at ${target.toFixed(2)}×`; App.haptic("win"); }
            const pts = [], n = 40;
            for (let i = 0; i <= n; i++) { const tt = (t * i) / n, mm = Math.exp(k * tt / 1000); pts.push(`${(300 * i / n).toFixed(1)} ${(150 - Math.min(140, (mm - 1) / Math.max(1, m - 1 || 1) * 120)).toFixed(1)}`); }
            line.setAttribute("d", `M${pts.join(" L")}`); area.setAttribute("d", `M0 150 L${pts.join(" L")} L300 150 Z`);
            if (t < total) requestAnimationFrame(step); else res();
          };
          requestAnimationFrame(step);
        });
        box.classList.add("crashed"); App.SFX.play("lose");
        if (!cashed) note.textContent = `Crashed before ${target.toFixed(2)}×`;
      },
    };
  }

  /* ---------- Dice ---------- */
  function Dice(el) {
    el.innerHTML = `<div class="dice"><p class="dice-roll dotnum" id="dice-roll">50.00</p>
      <div class="dice-bar" aria-hidden="true"><i class="dice-win" id="dice-win"></i><span class="dice-mark" id="dice-mark"></span></div>
      <div class="dice-ticks" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div></div>`;
    const roll = el.querySelector("#dice-roll"), mark = el.querySelector("#dice-mark");
    const api = {
      setUnder(u) { const w = el.querySelector("#dice-win"); if (w) w.style.width = `${u}%`; },
      async roll(value, under) {
        el.querySelector(".dice").classList.remove("won", "lost");
        const end = performance.now() + (FX.reduced() ? 0 : 700);
        while (performance.now() < end) { roll.textContent = (Math.random() * 100).toFixed(2); App.haptic("tick"); await sleep(55); }
        roll.textContent = value.toFixed(2);
        mark.style.left = `${value}%`; mark.classList.add("on");
        el.querySelector(".dice").classList.add(value < under ? "won" : "lost");
      },
    };
    api.setUnder(ui.dUnder);
    return api;
  }

  /* ---------- Baccarat ---------- */
  function Baccarat(el) {
    const side = (s, label) => `<div class="bac-side" data-s="${s}"><p class="bac-h"><span>${label}</span><b class="bac-t" id="bac-${s}">0</b></p><div class="bac-row" id="bac-row-${s}"></div></div>`;
    el.innerHTML = `<div class="bac"><p class="bac-rule">Banker draws by the third-card rules</p>${side("banker", "Banker")}${side("player", "Player")}<p class="bac-banner" id="bac-banner"></p></div>`;
    const put = async (s, c, cards) => {
      const row = el.querySelector(`#bac-row-${s}`), d = document.createElement("div");
      d.innerHTML = FX.cardHtml(c, true); const card = d.firstElementChild; card.classList.add("bac-in");
      row.appendChild(card); App.haptic("tap"); App.SFX.play("deal");
      el.querySelector(`#bac-${s}`).textContent = G.bacTotal(cards);
      await sleep(380);
    };
    return {
      async deal(p, b, winner) {
        ["banker", "player"].forEach(s => { el.querySelector(`#bac-row-${s}`).innerHTML = ""; el.querySelector(`#bac-${s}`).textContent = "0"; });
        el.querySelector("#bac-banner").textContent = "";
        el.querySelectorAll(".bac-side").forEach(x => x.classList.remove("win"));
        await put("player", p[0], p.slice(0, 1)); await put("banker", b[0], b.slice(0, 1));
        await put("player", p[1], p.slice(0, 2)); await put("banker", b[1], b.slice(0, 2));
        if (p[2]) await put("player", p[2], p);
        if (b[2]) await put("banker", b[2], b);
        if (winner !== "tie") el.querySelector(`.bac-side[data-s="${winner}"]`).classList.add("win");
        el.querySelector("#bac-banner").textContent = winner === "tie" ? "Tie" : `${winner === "player" ? "Player" : "Banker"} wins`;
      },
    };
  }

  /* ---------- Keno ---------- */
  function Keno(el) {
    const cells = Array.from({ length: G.KENO_N }, (_, i) => i + 1).map(n => `<button class="kn" data-a="knPick" data-v="${n}" aria-pressed="false">${n}</button>`).join("");
    el.innerHTML = `<div class="keno"><div class="keno-grid" role="group" aria-label="Pick 5 numbers">${cells}</div></div>`;
    const paint = () => el.querySelectorAll(".kn").forEach(b => { const on = (ui.kPicks || []).includes(Number(b.dataset.v)); b.setAttribute("aria-pressed", String(on)); });
    paint();
    return {
      paint,
      clearDraw() { el.querySelectorAll(".kn").forEach(b => b.classList.remove("drawn", "hit")); },
      async reveal(drawn) {
        this.clearDraw();
        for (const n of drawn) {
          const b = el.querySelector(`.kn[data-v="${n}"]`); if (!b) continue;
          b.classList.add("drawn"); if ((ui.kPicks || []).includes(n)) { b.classList.add("hit"); App.haptic("win"); App.SFX.play("chip"); } else App.haptic("tick");
          await sleep(170);
        }
      },
    };
  }

  /* ---------- controls ---------- */
  const chip = (act, v, on, label, extra, dis) => `<button class="chip" data-a="${act}" data-v="${v}" aria-pressed="${on}" ${dis}>${label}${extra ? `<span class="pays">${extra}</span>` : ""}</button>`;
  App.extraGames = {
    plinko: {
      mount: el => Plinko(el),
      controls: locked => `<p class="muted center xg-note">The ball bounces left or right at every peg. The edges pay the most.</p>${T().stakeRow(locked, "plDrop", { label: "Drop" })}`,
    },
    crash: {
      mount: el => Crash(el),
      controls: locked => {
        const dis = locked ? "disabled" : "", t = ui.crTarget;
        return `<p class="sblock-h xg-h">Cash out at</p>
          <div class="xg-chips six" role="group" aria-label="Cash out at">${G.CRASH_TARGETS.map(x => chip("crTarget", x, t === x, mul(x), "", dis)).join("")}</div>
          <p class="muted center xg-note">Wins ${(G.CRASH_EDGE / t * 100).toFixed(1)}% of rounds · pays ${mul(t)}</p>
          ${T().stakeRow(locked, "crGo", { label: "Launch" })}`;
      },
    },
    dice: {
      mount: el => Dice(el),
      controls: locked => {
        const u = ui.dUnder, m = G.diceMultiple(u);
        return `<label class="dice-set"><span>Roll under <b class="num" id="dice-u">${u}</b></span><span class="muted" id="dice-info">pays ${mul(m)} · wins ${u}%</span></label>
          <input id="dice-under" class="slider" type="range" min="${G.DICE_MIN}" max="${G.DICE_MAX}" step="1" value="${u}" aria-label="Roll under" style="--p:${(u - G.DICE_MIN) / (G.DICE_MAX - G.DICE_MIN) * 100}%" ${locked ? "disabled" : ""}>
          ${T().stakeRow(locked, "dcRoll", { label: "Roll" })}`;
      },
    },
    baccarat: {
      mount: el => Baccarat(el),
      controls: locked => {
        const dis = locked ? "disabled" : "";
        return `<div class="xg-chips three" role="group" aria-label="Your bet">${Object.entries(G.BACCARAT_BETS).map(([id, b]) => chip("bcBet", id, ui.bcBet === id, b.label, `${b.multiple}×`, dis)).join("")}</div>
          ${T().stakeRow(locked, "bcDeal", { label: "Deal" })}`;
      },
    },
    keno: {
      mount: el => Keno(el),
      controls: locked => {
        const n = (ui.kPicks || []).length, dis = locked ? "disabled" : "";
        return `<p class="muted center xg-note">${G.KENO_PAYS.map((m, h) => (m ? `${h} hits ${mul(m)}` : "")).filter(Boolean).join(" · ")}</p>
          <div class="btn-row"><button class="btn quiet" data-a="knQuick" ${dis}>Quick pick</button><button class="btn quiet" data-a="knClear" ${n && !locked ? "" : "disabled"}>Clear</button></div>
          ${T().stakeRow(locked, "knDraw", { label: "Draw", empty: n < G.KENO_PICKS ? `Pick ${G.KENO_PICKS - n} more` : "" })}`;
      },
    },
  };
  App.extraGameDefaults = () => {
    if (!G.isCrashTarget(ui.crTarget)) ui.crTarget = 2;
    if (!(ui.dUnder >= G.DICE_MIN && ui.dUnder <= G.DICE_MAX)) ui.dUnder = 50;
    if (!G.BACCARAT_BETS[ui.bcBet]) ui.bcBet = "banker";
    if (!Array.isArray(ui.kPicks)) ui.kPicks = [];
  };

  /* ---------- rounds ---------- */
  const tbl = () => T().table();
  async function plDrop() {
    const r = A.play(ui.stakePkg, "plinko", ui.stake, {}); if (!T().start(r)) return;
    await T().begin(); await tbl().drop(r.path);
    T().finish(r, `${mul(G.PLINKO_PAYS[r.slot])}. `);
  }
  async function crGo() {
    const target = ui.crTarget, r = A.play(ui.stakePkg, "crash", ui.stake, { target }); if (!T().start(r)) return;
    await T().begin(); await tbl().launch(r.point, target);
    T().finish(r, r.point >= target ? `Cashed out at ${target.toFixed(2)}×. ` : `Crashed at ${r.point.toFixed(2)}×. `);
  }
  async function dcRoll() {
    const under = ui.dUnder, r = A.play(ui.stakePkg, "dice", ui.stake, { under }); if (!T().start(r)) return;
    await T().begin(); await tbl().roll(r.roll, under);
    T().finish(r, `Rolled ${r.roll.toFixed(2)}. `);
  }
  async function bcDeal() {
    const r = A.play(ui.stakePkg, "baccarat", ui.stake, { bet: ui.bcBet }); if (!T().start(r)) return;
    await T().begin(); await tbl().deal(r.p, r.b, r.winner);
    const pt = G.bacTotal(r.p), bt = G.bacTotal(r.b);
    T().finish(r, r.winner === "tie" ? `Tie at ${pt}. ` : r.winner === "player" ? `Player wins ${pt} to ${bt}. ` : `Banker wins ${bt} to ${pt}. `);
  }
  async function knDraw() {
    const picks = (ui.kPicks || []).slice(); if (picks.length !== G.KENO_PICKS) return;
    const r = A.play(ui.stakePkg, "keno", ui.stake, { picks }); if (!T().start(r)) return;
    await T().begin(); await tbl().reveal(r.drawn);
    T().finish(r, `${r.hits} ${r.hits === 1 ? "hit" : "hits"}. `);
  }

  // The dice slider: move it to set the number to roll under.
  document.addEventListener("input", e => {
    if (e.target.id !== "dice-under") return;
    const u = Math.max(G.DICE_MIN, Math.min(G.DICE_MAX, e.target.value | 0)); ui.dUnder = u;
    e.target.style.setProperty("--p", `${(u - G.DICE_MIN) / (G.DICE_MAX - G.DICE_MIN) * 100}%`);
    const a = document.getElementById("dice-u"), b = document.getElementById("dice-info");
    if (a) a.textContent = u; if (b) b.textContent = `pays ${mul(G.diceMultiple(u))} · wins ${u}%`;
    const t = tbl(); if (t && t.setUnder) t.setUnder(u);
    App.haptic("tick");
  });

  Object.assign(App.act, {
    plDrop: (...a) => T().guarded(plDrop)(...a),
    crGo: (...a) => T().guarded(crGo)(...a),
    dcRoll: (...a) => T().guarded(dcRoll)(...a),
    bcDeal: (...a) => T().guarded(bcDeal)(...a),
    knDraw: (...a) => T().guarded(knDraw)(...a),
    crTarget(d) { const t = Number(d.v); if (!G.isCrashTarget(t)) return; ui.crTarget = t; App.chipFx(); App.renderControls(); },
    bcBet(d) { if (!G.BACCARAT_BETS[d.v]) return; ui.bcBet = d.v; App.chipFx(); App.renderControls(); },
    knPick(d) {
      if (ui.busy) return;
      const n = Number(d.v), picks = ui.kPicks || (ui.kPicks = []);
      const i = picks.indexOf(n);
      if (i >= 0) picks.splice(i, 1); else if (picks.length < G.KENO_PICKS) picks.push(n); else { App.toast(`Pick ${G.KENO_PICKS} numbers at most.`); return; }
      const t = tbl(); if (t && t.clearDraw) { t.clearDraw(); t.paint(); }
      App.haptic("tap"); App.renderControls();
    },
    knQuick() {
      const pool = Array.from({ length: G.KENO_N }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      ui.kPicks = pool.slice(0, G.KENO_PICKS).sort((a, b) => a - b);
      const t = tbl(); if (t) { t.clearDraw(); t.paint(); }
      App.chipFx(); App.renderControls();
    },
    knClear() { ui.kPicks = []; const t = tbl(); if (t) { t.clearDraw(); t.paint(); } App.renderControls(); },
  });

  /* ---------- tiles and icons ---------- */
  const art = {
    plinko: () => { let d = ""; for (let r = 0; r < 5; r++) for (let i = 0; i <= r; i++) d += `<circle cx="${50 + (i - r / 2) * 16}" cy="${18 + r * 14}" r="3" fill="var(--ivory-3)"/>`;
      return `<svg viewBox="0 0 100 100" aria-hidden="true">${d}<circle cx="58" cy="44" r="6" fill="var(--accent)"/><rect x="10" y="86" width="16" height="9" rx="3" fill="#f38ba8"/><rect x="30" y="86" width="16" height="9" rx="3" fill="#fab387"/><rect x="54" y="86" width="16" height="9" rx="3" fill="#fab387"/><rect x="74" y="86" width="16" height="9" rx="3" fill="#f38ba8"/></svg>`; },
    crash: () => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 88 C40 86 60 70 86 18" fill="none" stroke="var(--win)" stroke-width="5" stroke-linecap="round"/><path d="M8 88 C40 86 60 70 86 18 L86 92 L8 92Z" fill="var(--win)" opacity=".15"/><circle cx="86" cy="18" r="7" fill="var(--ivory)"/></svg>`,
    baccarat: () => `<div class="mini-cards">${FX.cardHtml({ r: 9, s: 1 }, true).replace('class="card up"', 'class="card up" style="left:6px;top:8px;transform:rotate(-10deg)"')}${FX.cardHtml({ r: 13, s: 0 }, true).replace('class="card up"', 'class="card up" style="left:40px;top:4px;transform:rotate(8deg)"')}</div>`,
    keno: () => { let d = ""; const hot = [3, 6, 9, 12, 14]; for (let i = 0; i < 16; i++) d += `<rect x="${10 + (i % 4) * 21}" y="${10 + Math.floor(i / 4) * 21}" width="17" height="17" rx="5" fill="${hot.includes(i) ? "var(--accent)" : "var(--surface-3)"}"/>`; return `<svg viewBox="0 0 100 100" aria-hidden="true">${d}</svg>`; },
    dice: () => `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="12" y="30" width="40" height="40" rx="9" fill="#f5f5f5" transform="rotate(-12 32 50)"/><rect x="48" y="26" width="40" height="40" rx="9" fill="var(--accent)" transform="rotate(10 68 46)"/>
      <g fill="#111"><circle cx="24" cy="44" r="3.6"/><circle cx="33" cy="51" r="3.6"/><circle cx="41" cy="58" r="3.6"/></g><g fill="#111"><circle cx="61" cy="37" r="3.6"/><circle cx="76" cy="40" r="3.6"/><circle cx="59" cy="52" r="3.6"/><circle cx="74" cy="55" r="3.6"/></g></svg>`,
  };
  Object.assign(FX.GAME_ART, art);
  const icon = FX.GAME_ICON;
  const ic = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
  const ICONS = { plinko: ic('<circle cx="12" cy="5" r="1.5"/><circle cx="8" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="12" cy="15" r="1.5"/><path d="M4 20h16"/>'),
    crash: ic('<path d="M4 20c6 0 10-4 15-15"/><path d="M4 20h16"/>'), baccarat: ic('<rect x="4" y="5" width="9" height="13" rx="2"/><rect x="11" y="6" width="9" height="13" rx="2"/>'),
    keno: ic('<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>'),
    dice: ic('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r=".8" fill="currentColor"/><circle cx="15" cy="15" r=".8" fill="currentColor"/>') };
  FX.GAME_ICON = id => ICONS[id] || icon(id);
})();
