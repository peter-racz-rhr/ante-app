/* Onboarding: four animated story slides (why Ante helps), then the setup itself: agree (18+),
   sign in, pick apps and a daily budget, schedule Focus for work and sleep, and turn on blocking.
   Swipe or tap Continue; Skip jumps from the story to the setup. */
(function () {
  "use strict";
  const App = window.App;
  const { A, esc } = App;
  const ui = App.ui;
  const SLIDES = 4; // story slides, then the setup steps below
  const OB = { agree: SLIDES, signin: SLIDES + 1, apps: SLIDES + 2, sched: SLIDES + 3, perm: SLIDES + 4 };
  const LAST = OB.perm;
  // Apps people usually want to limit, offered first when they're installed.
  const USUAL = ["com.instagram.android", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.google.android.youtube", "com.facebook.katana",
    "com.twitter.android", "com.reddit.frontpage", "com.snapchat.android", "com.pinterest", "com.netflix.mediaclient", "tv.twitch.android.app", "com.facebook.orca"];
  const SCHED = {
    work: { label: "Work", days: 31, startMin: 9 * 60, endMin: 17 * 60, icon: "clock", body: "Weekdays 09:00–17:00" },
    sleep: { label: "Sleep", days: 127, startMin: 22 * 60, endMin: 7 * 60, icon: "moon", body: "Every night 22:00–07:00" },
  };

  // Each slide shows Ante's own screens doing the thing the slide says (js/scenes.js).
  const feedArt = () => App.Scenes.feed();
  const budgetArt = () => App.Scenes.cover();
  const betArt = () => App.Scenes.bet();
  const focusArt = () => App.Scenes.focusCover();

  const STORY = [
    { art: feedArt, kicker: "Ante", title: "Your feed never ends.<br>Your day does.", body: "Apps are built to keep you scrolling. Ante gives each one a daily budget of minutes." },
    { art: budgetArt, kicker: "Daily budgets", title: "When the time is up, the app is covered.", body: "Open an app that's over its limit and Ante steps in front of it. Take a breath, then choose: open it for a few minutes, or put it down." },
    { art: betArt, kicker: "The tables", title: "Want more?<br>Bet the minutes.", body: "Stake time at roulette, blackjack, slots, poker or a coin flip. No real money. The house keeps a small edge, so on average playing costs minutes." },
    { art: focusArt, kicker: "Focus", title: "Locked when it counts.", body: "Cover every limited app for an hour, or schedule it for work and sleep. Strict mode locks it all for days, so you can't talk yourself out of it." },
  ];

  App.views.welcome = function () {
    const step = ui.welcomeStep;
    const dots = `<div class="ob-dots" role="tablist" aria-label="Onboarding steps">${Array.from({ length: LAST + 1 }, (_, i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}"></i>`).join("")}</div>`;
    if (step < SLIDES) {
      return `<div class="screen welcome story" id="screen">
        <div class="ob-top">${dots}<button class="link" data-a="obSkip">Skip</button></div>
        <div class="ob-stage" id="ob-stage">${STORY.map((s, i) => `
          <section class="ob-slide ${i === step ? "active" : ""}" data-k="${i}" aria-hidden="${i !== step}">
            <div class="ob-art">${s.art()}</div>
            <p class="eyebrow">${s.kicker}</p><h1 class="ob-title">${s.title}</h1><p class="muted ob-body">${s.body}</p>
          </section>`).join("")}</div>
        <button class="btn primary big ob-next" data-a="obNext"><span>${step === SLIDES - 1 ? "Get started" : "Continue"}</span></button>
      </div>`;
    }
    if (step === OB.agree) return agreeStep(dots);
    if (step === OB.apps) return appsStep(dots);
    if (step === OB.sched) return schedStep(dots);
    if (step === OB.signin) {
      return `<div class="screen welcome" id="screen">
        <div class="ob-top">${dots}</div>
        <div class="w-hero"><span class="w-logo" aria-hidden="true">${App.ICON.logo}</span><h1 class="w-title">Ante</h1>
          <p class="muted">Sign in to put your name on it, or keep going without an account. Your limits stay on this phone either way.</p></div>
        <div class="grow"></div>
        <div class="signin" id="signin" data-open="false">
          <button class="signin-pill" data-a="signinOpen" aria-expanded="false" aria-controls="signin-card">Sign in</button>
          <div class="signin-card" id="signin-card" role="dialog" aria-label="Sign in">
            <div class="sheet-head"><h2 class="h2">Sign in</h2><button class="iconbtn" data-a="signinClose" aria-label="Close">${App.ICON.close}</button></div>
            <button class="btn google" data-a="google">${App.ICON.google}Continue with Google</button>
            <div class="or"><span>or</span></div>
            <button class="btn quiet" data-a="skipSignin">Continue without an account</button>
            <p class="auth-msg" id="auth-msg" role="status"></p>
            <p class="fine">Signing in only saves your name and email on this phone.</p>
          </div>
        </div>
        <button class="btn ghost" data-a="skipSignin">Skip for now</button>
        <p class="fine center">Signing in lets you back up to your own Google Drive and bring everything to a new phone.</p>
      </div>`;
    }
    return `<div class="screen welcome" id="screen">
      <div class="ob-top">${dots}</div>
      <div class="w-hero"><span class="w-logo" aria-hidden="true">${App.ICON.lock}</span><h1 class="h1">One switch to turn on</h1><p class="muted">Ante covers an app when its time is up. To do that it needs to know which app is in front.</p></div>
      <ul class="facts"><li>It only sees the name of the app you open.</li><li>It never reads your screen, what you type or your notifications.</li><li>You can switch it off any time in Settings → Accessibility.</li></ul>
      <div class="grow"></div>
      <button class="btn primary big" data-a="welcomeAcc">Turn on blocking</button>
      <button class="btn ghost" data-a="finishWelcome">Do it later</button>
    </div>`;
  };

  /* ---------- setup steps ---------- */
  function agreeStep(dots) {
    return `<div class="screen welcome" id="screen">
      <div class="ob-top">${dots}</div>
      <div class="w-hero"><span class="w-logo" aria-hidden="true">${App.ICON.logo}</span><h1 class="h1">Before we start</h1>
        <p class="muted">The tables simulate casino games, so Ante is for adults.</p></div>
      <ul class="facts"><li>No real money goes in or comes out. Minutes are the only chips.</li>
        <li>Your limits and history stay on your phone, and you can delete them any time.</li>
        <li>Ante never covers your phone app, your messages or emergency calls.</li></ul>
      <div class="grow"></div>
      <button class="btn primary big" data-a="obAgree">I'm 18 or older and agree</button>
      <p class="fine center">By agreeing you accept the Terms. How Ante handles your data is explained in the Privacy Policy.</p>
      <p class="fine center"><button class="inline-link" data-a="doc" data-v="terms">Terms of Service</button> · <button class="inline-link" data-a="doc" data-v="privacy">Privacy Policy</button></p>
    </div>`;
  }

  const budgetOf = () => ui.obBudget || 30;
  function appsStep(dots) {
    const all = ui.obApps;
    const usual = all ? USUAL.map(p => all.find(a => a.pkg === p)).filter(Boolean) : [];
    const list = all ? (ui.obAll || !usual.length ? all : usual) : [];
    // Suggest the first few usual suspects once the app list is in.
    const picked = ui.obPick || (all ? (ui.obPick = new Set(usual.slice(0, 3).map(a => a.pkg))) : new Set());
    const b = budgetOf();
    const rows = !all ? `<p class="muted">Loading your apps…</p>` : list.map(a => `
      <button class="ob-app" role="checkbox" aria-checked="${picked.has(a.pkg)}" data-a="obPickApp" data-pkg="${esc(a.pkg)}">
        ${a.icon ? `<img class="appicon" src="${esc(a.icon)}" alt="" width="40" height="40">` : `<span class="appicon mono">${esc(a.label.slice(0, 2))}</span>`}
        <span class="name">${esc(a.label)}</span><span class="tick" aria-hidden="true">${App.ICON.check}</span></button>`).join("");
    return `<div class="screen welcome ob-setup" id="screen">
      <div class="ob-top">${dots}<button class="link" data-a="obSkipStep">Skip</button></div>
      <h1 class="h1">Which apps eat your day?</h1>
      <p class="muted">Pick the ones to give a daily budget. You can change it any time on Home.</p>
      <div class="ob-apps">${rows}${all && usual.length && !ui.obAll ? `<button class="link ob-more" data-a="obAllApps">Show all apps</button>` : ""}</div>
      <div class="ob-budget"><p class="ob-budget-h">Daily budget for each</p>
        ${App.wheels([{ id: "obh", aria: "Hours", values: [0, 1, 2, 3, 4, 5, 6], label: String, value: Math.floor(b / 60), unit: "h" },
          { id: "obm", aria: "Minutes", values: Array.from({ length: 12 }, (_, k) => k * 5), label: n => App.pad(n), value: b % 60, unit: "min" }], { small: true })}</div>
      <button class="btn primary big" data-a="obApps" ${picked.size ? "" : "disabled"}>${picked.size ? `Limit ${picked.size} ${picked.size === 1 ? "app" : "apps"}` : "Pick an app"}</button>
    </div>`;
  }

  const hm = m => `${App.pad(Math.floor(m / 60))}:${App.pad(m % 60)}`;
  const schedOn = k => (App.S.schedules || []).find(s => s.label === SCHED[k].label);
  function schedStep(dots) {
    const cards = Object.keys(SCHED).map(k => {
      const p = SCHED[k], on = schedOn(k);
      return `<div class="ob-sched${on ? " on" : ""}"><span class="sicon" style="--ic:#a78bfa" aria-hidden="true">${App.ICON[p.icon]}</span>
        <span class="ob-sched-t"><b>${esc(p.label)}</b><span>${esc(on ? `${hm(on.startMin)}–${hm(on.endMin)}` : p.body)}</span>
        ${on ? "" : `<button class="link" data-a="obSchedEdit" data-v="${k}">Change times</button>`}</span>
        ${App.toggle("obSched", !!on, p.label).replace('data-a="obSched"', `data-a="obSched" data-v="${k}"`)}</div>`;
    }).join("");
    return `<div class="screen welcome ob-setup" id="screen">
      <div class="ob-top">${dots}<button class="link" data-a="obSkipStep">Skip</button></div>
      <h1 class="h1">Quiet hours, on their own</h1>
      <p class="muted">Focus turns itself on at these times and covers every limited app until the window ends. A schedule that's running can't be switched off early.</p>
      <div class="ob-scheds">${cards}</div>
      <div class="grow"></div>
      <button class="btn primary big" data-a="obNextStep">Continue</button>
    </div>`;
  }

  /* Slide 1's counter: a scroll timer that runs away from you. */
  App.afterWelcome = function () {
    const scr = document.getElementById("screen");
    if (scr && App.Scenes) App.Scenes.run(scr); // inactive slides wait until they're shown
    attachSwipe();
    if (ui.welcomeStep === OB.apps) {
      if (!ui.obApps) setTimeout(() => { try { ui.obApps = A.apps() || []; } catch (e) { ui.obApps = []; } App.render(); }, 30);
      if (scr && App.mountWheels) App.mountWheels(scr, (id, v) => {
        const b = budgetOf();
        let h = id === "obh" ? v : Math.floor(b / 60), m = id === "obm" ? v : b % 60;
        if (!h && m < 5) { m = 5; App.setWheel(scr, "obm", 5); }
        ui.obBudget = h * 60 + m;
      });
    }
  };

  function goStep(n) {
    const from = ui.welcomeStep;
    ui.welcomeStep = Math.max(0, Math.min(LAST, n));
    App.SFX.play("tap"); App.haptic("tap");
    if (from < SLIDES && ui.welcomeStep < SLIDES && stageCtl) {
      // Stay on the same DOM and glide the stage, so the change animates.
      stageCtl.go(ui.welcomeStep);
      document.querySelectorAll(".ob-dots i").forEach((d, i) => { d.className = i === ui.welcomeStep ? "on" : i < ui.welcomeStep ? "done" : ""; });
      const b = document.querySelector('[data-a="obNext"]');
      if (b) {
        const label = ui.welcomeStep === SLIDES - 1 ? "Get started" : "Continue";
        if (b.textContent !== label) { b.innerHTML = `<span class="swap">${label}</span>`; }
      }
      return;
    }
    App.render();
    const scr = document.getElementById("screen");
    if (scr && ui.welcomeStep >= SLIDES) { scr.classList.remove("enter"); void scr.offsetWidth; scr.classList.add("ob-enter"); }
  }
  App.welcomeBack = () => { if (ui.welcomeStep === 0) return false; if (ui.welcomeStep === OB.apps && App.ACC.signedIn) return true; goStep(ui.welcomeStep - 1); return true; };

  /**
   * The story stage. `pos` is a fractional slide index: the strip follows the finger, each slide's
   * art drifts slower than its text (parallax) and shrinks as it leaves, and a release springs to
   * the nearest slide (or the next one on a flick).
   */
  let stageCtl = null;
  const SWIPE_FLICK = 0.35; // px per ms
  function attachSwipe() {
    const stage = document.getElementById("ob-stage"); if (!stage) { stageCtl = null; return; }
    const slides = [...stage.querySelectorAll(".ob-slide")];
    const still = App.FX.reduced();
    let pos = ui.welcomeStep, raf = 0, drag = null;
    function paint() {
      stage.style.transform = `translate3d(${(-pos * 100).toFixed(3)}%, 0, 0)`;
      slides.forEach(sl => {
        const d = Number(sl.dataset.k) - pos, a = Math.min(1, Math.abs(d));
        sl.style.setProperty("--d", d.toFixed(3));
        sl.style.setProperty("--a", a.toFixed(3));
      });
    }
    function settle(target) {
      cancelAnimationFrame(raf);
      slides.forEach((sl, i) => { sl.classList.toggle("active", i === target); sl.setAttribute("aria-hidden", String(i !== target)); });
      if (still) { pos = target; paint(); return; }
      // Critically damped spring (stiffness 170, damping 26), stepped with the real frame time.
      const K = 170, C = 26;
      let v = 0, last = performance.now();
      const step = now => {
        const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
        v += (K * (target - pos) - C * v) * dt;
        pos += v * dt;
        if (Math.abs(target - pos) < 0.001 && Math.abs(v) < 0.01) { pos = target; paint(); return; }
        paint(); raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    stage.addEventListener("pointerdown", e => {
      if (drag) return;
      cancelAnimationFrame(raf);
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: pos, t0: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0, live: false };
    });
    stage.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.live) { if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) return; drag.live = true; stage.setPointerCapture && stage.setPointerCapture(e.pointerId); }
      const now = performance.now();
      drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT); drag.lastX = e.clientX; drag.lastT = now;
      let p = drag.p0 - dx / stage.clientWidth;
      if (p < 0) p = p * 0.3; // rubber band at the ends
      if (p > SLIDES - 1) p = SLIDES - 1 + (p - (SLIDES - 1)) * 0.3;
      pos = p; paint();
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.live) return;
      let target = Math.round(pos);
      if (Math.abs(d.v) > SWIPE_FLICK) target = d.v < 0 ? Math.ceil(d.p0 + 0.01) : Math.floor(d.p0 - 0.01);
      target = Math.max(0, Math.min(SLIDES - 1, target));
      if (target !== ui.welcomeStep) goStep(target); else settle(target);
    };
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    paint();
    stageCtl = { go: settle };
  }

  /* Sign-in pill that grows into the sign-in card (after Skiper UI's sign-in), and back. */
  App.morphSignin = function (open) {
    const box = document.getElementById("signin"); if (!box) return;
    const card = box.querySelector(".signin-card"), pill = box.querySelector(".signin-pill");
    const from = box.getBoundingClientRect();
    box.dataset.open = String(open);
    pill.setAttribute("aria-expanded", String(open));
    card.style.width = (box.parentElement.clientWidth - 32) + "px"; // measure at the final width
    const toH = open ? card.scrollHeight : 48;
    box.style.height = from.height + "px";
    void box.offsetWidth;
    box.style.height = toH + "px";
    if (open) { App.SFX.play("tap"); setTimeout(() => { const g = card.querySelector(".google"); if (g) g.focus(); }, 380); }
    else setTimeout(() => pill.focus(), 380);
  };

  Object.assign(App.act, {
    obNext() { goStep(ui.welcomeStep + 1); },
    obSkip() { goStep(OB.agree); },
    obAgree() { App.P.set({ terms: { v: App.L.TERMS_VERSION, at: Date.now() } }); goStep(OB.signin); },
    obSkipStep() { goStep(ui.welcomeStep + 1); },
    obNextStep() { goStep(ui.welcomeStep + 1); },
    obAllApps() { ui.obAll = true; App.render(); },
    obPickApp(d) {
      const set = ui.obPick || (ui.obPick = new Set());
      if (set.has(d.pkg)) set.delete(d.pkg); else set.add(d.pkg);
      const b = App.$app.querySelector(`[data-a="obPickApp"][data-pkg="${CSS.escape(d.pkg)}"]`); if (b) b.setAttribute("aria-checked", String(set.has(d.pkg)));
      const go = App.$app.querySelector('[data-a="obApps"]');
      if (go) { go.disabled = !set.size; go.textContent = set.size ? `Limit ${set.size} ${set.size === 1 ? "app" : "apps"}` : "Pick an app"; }
      App.haptic("tap");
    },
    obApps() {
      const set = ui.obPick || new Set(), sec = budgetOf() * 60;
      for (const pkg of set) {
        if (App.lim(pkg)) continue;
        const a = (ui.obApps || []).find(x => x.pkg === pkg);
        A.setLimit(pkg, a ? a.label : pkg, sec);
      }
      App.refresh(); App.haptic("win"); goStep(OB.sched);
    },
    obSched(d) {
      const p = SCHED[d.v]; if (!p) return;
      const on = schedOn(d.v);
      if (on) { if (!A.removeSchedule(on.id)) { App.toast("A schedule that's running can't be switched off early."); return; } }
      else if (!A.setSchedule || !A.setSchedule({ id: 0, label: p.label, days: p.days, startMin: p.startMin, endMin: p.endMin, on: true })) { App.toast("Install the new app version (0.6.0) for schedules."); return; }
      App.refresh(); App.haptic("tap"); App.render();
    },
    obSchedEdit(d) { const p = SCHED[d.v]; if (p) App.act.schedPreset({ v: d.v }); },
    signinOpen() { App.morphSignin(true); },
    signinClose() { App.morphSignin(false); },
    skipSignin() { goStep(OB.apps); },
    welcomeAcc() { ui.sheet = { type: "consent", fromWelcome: true }; App.paintOverlay(); },
    finishWelcome() { A.finishOnboarding(); App.refresh(); ui.view = "home"; App.render(); },
  });
  App.SLIDES = SLIDES;
  App.OB = OB;

  /* Material changes to the Terms: shown once before they apply, to accept again. */
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.terms = (sh, sheet, head) => sheet("", `${head("The Terms have changed", "terms-h")}
    <p class="muted">Ante now asks you to be 18 or older, never covers your phone, messages or emergency apps, and lets you back up and delete your data. Please read and accept the new Terms to keep using Ante.</p>
    <button class="btn quiet" data-a="doc" data-v="terms">Read the Terms</button>
    <div class="btn-row"><button class="btn quiet" data-a="dataDelete">Delete data</button><button class="btn primary" data-a="termsAccept">I'm 18+ and agree</button></div>`, "terms-h");
  App.act.termsAccept = () => { App.P.set({ terms: { v: App.L.TERMS_VERSION, at: Date.now() } }); ui.sheet = null; App.paintOverlay(); App.toast("Thanks. You're all set."); };
  App.checkTerms = () => {
    const t = App.P.get().terms;
    if (App.BLOCK || ui.view === "welcome" || ui.sheet || !App.L.TERMS_VERSION || (t && t.v >= App.L.TERMS_VERSION)) return;
    ui.sheet = { type: "terms" }; App.paintOverlay();
  };
  setTimeout(() => App.checkTerms(), 800);
})();
