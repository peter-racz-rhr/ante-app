/* Focus and Strict mode: a three-step animated explainer for each (what it is, how it works,
   how long), the rows in Profile, the Focus banner on Home and the Focus block screen.
   The native side enforces both; this file only explains them and asks for a duration. */
(function () {
  "use strict";
  const App = window.App;
  const { A, esc } = App;
  const ui = App.ui;

  const STRICT_CHOICES = [[1, "1 day"], [3, "3 days"], [7, "1 week"], [30, "1 month"]];
  const FOCUS_CHOICES = [[25, "25 min"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"]];
  const DAY = 86400000;

  /* ---------- time words ---------- */
  const pad = App.pad;
  const clock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  /** "18:30", "tomorrow 18:30" or "Sat 7 Nov, 18:30". */
  function when(ms) {
    const d = new Date(ms), now = new Date(), start = new Date(now); start.setHours(0, 0, 0, 0);
    const days = Math.floor((new Date(d).setHours(0, 0, 0, 0) - start) / DAY);
    if (days === 0) return clock(d);
    if (days === 1) return `tomorrow ${clock(d)}`;
    return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${clock(d)}`;
  }
  /** "42 min", "3 h 10 min", "2 days 4 h". */
  function span(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 1) return `${d} ${d === 1 ? "day" : "days"}${h % 24 ? ` ${h % 24} h` : ""}`;
    return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
  }

  App.modeWhen = when;

  /** Mode flags from the latest state (the native side computes them; older apps don't). */
  App.modes = () => {
    const S = App.S, now = S.now || Date.now();
    const strictUntil = S.strictUntilMs || 0, focusUntil = S.focusUntilMs || 0;
    return {
      strict: S.strictActive != null ? !!S.strictActive : !!S.strict,
      strictUntil: strictUntil > now ? strictUntil : 0,
      focus: S.focusActive != null ? !!S.focusActive : focusUntil > now,
      focusUntil: focusUntil > now ? focusUntil : 0,
      now,
    };
  };

  /* ---------- artwork: product scenes from js/scenes.js ---------- */
  const ART = {
    strict1: () => App.Scenes.strictLock(),
    strict2: () => App.Scenes.strictDays(),
    focus1: () => App.Scenes.focusCover(),
    focus2: () => App.Scenes.focusClock(),
  };

  const STEPS = {
    strict: [
      { art: "strict1", title: "Lock your blocking", body: "While Strict mode is on, Ante also covers Settings and the uninstall screen, so blocking can't be switched off on a whim." },
      { art: "strict2", title: "How it works", list: [
        "Settings opens after a 30-second wait, for 2 minutes at a time.",
        "Uninstalling Ante stays covered the whole time.",
        "There's no off switch until the time is up. Then it ends by itself.",
        "Quick settings keep working: Wi-Fi, the flashlight and emergency calls are never locked.",
      ] },
      { choose: "strict", title: "How long?" },
    ],
    focus: [
      { art: "focus1", title: "Focus", body: "Every app with a limit is covered for as long as you choose, even if it still has time left today." },
      { art: "focus2", title: "How it works", list: [
        "Opening a limited app shows the Focus screen instead.",
        "Minutes can't be spent on opening apps until Focus ends.",
        "Ending early takes a 30-second wait.",
        "While Strict mode is on, Focus always runs to the end.",
      ] },
      { choose: "focus", title: "How long?" },
    ],
  };

  function chooseStep(sh) {
    const strict = sh.mode === "strict", list = strict ? STRICT_CHOICES : FOCUS_CHOICES;
    const v = sh.pick || list[strict ? 2 : 0][0];
    const ends = Date.now() + (strict ? v * DAY : v * 60000);
    const m = App.modes();
    const extend = strict && m.strict && m.strictUntil > ends;
    return `<div class="ex-choose">
      <div class="chips ex-chips">${list.map(([n, t]) => `<button class="chip" data-a="exPick" data-v="${n}" aria-pressed="${v === n}">${t}</button>`).join("")}</div>
      <p class="ex-ends">${extend ? `Already locked until <b>${esc(when(m.strictUntil))}</b>. A shorter lock won't cut it.` : `Ends <b>${esc(when(ends))}</b>`}</p>
      ${strict ? `<p class="muted ex-warn">${App.ICON.info}<span>You won't be able to turn this off early, not even after a wait.</span></p>` : ""}
    </div>`;
  }

  /** The explainer sheet (registered with the sheet renderer in app.js). */
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.explain = (sh, sheet, head) => {
    const steps = STEPS[sh.mode], i = sh.step || 0, s = steps[i], last = i === steps.length - 1;
    const strict = sh.mode === "strict";
    const v = sh.pick || (strict ? STRICT_CHOICES[2][0] : FOCUS_CHOICES[0][0]);
    const label = strict ? `Lock · ${STRICT_CHOICES.find(c => c[0] === v)[1]}` : `Start · ${FOCUS_CHOICES.find(c => c[0] === v)[1]}`;
    return sheet("", `${head(strict ? "Strict mode" : "Focus", "ex-h")}
      ${sh.quick ? "" : `<div class="ex-dots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("")}</div>`}
      <div class="ex-step" data-step="${i}">
        ${s.art ? `<div class="ex-art ${s.art}" aria-hidden="true">${ART[s.art]()}</div>` : ""}
        <h3 class="h2 ex-title">${esc(s.title)}</h3>
        ${s.body ? `<p class="muted ex-body">${esc(s.body)}</p>` : ""}
        ${s.list ? `<ul class="ex-list">${s.list.map((t, k) => `<li style="--k:${k}">${App.ICON.check}<span>${esc(t)}</span></li>`).join("")}</ul>` : ""}
        ${s.choose ? chooseStep(sh) : ""}
      </div>
      ${sh.quick ? `<button class="link ex-replay" data-a="exIntro">${App.ICON.info}How it works</button>` : ""}
      <div class="btn-row">${sh.quick ? `<button class="btn quiet" data-a="closeSheet">Cancel</button>` : i ? `<button class="btn quiet" data-a="exBack">Back</button>` : `<button class="btn quiet" data-a="closeSheet">Not now</button>`}
        ${last ? `<button class="btn primary" data-a="exGo">${esc(label)}</button>` : `<button class="btn primary" data-a="exNext">Next</button>`}</div>`, "ex-h");
  };

  /* ---------- Profile rows (Blocking group) ---------- */
  App.modeItems = (item, status) => {
    const m = App.modes();
    const focus = m.focus
      ? item({ icon: "moon", tone: "#a78bfa", title: "Focus", sub: `Until ${esc(when(m.focusUntil))} · ${esc(span(m.focusUntil - m.now))} left`, trail: `<button class="btn-sm ghost" data-a="focusEnd" ${m.strict ? "disabled" : ""}>End</button>` })
      : item({ icon: "moon", tone: "#a78bfa", title: "Focus", sub: "Cover every limited app for a while", trail: `<button class="btn-sm" data-a="explain" data-v="focus">Start</button>` });
    let strict;
    if (m.strict && m.strictUntil) strict = item({ icon: "lock", tone: "#f59e0b", title: "Strict mode", sub: `Locked until ${esc(when(m.strictUntil))}`, trail: `<span class="pill lockd"><i></i>${esc(span(m.strictUntil - m.now))}</span>` });
    else if (m.strict) strict = item({ icon: "lock", tone: "#f59e0b", title: "Strict mode", sub: "On, with no end set", trail: App.toggle("strictOff", true, "Strict mode") });
    else strict = item({ icon: "lock", tone: "#f59e0b", title: "Strict mode", sub: "Lock blocking for a day, a week or a month", trail: `<button class="btn-sm" data-a="explain" data-v="strict">Turn on</button>` });
    return focus + strict;
  };

  /* ---------- Home ---------- */
  App.focusBanner = () => {
    const m = App.modes();
    if (!m.focus) return "";
    return `<section class="focus-banner" aria-live="polite">
      <span class="sicon" style="--ic:#a78bfa" aria-hidden="true">${App.ICON.moon}</span>
      <div class="sitem-t"><span class="sitem-title">Focus</span><span class="sitem-sub"><span data-until="${m.focusUntil}">${esc(span(m.focusUntil - m.now))}</span> left · ends ${esc(when(m.focusUntil))}</span></div>
      <button class="btn-sm ghost" data-a="focusEnd" ${m.strict ? "disabled" : ""}>End</button></section>`;
  };
  /** The Focus card on Home: start it, or watch it count down. */
  App.focusCard = () => {
    const m = App.modes();
    if (m.focus) return `<section class="panel focus-card on" aria-live="polite" aria-labelledby="focus-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#a78bfa" aria-hidden="true">${App.ICON.moon}</span><div><h2 class="h3" id="focus-h">Focus</h2><p class="muted">Ends ${esc(when(m.focusUntil))}</p></div></div>
        <button class="btn-sm ghost" data-a="focusEnd" ${m.strict ? "disabled" : ""}>End</button></div>
      <div class="dotclock-box"><p class="dotclock" data-fit="96" data-until-clock="${m.focusUntil}">${App.fmt(Math.max(0, Math.round((m.focusUntil - Date.now()) / 1000)))}</p></div>
      <p class="muted fc-note">Every limited app stays covered until then.</p></section>`;
    return `<section class="panel focus-card" aria-labelledby="focus-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#a78bfa" aria-hidden="true">${App.ICON.moon}</span><div><h2 class="h3" id="focus-h">Focus</h2><p class="muted">Cover every limited app for a while</p></div></div>
        <button class="btn-sm" data-a="explain" data-v="focus">Start</button></div></section>`;
  };
  App.focusChip = () => App.modes().focus ? "" : `<button class="chip-sm" data-a="explain" data-v="focus">${App.ICON.moon}Focus</button>`;

  /* ---------- block screen during Focus ---------- */
  App.focusBlock = (label) => {
    const m = App.modes(), until = m.focusUntil || (Date.now() + 60000);
    return `<div class="screen block" id="screen">
      <div class="block-top">${App.appIcon(App.CTX.pkg, "xl")}<p class="eyebrow">Focus</p><h1 class="h1">${label} is covered</h1></div>
      <div><div class="dotclock-box"><p class="dotclock" data-fit="140" data-until-clock="${until}">${App.fmt(Math.max(0, Math.round((until - Date.now()) / 1000)))}</p></div>
        <p class="muted">Focus ends ${esc(when(until))}. Every limited app opens again then.</p></div>
      <div class="grow"></div>
      <button class="btn primary" data-a="closeBlock">Back to home screen</button>
      <button class="btn ghost" data-a="openAnte">Open Ante</button></div>`;
  };

  /* Live countdowns ([data-until] text, [data-until-clock] dot clock). Re-renders once a mode ends. */
  setInterval(() => {
    const now = Date.now();
    document.querySelectorAll("[data-until]").forEach(el => { el.textContent = span(Number(el.dataset.until) - now); });
    let ended = false;
    document.querySelectorAll("[data-until-clock]").forEach(el => {
      const left = Number(el.dataset.untilClock) - now;
      if (left <= 0) ended = true;
      el.textContent = App.fmt(Math.max(0, Math.round(left / 1000)));
    });
    const m = App.S && App.modes();
    if (ended || (m && ((m.focusUntil && now >= m.focusUntil) || (m.strictUntil && now >= m.strictUntil)))) { App.refresh(); if (!ui.busy && !ui.round) App.render(); }
  }, 1000);

  /* ---------- actions ---------- */
  Object.assign(App.act, {
    explain(d) {
      if (d.v !== "strict" && d.v !== "focus") return;
      // The intro slides show once; after that the sheet opens straight on "How long?".
      const seen = !!(App.P.get().seenIntro || {})[d.v];
      ui.sheet = { type: "explain", mode: d.v, step: seen ? STEPS[d.v].length - 1 : 0, pick: null, quick: seen };
      App.SFX.play("tap"); App.paintOverlay();
    },
    exIntro() { const sh = ui.sheet; if (!sh || sh.type !== "explain") return; sh.quick = false; sh.step = 0; App.paintOverlay(); },
    exNext() {
      const sh = ui.sheet; if (!sh || sh.type !== "explain") return;
      sh.step = Math.min(STEPS[sh.mode].length - 1, (sh.step || 0) + 1);
      if (sh.step === STEPS[sh.mode].length - 1) App.P.set({ seenIntro: Object.assign({}, App.P.get().seenIntro, { [sh.mode]: true }) });
      App.haptic("tap"); App.paintOverlay();
    },
    exBack() { const sh = ui.sheet; if (!sh || sh.type !== "explain") return; sh.step = Math.max(0, (sh.step || 0) - 1); App.paintOverlay(); },
    exPick(d) { const sh = ui.sheet; if (!sh) return; sh.pick = Number(d.v); App.chipFx(); App.paintOverlay(); },
    exGo() {
      const sh = ui.sheet; if (!sh || sh.type !== "explain") return;
      if (sh.mode === "strict") {
        const days = sh.pick || STRICT_CHOICES[2][0];
        if (!A.startStrict || !A.startStrict(days)) { App.toast("Install the new app version (0.4.0) for timed Strict mode."); return; }
        App.refresh(); ui.sheet = null; App.render(); App.haptic("win");
        App.toast(`Strict mode is on until ${when(App.modes().strictUntil)}.`);
      } else {
        const min = sh.pick || FOCUS_CHOICES[0][0];
        if (!A.startFocus || !A.startFocus(min)) { App.toast("Install the new app version (0.4.0) to use Focus."); return; }
        App.refresh(); ui.sheet = null; App.render(); App.haptic("win");
        App.toast(`Focus is on until ${when(App.modes().focusUntil)}.`);
      }
    },
    focusEnd() {
      if (App.modes().strict) { App.toast("Strict mode is on, so Focus runs to the end."); return; }
      App.openWait({ title: "End Focus early", body: "Wait 30 seconds. If you still want to stop after that, you can.", cta: "End Focus", then: "focusEndNow" });
    },
    focusEndNow() {
      if (!A.endFocus()) { App.toast("The wait isn't over yet."); return; }
      App.refresh(); ui.sheet = null; App.render(); App.toast("Focus ended.");
    },
  });
})();
