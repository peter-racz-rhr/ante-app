/* Product scenes: small animated shots of Ante's own screens, used by onboarding, the Focus and
   Strict explainers and "How Ante works" in Settings. Built to the stageshow rules: Ante's real
   UI as the hero, one thing happening, real words only on the subject, every motion with a
   cause, a poster frame that tells the story on its own, and loops that reset with a cause.
   Each scene is HTML plus a timeline; App.Scenes.run(root) starts the ones inside root. */
(function () {
  "use strict";
  const App = window.App;
  const esc = App.esc;
  const ICON = () => App.ICON;
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny timeline: beats at times in ms, looping; stops when the scene leaves ---------- */
  function play(el, loopMs, beats) {
    if (el.__scene) return;
    el.__scene = true;
    let timers = [];
    // A scene is hidden from screen readers itself, so look at its parents: an inactive slide waits.
    const alive = () => el.isConnected && !el.closest(".ob-slide[aria-hidden='true']");
    const run = () => {
      timers.forEach(clearTimeout); timers = [];
      if (!el.isConnected) { el.__scene = false; return; }
      if (!alive()) { timers.push(setTimeout(run, 600)); return; } // an off-screen slide waits
      beats.forEach(([t, f]) => timers.push(setTimeout(() => { if (el.isConnected) f(el); }, t)));
      timers.push(setTimeout(run, loopMs));
    };
    run();
  }
  const beat = (el, n) => { el.dataset.beat = String(n); };

  /** Rolls only the characters that changed (stageshow: change only what changed). */
  function roll(el, next, dir, ms) {
    const dur = ms || 500;
    const prev = el.textContent;
    if (prev === next) return;
    if (reduced() || prev.length !== next.length) { el.textContent = next; return; }
    el.innerHTML = [...next].map((c, i) => c === prev[i] ? esc(c)
      : `<span class="rl ${dir < 0 ? "down" : "up"}" style="--rd:${dur}ms"><span>${esc(prev[i])}</span><span>${esc(c)}</span></span>`).join("");
    clearTimeout(el.__roll);
    el.__roll = setTimeout(() => { el.textContent = next; }, dur + 40);
  }
  const mmss = s => `${Math.floor(s / 60)}:${App.pad(s % 60)}`;

  /* ---------- shared pieces ---------- */
  // A social feed: avatars and photo tiles carry the genre; the words are filler bars.
  const HUES = [["#f97316", "#db2777"], ["#0ea5e9", "#6366f1"], ["#22c55e", "#0d9488"], ["#eab308", "#ef4444"], ["#a855f7", "#3b82f6"]];
  const post = (i) => `<div class="sc-post"><span class="sc-av" style="--c:${HUES[i % 5][0]}"></span><b style="width:${[46, 34, 52, 40, 30][i % 5]}%"></b>
      <span class="sc-photo" style="--a:${HUES[i % 5][0]};--b:${HUES[i % 5][1]}"></span><b class="short" style="width:${[62, 48, 70, 55, 44][i % 5]}%"></b></div>`;
  const feed = () => `<div class="sc-app"><div class="sc-appbar"><b style="width:38%"></b><i></i><i></i></div>
      <div class="sc-track"><div class="sc-feed">${[0, 1, 2, 3, 4].map(post).join("")}${[0, 1, 2, 3, 4].map(post).join("")}</div></div></div>`;

  /* ---------- 1. "Your feed never ends": the budget runs out while the feed keeps going ---------- */
  function sFeed() {
    return `<div class="sc sc-feedscene" data-scene="feed" data-beat="0" aria-hidden="true">${feed()}
      <div class="sc-chip"><span class="sc-chip-l">Instagram</span><span class="sc-chip-v dotnum" data-v>0:30</span><span class="sc-chip-s">left today</span></div></div>`;
  }
  function runFeed(el) {
    const v = el.querySelector("[data-v]");
    if (reduced()) { beat(el, 2); v.textContent = "0:00"; return; }
    let left = 30;
    play(el, 10000, [
      [0, e => { beat(e, 0); left = 30; v.textContent = "0:30"; }],
      ...Array.from({ length: 30 }, (_, k) => [600 + k * 190, () => { left--; roll(v, mmss(left), -1, 150); }]),
      [6400, e => beat(e, 2)],      // time's up: the chip turns red, the feed stops
      [9100, e => beat(e, 3)],      // the chip leaves (a new day brings a new one)
    ]);
  }

  /* ---------- 2. "The app is covered": Ante's block screen rises over the feed ---------- */
  function sCover() {
    return `<div class="sc sc-coverscene" data-scene="cover" data-beat="0" aria-hidden="true">${feed()}
      <div class="sc-sheet"><span class="sc-eyebrow">Daily limit reached</span><span class="sc-title">Instagram is done for today</span>
        <span class="sc-clock dotnum">0:00</span><span class="sc-btn" data-press>Back to home screen</span></div></div>`;
  }
  function runCover(el) {
    if (reduced()) { beat(el, 2); return; }
    play(el, 9000, [
      [0, e => beat(e, 0)],
      [1500, e => beat(e, 1)],      // the feed stops
      [1700, e => beat(e, 2)],      // the block screen rises over it
      [5600, e => beat(e, 3)],      // press "Back to home screen"
      [6000, e => beat(e, 4)],      // the app goes home: everything leaves together
      [6700, e => beat(e, 5)],      // relaunched, the feed fades back in
    ]);
  }

  /* ---------- 3. "Bet the minutes": a spin, the win flies into the app's budget ---------- */
  function sBet() {
    return `<div class="sc sc-betscene" data-scene="bet" data-beat="0" aria-hidden="true">
      <div class="sc-table"><div class="sc-felt"><span class="sc-wheel" data-wheel></span><span class="sc-win" data-win>+5:00</span></div>
        <div class="sc-stake"><span class="sc-step">−</span><span class="sc-stakev dotnum">5:00</span><span class="sc-step">+</span><span class="sc-btn sc-spin" data-press>Spin 5:00</span></div></div>
      <div class="sc-limit" data-limit><span class="sc-limit-l">Instagram</span><span class="sc-limit-v dotnum" data-v>3:00</span></div></div>`;
  }
  function runBet(el) {
    const v = el.querySelector("[data-v]"), wheel = el.querySelector("[data-wheel]"), win = el.querySelector("[data-win]");
    if (App.FX && App.FX.miniWheel && !wheel.firstChild) App.FX.miniWheel(wheel);
    if (reduced()) { beat(el, 4); v.textContent = "8:00"; return; }
    let total = 180, round = 0, turn = 0;
    play(el, 9800, [
      [0, e => { beat(e, 0); if (total > 1500) { total = 180; v.textContent = mmss(total); } }],
      [900, e => beat(e, 1)],                                   // press Spin
      [1100, e => { beat(e, 2); turn += 720 + 137; wheel.style.transform = `rotate(${turn}deg)`; }],
      [3900, e => {                                             // the result lands on the felt
        const won = round % 3 !== 2; win.textContent = won ? "+5:00" : "−1:00"; win.classList.toggle("lose", !won); beat(e, 3);
      }],
      [4700, e => {                                             // it flies into Instagram's budget
        const a = win.getBoundingClientRect(), b = el.querySelector("[data-limit]").getBoundingClientRect();
        win.style.setProperty("--fx", `${b.left + b.width * 0.62 - (a.left + a.width / 2)}px`);
        win.style.setProperty("--fy", `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
        beat(e, 4);
      }],
      [5300, e => { const won = !win.classList.contains("lose"); total += won ? 300 : -60; roll(v, mmss(total), won ? 1 : -1); e.dataset.res = won ? "win" : "lose"; beat(e, 5); round++; }],
      [8600, e => { delete e.dataset.res; beat(e, 6); }],     // the chip is spent; ready for the next spin
    ]);
  }

  /* ---------- Strict 1: Settings gets covered behind a wait ---------- */
  function sStrictLock() {
    const row = (ic, label, w) => `<div class="sc-row"><span class="sc-ic">${ICON()[ic] || ""}</span>${label ? `<span class="sc-row-t">${label}</span>` : `<b style="width:${w}%"></b>`}<i class="sc-chev">${ICON().chev}</i></div>`;
    return `<div class="sc sc-small sc-strictlock" data-scene="strictlock" data-beat="0" aria-hidden="true">
      <div class="sc-app sc-settings"><div class="sc-apptitle">Settings</div>${row("gear", "", 44)}${row("shield", "Accessibility", 0)}${row("trash", "", 36)}${row("battery", "", 50)}</div>
      <div class="sc-sheet small"><span class="sc-lock">${ICON().lock}</span><span class="sc-title">Settings is locked</span>
        <span class="sc-wait"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle class="p" cx="18" cy="18" r="15"/></svg><span class="dotnum" data-v>30</span></span></div></div>`;
  }
  function runStrictLock(el) {
    const v = el.querySelector("[data-v]");
    if (reduced()) { beat(el, 2); return; }
    play(el, 8000, [
      [0, e => { beat(e, 0); v.textContent = "30"; }],
      [900, e => beat(e, 1)],       // someone opens Accessibility
      [1300, e => beat(e, 2)],      // Ante covers it, the wait starts
      ...[29, 28, 27, 26, 25, 24, 23, 22].map((n, k) => [2000 + k * 600, () => roll(v, String(n), -1)]),
      [7200, e => beat(e, 3)],      // they give up and leave
    ]);
  }

  /* ---------- Strict 2: a week locked, day by day, then it ends by itself ---------- */
  function sStrictDays() {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return `<div class="sc sc-small sc-strictdays" data-scene="strictdays" data-beat="0" aria-hidden="true">
      <div class="sc-card"><div class="sc-card-h"><span class="sc-ic lock">${ICON().lock}</span><span class="sc-title">Strict mode</span><span class="sc-state" data-state>Locked · 7 days</span></div>
        <div class="sc-days">${days.map((d, i) => `<span class="sc-day" style="--i:${i}"><i></i><b>${d}</b></span>`).join("")}</div></div></div>`;
  }
  function runStrictDays(el) {
    const s = el.querySelector("[data-state]");
    if (reduced()) { beat(el, 2); s.textContent = "Ended by itself"; return; }
    play(el, 7400, [
      [0, e => { beat(e, 0); s.textContent = "Locked · 7 days"; }],
      [500, e => beat(e, 1)],                                  // the days pass, one by one
      [3600, e => { beat(e, 2); s.textContent = "Ended by itself"; }], // the lock opens on its own (payoff holds 2.8 s)
      [6400, e => beat(e, 3)],                                 // a new week starts: the card fades, then returns empty
    ]);
  }

  /* ---------- Focus 1: every limited app gets covered, time left or not ---------- */
  function sFocusCover() {
    const rows = [["Instagram", "14:00"], ["TikTok", "30:00"], ["YouTube", "25:20"]];
    return `<div class="sc sc-small sc-focuscover" data-scene="focuscover" data-beat="0" aria-hidden="true">
      <div class="sc-app sc-limits"><div class="sc-apptitle">Limits</div>${rows.map(([n, t], i) => `<div class="sc-lrow" style="--i:${i}"><span class="sc-row-t">${n}</span><span class="dotnum">${t}</span>
        <span class="sc-cover"><i>${ICON().moon}</i>Focus</span></div>`).join("")}</div></div>`;
  }
  function runFocusCover(el) {
    if (reduced()) { beat(el, 1); return; }
    play(el, 7600, [[0, e => beat(e, 0)], [900, e => beat(e, 1)], [6000, e => beat(e, 2)]]);
  }

  /* ---------- Focus 2: the countdown on Home ---------- */
  function sFocusClock() {
    return `<div class="sc sc-small sc-focusclock" data-scene="focusclock" aria-hidden="true">
      <div class="sc-card"><div class="sc-card-h"><span class="sc-ic moon">${ICON().moon}</span><span class="sc-title">Focus</span><span class="sc-state">Ends 18:30</span></div>
        <span class="sc-bigclock dotnum" data-v>25:00</span></div></div>`;
  }
  function runFocusClock(el) {
    const v = el.querySelector("[data-v]");
    if (reduced()) return;
    let s = 1500;
    play(el, 1000, [[0, () => { s = s > 1 ? s - 1 : 1500; roll(v, mmss(s), -1); }]]);
  }

  const RUN = { feed: runFeed, cover: runCover, bet: runBet, strictlock: runStrictLock, strictdays: runStrictDays, focuscover: runFocusCover, focusclock: runFocusClock };
  App.Scenes = {
    feed: sFeed, cover: sCover, bet: sBet, strictLock: sStrictLock, strictDays: sStrictDays, focusCover: sFocusCover, focusClock: sFocusClock,
    /** Starts every scene inside root that isn't running yet. */
    run(root) { (root || document).querySelectorAll("[data-scene]").forEach(el => { const f = RUN[el.dataset.scene]; if (f) f(el); }); },
  };

  /* ---------- "How Ante works" (Settings → About): the three onboarding scenes, captioned ---------- */
  const DEMO = [["1", "Give an app a daily budget"], ["2", "Over it? Ante covers the app"], ["3", "Bet minutes to win some back"]];
  App.howItWorks = (step) => {
    const i = Math.max(0, Math.min(2, step || 0)), scene = [sFeed, sCover, sBet][i]();
    return `<section class="sgroup-wrap"><h2 class="sgroup-label">How Ante works</h2>
      <div class="sgroup how" id="how">
        <div class="how-stage">${scene}</div>
        <div class="how-foot"><div class="how-steps" role="tablist" aria-label="Steps">${DEMO.map(([n, t], k) => `<button role="tab" class="how-step" data-a="howStep" data-v="${k}" aria-selected="${k === i}"><b>${n}</b><span>${esc(t)}</span></button>`).join("")}</div></div>
      </div></section>`;
  };
  let howTimer = 0;
  App.afterHow = () => {
    const box = document.getElementById("how"); if (!box) { clearTimeout(howTimer); return; }
    App.Scenes.run(box);
    clearTimeout(howTimer);
    if (reduced()) return;
    const cur = Number((box.querySelector('[aria-selected="true"]') || {}).dataset ? box.querySelector('[aria-selected="true"]').dataset.v : 0);
    howTimer = setTimeout(() => App.act.howStep({ v: String((cur + 1) % 3), auto: true }), [10000, 9000, 9800][cur]);
  };
  Object.assign(App.act, {
    howStep(d) {
      const box = document.getElementById("how"); if (!box) return;
      const i = Number(d.v) || 0;
      box.querySelector(".how-stage").innerHTML = [sFeed, sCover, sBet][i]();
      box.querySelectorAll(".how-step").forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
      App.afterHow();
    },
  });
})();
