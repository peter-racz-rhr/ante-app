/* Ante Supporter: anyone who donated on Ko-fi with the email of their Google sign-in. Ko-fi tells
   Ante's supporter server (server/kofi-supporters); the phone asks it about a fingerprint of the
   email (Supporter.kt). Supporters get the Supporter badge and a gold ring round their photo,
   nothing more: every feature and every look in Ante is free for everyone. */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;

  /** {supporter, since, configured, kofi, email}. Apps before 0.10.0 answer differently or not at all. */
  let status = { supporter: false, configured: false, kofi: "https://ko-fi.com/peteracz", email: "" };
  let checking = false;
  function load() {
    try { if (A.supporter) status = Object.assign({}, status, A.supporter()); } catch (e) { /* older app */ }
    if (!status.kofi) status.kofi = "https://ko-fi.com/peteracz";
    return status;
  }
  load();

  App.isSupporter = () => !!status.supporter;
  App.kofiUrl = () => load().kofi;
  // Nothing in Ante is locked: every look is free. Kept so older callers keep working.
  App.locked = () => false;
  App.lockMark = () => "";

  /* ---------- pickers for the tables ---------- */
  App.feltPicker = () => {
    const P = App.P, cur = P.get().felt || "theme";
    return `<div class="ftiles" role="radiogroup" aria-label="Table felt">${Object.entries(P.FELTS).map(([id, f]) => `
      <button role="radio" class="ftile" aria-checked="${cur === id}" data-a="felt" data-v="${id}">
        <span class="fsw felt-sw" aria-hidden="true" style="--f-bg:${f.felt || "var(--felt)"};--f-s:${f.deep || "var(--felt-deep)"}"><i></i></span><span class="fname">${esc(f.name)}</span>${App.lockMark("felt", id)}</button>`).join("")}</div>`;
  };
  App.backPicker = () => {
    const P = App.P, cur = P.get().back || "classic";
    return `<div class="ftiles" role="radiogroup" aria-label="Card back">${Object.entries(P.BACKS).map(([id, name]) => `
      <button role="radio" class="ftile" aria-checked="${cur === id}" data-a="cardBack" data-v="${id}">
        <span class="back-sw" data-back="${id}" aria-hidden="true"><i></i></span><span class="fname">${esc(name)}</span>${App.lockMark("back", id)}</button>`).join("")}</div>`;
  };

  /* ---------- the Support card on Profile, and the Settings group ---------- */
  const checkLabel = () => (checking ? "Checking…" : "I donated, check");
  App.supportCard = () => {
    const s = load();
    if (s.supporter) return `<section class="panel pcard sup-card is" aria-labelledby="pd-h">
        <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#f5c542" aria-hidden="true">${App.ICON.heart}</span><h2 class="h3" id="pd-h">Thank you, Supporter</h2></div>
          <button class="btn-sm" data-a="kofi">Ko-fi</button></div>
        <p class="muted">You keep Ante free and ad-free. Your badge and gold ring show on your profile.</p></section>`;
    return `<section class="panel pcard sup-card" aria-labelledby="pd-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#fb923c" aria-hidden="true">${App.ICON.coffee}</span><h2 class="h3" id="pd-h">Support Ante</h2></div></div>
      <p class="muted">Ante is free, with no ads and nothing locked. If it helps you, buy me a coffee on Ko-fi, any amount, and get the Supporter badge and a gold ring round your photo.</p>
      <div class="sup-actions"><button class="btn primary" data-a="kofi">Donate on Ko-fi</button><button class="link sup-how" data-a="supporter">${App.ICON.info}<span>How it works</span>${App.ICON.chev}</button></div></section>`;
  };
  App.supporterGroup = (group, item) => {
    const s = load();
    const head = s.supporter
      ? item({ icon: "heart", tone: "#f5c542", title: "Ante Supporter", sub: "Thank you. Your badge is on your profile.", trail: `<span class="pill good"><i></i>Supporter</span>` })
      : item({ icon: "heart", tone: "#f472b6", title: "Ante Supporter", sub: "Donate on Ko-fi for the badge and gold ring", trail: `<button class="btn-sm" data-a="kofi">Donate</button>` });
    return group("Support Ante", `${head}
      ${s.supporter ? "" : item({ icon: "check", tone: "#34d399", title: "Donated already?", sub: s.email ? `Ante checks ${esc(s.email)}` : "Sign in with Google first", trail: `<button class="btn-sm" data-a="supCheck" ${checking || !s.email ? "disabled" : ""}>${checking ? "…" : "Check"}</button>` })}`,
      "Use the same email on Ko-fi as your Google sign-in. Ante only sends a one-way fingerprint of it to check.");
  };

  /* ---------- the Supporter sheet ---------- */
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.supporter = (sh, sheet, head) => {
    const s = load();
    const steps = s.supporter ? "" : `<ol class="sup-steps">
        <li>Donate any amount on Ko-fi, even once.</li>
        <li>${s.email ? `Use the email of your Google sign-in: <b>${esc(s.email)}</b>` : "Use the email of your Google sign-in."}</li>
        <li>Come back and tap “I donated, check”.</li>
        <li>The badge and the gold ring show up right away.</li></ol>`;
    return sheet("", `${head("Ante Supporter", "sup-h")}
      <div class="sup-hero">${App.badgeSvg ? App.badgeSvg("supporter", 88) : ""}<p class="muted">${s.supporter ? "You're a Supporter. Thank you for keeping Ante free." : "Ante is made by one person, has no ads and locks nothing. A coffee on Ko-fi keeps it that way."}</p></div>
      <div class="sup-perks" aria-hidden="true"><span class="sup-ring">${App.avatar("", "")}</span>
        <p class="sitem-sub">The Supporter badge and a gold ring round your photo. Everything else in Ante is free for everyone, always.</p></div>
      ${steps}
      ${!s.email && !s.supporter ? `<p class="fine">Sign in with Google in Settings first, so Ante knows which email to look for.</p>` : ""}
      ${s.supporter ? `<button class="btn primary" data-a="closeSheet">Done</button>`
        : `<div class="sup-actions"><button class="btn primary" data-a="kofi">Donate on Ko-fi</button><button class="btn quiet" data-a="supCheck" ${checking || !s.email ? "disabled" : ""}>${checkLabel()}</button></div>`}`, "sup-h");
  };

  /** Answers from the supporter check (native or the demo). */
  window.anteSupporter = raw => {
    let r; try { r = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    const was = status.supporter;
    checking = false; load();
    if (r.ok && r.supporter && !was) { App.toast("Thank you! You're an Ante Supporter."); App.haptic("win"); App.SFX.play("bigWin"); if (App.milestone) App.milestone("supporter"); }
    else if (r.ok && r.supporter) { /* still a supporter */ }
    else if (r.ok) App.toast("No donation found for this email yet. Ko-fi can take a minute.");
    else if (r.error === "signin") App.toast("Sign in with Google first, then check again.");
    else if (r.error === "setup") App.toast("The supporter check isn't set up yet.");
    else App.toast("Couldn't check right now. Try again in a moment.");
    if (ui.sheet && ui.sheet.type === "supporter" && r.ok && r.supporter) ui.sheet = { type: "supporter" };
    App.render(); App.paintOverlay();
  };

  const pick = (kind, key) => d => {
    App.P.set({ [key]: d.v }); App.SFX.play("tap"); App.render();
  };
  Object.assign(App.act, {
    supporter() { load(); ui.sheet = { type: "supporter" }; App.SFX.play("tap"); App.paintOverlay(); },
    kofi() { const u = App.kofiUrl(); if (A.openLink(u) === false) App.toast("Ko-fi: " + u); },
    supCheck() {
      if (checking) return;
      if (!A.checkSupporter) { App.toast("Install the new app version (0.10.0) to check."); return; }
      checking = true; App.render(); App.paintOverlay(); A.checkSupporter();
    },
    felt: pick("felt", "felt"),
    cardBack: pick("back", "back"),
  });
})();
