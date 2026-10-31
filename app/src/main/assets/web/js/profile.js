/* Profile: account, appearance (themes), settings, blocking health, Strict mode, support, legal. */
(function () {
  "use strict";
  const App = window.App;
  const { A, esc } = App;
  const ui = App.ui;
  const KOFI = "https://ko-fi.com/peteracz";

  /* Appearance: a row of tiny app previews (one per accent, drawn in the current flavour's real
     colours), then a switch for the flavour itself. */
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function miniApp(c, accent) {
    return `<span class="mini" aria-hidden="true" style="--m-bg:${c.mantle};--m-card:${c.base};--m-line:${c.s1};--m-text:${c.text};--m-sub:${c.o1};--m-acc:${accent};--m-g:${c.green};--m-y:${c.yellow};--m-r:${c.red}">
      <i class="m-title"></i>
      <i class="m-card"><i class="m-row"><b class="m-sq"></b><b class="m-line"></b><b class="m-sw"></b></i><i class="m-row"><b class="m-sq dim"></b><b class="m-line short"></b></i></i>
      <i class="m-dots"><b></b><b></b><b></b></i>
      <i class="m-nav"><b class="on"></b><b></b><b></b></i></span>`;
  }
  function themeCards() {
    const P = App.P, cur = P.get(), f = P.FLAVORS[cur.theme];
    const colours = Object.entries(P.ACCENTS[cur.theme]).map(([id, hex]) => `
      <button class="tcard" role="radio" aria-checked="${cur.accent === id}" data-a="accent" data-v="${id}">
        ${miniApp(f.c, hex)}<span class="t-name">${esc(cap(id))}</span></button>`).join("");
    const flavours = Object.entries(P.FLAVORS).map(([id, fl]) =>
      `<button role="radio" class="ftile" aria-checked="${cur.theme === id}" data-a="theme" data-v="${id}">
        <span class="fsw" aria-hidden="true" style="--f-bg:${fl.c.base};--f-s:${fl.c.s1};--f-t:${fl.c.text}"><i></i></span><span class="fname">${esc(fl.name)}</span></button>`).join("");
    return `<div class="tcards" role="radiogroup" aria-label="Colour" id="tcards">${colours}</div></div>
      <div class="sblock"><p class="sblock-h">Flavour</p><div class="ftiles" role="radiogroup" aria-label="Flavour">${flavours}</div>`;
  }
  /** Keeps the chosen colour in view after a re-render. */
  App.afterProfile = () => {
    const row = document.getElementById("tcards"), on = row && row.querySelector('[aria-checked="true"]');
    if (!on) return;
    // Only scroll when the chosen colour would be hidden, and then just enough to show it whole.
    const left = on.offsetLeft - row.offsetLeft, right = left + on.offsetWidth;
    if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth) row.scrollLeft = Math.max(0, left - 4);
  };

  /* Clock font: each tile shows the real time left in that font. */
  function clockPicker() {
    const P = App.P, cur = P.get().clock;
    const left = App.S.limits.reduce((a, l) => a + l.leftSec, 0);
    const t = left || 4140, sample = `${Math.floor(t / 3600)}:${App.pad(Math.floor((t % 3600) / 60))}`; // H:MM keeps tiles compact
    return `<div class="ctiles" role="radiogroup" aria-label="Clock font" id="ctiles">${Object.entries(P.CLOCKS).map(([id, k]) => `
      <button class="ctile" role="radio" aria-checked="${cur === id}" data-a="clock" data-v="${id}">
        <span class="c-sample" style="font-family:'${esc(k.family)}', monospace;font-weight:${k.lg};font-variation-settings:${esc(k.vary)}" aria-hidden="true">${esc(sample)}</span>
        <span class="t-name">${esc(k.name)}</span></button>`).join("")}</div>`;
  }

  /** The native part (APK) is older than this UI needs for full screen and vibration. */
  const NATIVE_WANTED = [0, 4, 0];
  function nativeOutdated() {
    if (!A.native) return false;
    const v = (A.versions && A.versions()) || {};
    const have = String(v.app || "0").split(".").map(n => parseInt(n, 10) || 0);
    for (let k = 0; k < 3; k++) { if ((have[k] || 0) !== NATIVE_WANTED[k]) return (have[k] || 0) < NATIVE_WANTED[k]; }
    return false;
  }
  App.nativeOutdated = nativeOutdated;

  /* One settings row: coloured icon tile, title (and an optional line under it), then a trailing control. */
  const item = (o) => {
    const tag = o.action ? "button" : "div";
    const attrs = o.action ? ` data-a="${o.action}"${o.v ? ` data-v="${o.v}"` : ""}${o.go ? ` data-go="${o.go}"` : ""}` : "";
    return `<${tag} class="sitem${o.action ? " tap" : ""}"${attrs}>
      <span class="sicon" ${o.tone ? ` style="--ic:${o.tone}"` : ""} aria-hidden="true">${App.ICON[o.icon] || ""}</span>
      <span class="sitem-t"><span class="sitem-title">${o.title}</span>${o.sub ? `<span class="sitem-sub">${o.sub}</span>` : ""}</span>
      ${o.trail || (o.action ? `<span class="chev" aria-hidden="true">${App.ICON.chev}</span>` : "")}</${tag}>`;
  };
  const group = (label, body, foot) => `<section class="sgroup-wrap">${label ? `<h2 class="sgroup-label">${label}</h2>` : ""}<div class="sgroup">${body}</div>${foot ? `<p class="sgroup-foot">${foot}</p>` : ""}</section>`;
  const status = (tone, text) => `<span class="pill ${tone}"><i></i>${text}</span>`;

  App.views.profile = function () {
    const S = App.S, ACC = App.ACC, prefs = App.P.get(), name = App.displayName();
    const ok = S.accessibility && S.watching;
    const notice = nativeOutdated() ? `
      <section class="update-note" role="status">
        <span class="sicon" style="--ic:var(--warn)" aria-hidden="true">${App.ICON.info}</span>
        <div><p class="sitem-title">Install the new app version once</p>
        <p class="sitem-sub">This phone runs Ante ${esc((A.versions().app) || "")}. Full screen, vibration, photos, Focus and timed Strict mode need 0.4.0. Open the <b>ante-app</b> project in Android Studio and press Run.</p></div>
      </section>` : "";
    return `<div class="screen settings" id="screen">
      <header><h1 class="h1">Profile</h1></header>
      ${notice}
      <section class="me">
        <button class="me-photo" data-a="photoPick" aria-label="${ACC.photo ? "Change profile picture" : "Add a profile picture"}">${App.avatar("lg", 'aria-hidden="true"')}<span class="cam" aria-hidden="true">${App.ICON.camera}</span></button>
        <div class="me-t"><p class="me-name">${esc(name || "Your name")}</p><p class="sitem-sub">${ACC.signedIn ? esc(ACC.email) : "Not signed in · limits work without an account"}</p></div>
      </section>

      ${group("Account", `
        <label class="sitem field-row"><span class="sicon" style="--ic:var(--info)" aria-hidden="true">${App.ICON.user}</span>
          <span class="sitem-t"><span class="sitem-title">Name</span></span>
          <input id="name-input" class="inline-input" type="text" maxlength="40" autocomplete="nickname" placeholder="${esc(ACC.name || "Add a name")}" value="${esc(prefs.name)}"></label>
        ${item({ icon: "camera", tone: "var(--accent)", title: "Photo", sub: ACC.photo ? (ACC.customPhoto ? "Your photo" : "From Google") : "None yet",
          trail: `<span class="btn-pair">${ACC.customPhoto ? `<button class="btn-sm ghost" data-a="photoRemove">Remove</button>` : ""}<button class="btn-sm" data-a="photoPick">${ACC.photo ? "Change" : "Add"}</button></span>` })}
        ${ACC.signedIn
          ? item({ icon: "google", tone: "#ffffff", title: "Google", sub: esc(ACC.email), trail: `<button class="btn-sm" data-a="signOut">Sign out</button>` })
          : item({ icon: "google", tone: "#ffffff", title: "Sign in with Google", sub: "Puts your name on Ante", action: "google" }) + `<p class="auth-msg" id="auth-msg" role="status"></p>`}`)}

      ${group("Appearance", `
        <div class="sblock"><p class="sblock-h">Colour</p>${themeCards()}</div>
        <div class="sblock"><p class="sblock-h">Clock font</p>${clockPicker()}</div>`)}

      ${group("Feedback", `
        ${item({ icon: "soundOn", tone: "var(--accent)", title: "Sound effects", trail: App.toggle("sound", !App.SFX.muted, "Sound effects") })}
        ${item({ icon: "vibrate", tone: "#a78bfa", title: "Vibration", trail: App.toggle("haptics", prefs.haptics, "Vibration") })}`)}

      ${group("Blocking", `
        ${item({ icon: "shield", tone: ok ? "var(--win)" : "var(--loss)", title: "Accessibility switch", trail: ok ? status("good", "Running") : `<button class="btn-sm" data-a="settingsGo" data-go="acc">${S.accessibility ? "Restart" : "Turn on"}</button>` })}
        ${item({ icon: "battery", tone: S.batteryOk === false ? "var(--warn)" : "#34d399", title: "Background use", trail: S.batteryOk === false ? `<button class="btn-sm" data-a="settingsGo" data-go="battery">Allow</button>` : status("good", "Allowed") })}
        ${item({ icon: "clock", tone: S.autoTime === false ? "var(--warn)" : "#60a5fa", title: "Date & time", trail: S.autoTime === false ? `<button class="btn-sm" data-a="settingsGo" data-go="date">Fix</button>` : status("good", "Automatic") })}
        ${S.accessibility ? App.modeItems(item, status) : ""}`,
        App.modes().strict ? "Settings opens after a 30-second wait while Strict mode is on." : "")}

      ${group("Support", item({ icon: "coffee", tone: "#fb923c", title: "Tip on Ko-fi", sub: "Ante is free and has no ads", action: "kofi" }))}

      ${group("About", `
        ${item({ icon: "doc", title: "Terms of Service", action: "doc", v: "terms" })}
        ${item({ icon: "doc", title: "Privacy Policy", action: "doc", v: "privacy" })}
        ${item({ icon: "doc", title: "Imprint", action: "doc", v: "imprint" })}
        ${item({ icon: "info", title: "Version", trail: `<span class="sval">${versionLine()}</span>` })}`)}

      ${A.native ? "" : group("Web demo", `
        <a class="sitem tap" href="?mode=block&pkg=com.instagram.android&acc=1"><span class="sicon" aria-hidden="true">${App.ICON.lock}</span><span class="sitem-t"><span class="sitem-title">See the block screen</span></span><span class="chev">${App.ICON.chev}</span></a>
        <a class="sitem tap" href="?mode=block&pkg=com.android.settings&note=strict&acc=1"><span class="sicon" aria-hidden="true">${App.ICON.shield}</span><span class="sitem-t"><span class="sitem-title">Strict mode covering Settings</span></span><span class="chev">${App.ICON.chev}</span></a>
        <a class="sitem tap" href="?onboard=1&reset=1"><span class="sicon" aria-hidden="true">${App.ICON.play}</span><span class="sitem-t"><span class="sitem-title">Start onboarding again</span></span><span class="chev">${App.ICON.chev}</span></a>
        <a class="sitem tap" href="?reset=1&acc=1"><span class="sicon" aria-hidden="true">${App.ICON.close}</span><span class="sitem-t"><span class="sitem-title">Reset demo data</span></span><span class="chev">${App.ICON.chev}</span></a>`)}
      <p class="fine center">No real money · Your limits and history stay on this phone.</p>
    </div>`;
  };

  /** "Ante 0.1.0 · UI update 2026-10-31 14:52", so it's easy to see an update has landed. */
  function versionLine() {
    const v = (A.versions && A.versions()) || {};
    const app = v.app ? `Ante ${esc(v.app)}` : "Ante";
    if (!v.web) return `${app}`;
    const d = new Date(Number(v.web) * 1000);
    const stamp = isNaN(d) ? String(v.web) : `${d.getFullYear()}-${App.pad(d.getMonth() + 1)}-${App.pad(d.getDate())} ${App.pad(d.getHours())}:${App.pad(d.getMinutes())}`;
    return `${app} · UI ${esc(stamp)}`;
  }

  App.views.legal = function () {
    const d = App.L.DOCS[ui.doc] || App.L.DOCS.terms;
    return `<div class="screen legal" id="screen">
      <header class="topbar">${App.backBtn("legalBack", "Back")}<div class="grow"><h1 class="h2">${esc(d.title)}</h1></div></header>
      <p class="muted">${esc(d.intro)}</p>
      ${d.sections.map(([h, body]) => `<section class="doc-sec"><h2 class="h3">${esc(h)}</h2><p>${body}</p></section>`).join("")}
      <p class="fine">Contact: ${esc(App.L.EMAIL)} · ${esc(App.L.PHONE)}</p>
      <button class="btn quiet" data-a="mail">Email ${esc(App.L.OWNER)}</button>
    </div>`;
  };

  /* Opens Settings shortcuts; in Strict mode they need the 30-second wait first. */
  const SETTINGS = { acc: () => A.openAccessibilitySettings(), battery: () => A.openBatterySettings(), date: () => A.openDateSettings(), info: () => A.openAppInfo() };

  Object.assign(App.act, {
    theme(d) { App.P.set({ theme: d.v }); App.SFX.play("tap"); App.render(); },
    photoPick() {
      if (!A.pickPhoto || A.pickPhoto() === false) App.toast("Install the new app version (0.3.0) to add a photo.");
    },
    photoRemove() { A.removePhoto(); App.refresh(); App.render(); App.toast("Photo removed."); },
    clock(d) {
      if (!App.P.CLOCKS[d.v]) return;
      App.P.set({ clock: d.v }); App.SFX.play("tap"); App.haptic("tap"); App.render();
      // The font loads on first use; fit the big clocks again once it's there.
      const k = App.P.CLOCKS[d.v];
      if (document.fonts && document.fonts.load) document.fonts.load(`40px "${k.family}"`).then(() => App.fitText && App.fitText()).catch(() => {});
    },
    accent(d) { App.P.set({ accent: d.v }); App.SFX.play("tap"); App.render(); },
    haptics() { App.P.set({ haptics: !App.P.get().haptics }); App.haptic("win"); /* a clear buzz confirms it works */ App.render(); },
    sound() {
      App.SFX.toggle();
      if (ui.view === "profile") { App.render(); return; }
      document.querySelectorAll('[data-a="sound"].iconbtn').forEach(b => { const t = document.createElement("div"); t.innerHTML = App.soundBtn(); b.replaceWith(t.firstElementChild); });
    },
    doc(d) { ui.back = ui.view; ui.doc = d.v; ui.view = "legal"; App.render(); },
    legalBack() { ui.view = ui.back || "profile"; ui.back = null; App.render(); },
    kofi() { if (A.openLink(KOFI) === false) App.toast("Ko-fi: " + KOFI); },
    mail() { A.openLink("mailto:" + App.L.EMAIL); },
    signOut() { A.signOut(); App.refresh(); App.render(); App.toast("Signed out. Your limits are still here."); },
    google() {
      const msg = document.getElementById("auth-msg"); if (msg) msg.textContent = "Opening Google…";
      A.signInWithGoogle();
    },
    openAcc() { ui.sheet = { type: "consent" }; App.paintOverlay(); },
    agreeAcc() {
      const fromWelcome = ui.sheet && ui.sheet.fromWelcome;
      ui.sheet = null; App.paintOverlay();
      if (fromWelcome) { A.finishOnboarding(); ui.view = "home"; }
      if (A.openAccessibilitySettings() === false) { App.act.settingsGo({ go: "acc" }); return; }
      setTimeout(() => { App.refresh(); App.render(); }, 300);
    },
    openInfo() { App.act.settingsGo({ go: "info" }); },
    strictOn() { App.act.explain({ v: "strict" }); },
    agreeStrict() { A.setStrict(true); App.refresh(); ui.sheet = null; App.render(); App.toast("Strict mode is on."); },
    strictOff() { App.openWait({ title: "Turn off Strict mode", body: "Wait 30 seconds. If you still want to turn it off after that, you can.", cta: "Turn off Strict mode", then: "strictOffNow" }); },
    strictOffNow() { if (!A.setStrict(false)) { App.toast("The wait isn't over yet."); return; } App.refresh(); ui.sheet = null; App.render(); App.toast("Strict mode is off."); },
    settingsGo(d) {
      const go = SETTINGS[d.go]; if (!go) return;
      if (App.S.strict) { App.openWait({ title: "Settings is behind Strict mode", body: "Wait 30 seconds to open it.", cta: "Open Settings", then: "settingsNow", go: d.go }); return; }
      go(); setTimeout(() => { App.refresh(); App.render(); }, 300);
    },
    settingsNow() {
      const fn = SETTINGS[ui.sheet && ui.sheet.go];
      if (fn && fn() === false) { App.toast("The wait isn't over yet."); return; }
      ui.sheet = null; App.paintOverlay();
    },
    guardWait() { App.openWait({ title: "Open Settings", body: "Settings opens for 2 minutes after the wait.", cta: "Open Settings", then: "guardOpen" }); },
    guardOpen() { if (A.openGuarded(App.CTX.pkg) === false) { App.toast("The wait isn't over yet."); return; } ui.sheet = null; App.paintOverlay(); },
  });

  /* Display name saves as you type (no network; local only). */
  document.addEventListener("input", e => {
    if (e.target.id !== "name-input") return;
    App.P.set({ name: e.target.value });
    const h = document.querySelector(".me-name"), av = document.querySelector(".me span.avatar");
    if (h) h.textContent = App.displayName() || "Your name";
    if (av) av.textContent = App.initials(App.displayName());
  });
})();
