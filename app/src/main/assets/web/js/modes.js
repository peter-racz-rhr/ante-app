/* Focus and Strict mode: a three-step animated explainer for each (what it is, how it works,
   how long), the rows in Profile, the Focus banner on Home and the Focus block screen.
   The native side enforces both; this file only explains them and asks for a duration. */
(function () {
  "use strict";
  const App = window.App;
  const { A, esc } = App;
  const ui = App.ui;

  // Picked on a scroll wheel: Strict 1 to 31 days, Focus 5 min to 12 h in 5-minute steps.
  const STRICT_DEFAULT = 7, FOCUS_DEFAULT = 25;
  const FOCUS_MIN = 5, FOCUS_MAX = 720;
  const strictLabel = d => d === 7 ? "1 week" : `${d} ${d === 1 ? "day" : "days"}`;
  const focusLabel = m => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${r} min` : ""}` : `${r} min`; };
  const pickOf = sh => sh.pick || (sh.mode === "strict" ? STRICT_DEFAULT : FOCUS_DEFAULT);
  const endsOf = sh => Date.now() + (sh.mode === "strict" ? pickOf(sh) * DAY : pickOf(sh) * 60000);
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
    return `${d.toLocaleDateString(App.locale(), { weekday: "short", day: "numeric", month: "short" })}, ${clock(d)}`;
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
    // focusEndsAt (0.6.0+) also counts scheduled windows; older apps only send focusUntilMs.
    const strictUntil = S.strictUntilMs || 0, focusUntil = S.focusEndsAt || S.focusUntilMs || 0;
    return {
      strict: S.strictActive != null ? !!S.strictActive : !!S.strict,
      strictUntil: strictUntil > now ? strictUntil : 0,
      focus: S.focusActive != null ? !!S.focusActive : focusUntil > now,
      focusUntil: focusUntil > now ? focusUntil : 0,
      scheduled: !!S.scheduleActive,
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
    const strict = sh.mode === "strict", v = pickOf(sh);
    const wheel = strict
      ? App.wheels([{ id: "days", aria: "Days", values: Array.from({ length: 31 }, (_, k) => k + 1), label: String, value: v, unit: v === 1 ? "day" : "days" }])
      : App.wheels([
        { id: "h", aria: "Hours", values: Array.from({ length: 13 }, (_, k) => k), label: String, value: Math.floor(v / 60), unit: "h" },
        { id: "m", aria: "Minutes", values: Array.from({ length: 12 }, (_, k) => k * 5), label: n => App.pad(n), value: v % 60, unit: "min" },
      ]);
    return `<div class="ex-choose">${wheel}
      <p class="ex-ends" id="ex-ends">${endsLine(sh)}</p>
      ${strict ? `<p class="muted ex-warn">${App.ICON.info}<span>You won't be able to turn this off early, not even after a wait.</span></p>` : ""}
    </div>`;
  }
  function endsLine(sh) {
    const m = App.modes(), ends = endsOf(sh);
    return sh.mode === "strict" && m.strict && m.strictUntil > ends
      ? `Already locked until <b>${esc(when(m.strictUntil))}</b>. A shorter lock won't cut it.`
      : `Ends <b>${esc(when(ends))}</b>`;
  }
  const goLabel = sh => sh.mode === "strict" ? `Lock · ${strictLabel(pickOf(sh))}` : `Start · ${focusLabel(pickOf(sh))}`;

  /** Wheel turned: keep the value valid and update the end time and button in place. */
  App.wheelHandlers = App.wheelHandlers || {};
  App.wheelHandlers.explain = App.exWheel = (id, val) => {
    const sh = ui.sheet; if (!sh || sh.type !== "explain") return;
    const box = App.$overlay;
    if (sh.mode === "strict") sh.pick = val;
    else {
      let h = id === "h" ? val : Math.floor(pickOf(sh) / 60), m = id === "m" ? val : pickOf(sh) % 60;
      if (h === 12 && m) { m = 0; App.setWheel(box, "m", 0); }       // 12 h is the longest Focus
      if (!h && m < FOCUS_MIN) { m = FOCUS_MIN; App.setWheel(box, "m", FOCUS_MIN); }
      sh.pick = Math.max(FOCUS_MIN, Math.min(FOCUS_MAX, h * 60 + m));
    }
    const ends = box.querySelector("#ex-ends"); if (ends) ends.innerHTML = endsLine(sh);
    const go = box.querySelector('[data-a="exGo"]'); if (go) go.textContent = goLabel(sh);
    const unit = box.querySelector('[data-unit="days"]'); if (unit) unit.textContent = pickOf(sh) === 1 ? "day" : "days";
  };

  /** The explainer sheet (registered with the sheet renderer in app.js). */
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.explain = (sh, sheet, head) => {
    const steps = STEPS[sh.mode], i = sh.step || 0, s = steps[i], last = i === steps.length - 1;
    const strict = sh.mode === "strict";
    const label = goLabel(sh);
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
      <p class="muted fc-note">${m.scheduled ? `Scheduled. ${esc(App.scheduleLine ? App.scheduleLine() : "")}` : "Every limited app stays covered until then."}</p></section>`;
    return `<section class="panel focus-card" aria-labelledby="focus-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#a78bfa" aria-hidden="true">${App.ICON.moon}</span><div><h2 class="h3" id="focus-h">Focus</h2><p class="muted">Cover every limited app for a while</p></div></div>
        <button class="btn-sm" data-a="explain" data-v="focus">Start</button></div>${App.scheduleButton ? App.scheduleButton() : ""}</section>`;
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
    exGo() {
      const sh = ui.sheet; if (!sh || sh.type !== "explain") return;
      if (sh.mode === "strict") {
        const days = pickOf(sh);
        if (!A.startStrict || !A.startStrict(days)) { App.toast("Install the new app version (0.5.0) for timed Strict mode."); return; }
        App.refresh(); ui.sheet = null; App.render(); App.haptic("win");
        App.toast(`Strict mode is on until ${when(App.modes().strictUntil)}.`);
      } else {
        const min = pickOf(sh);
        if (!A.startFocus || !A.startFocus(min)) { App.toast("Install the new app version (0.5.0) to use Focus."); return; }
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
