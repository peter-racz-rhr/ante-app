/* Ante Supporter: a one-time Google Play purchase that unlocks looks only (two flavours, four
   clock fonts, table felts, card backs and a badge), plus three tips. Blocking, Focus, Strict mode,
   schedules and every table stay free. The purchase is checked natively (Supporter.kt). */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;

  const LOCKED = {
    theme: new Set(["frappe", "macchiato"]),
    clock: new Set(["workbench", "sixtyfour", "silkscreen", "pixelify"]),
    felt: new Set(["emerald", "navy", "wine", "noir"]),
    back: new Set(["lattice", "dots", "gold"]),
  };
  const DEFAULTS = { theme: "neutral", clock: "bitcount", felt: "theme", back: "classic" };
  const TIPS = [["ante_tip_small", "Coffee"], ["ante_tip_medium", "Lunch"], ["ante_tip_large", "Dinner"]];

  /** Billing status: {available, supporter, prices}. Phones before 0.6.0 have no billing. */
  let status = { available: false, supporter: false, prices: {} };
  function load() { try { status = Object.assign({ prices: {} }, A.supporter ? A.supporter() : status); } catch (e) { /* older app */ } return status; }
  load();

  App.isSupporter = () => !!status.supporter;
  App.locked = (kind, id) => !status.supporter && !!LOCKED[kind] && LOCKED[kind].has(id);
  App.lockMark = (kind, id) => App.locked(kind, id) ? `<span class="lock-mark" aria-label="Supporter">${App.ICON.lock}</span>` : "";
  App.supporterBadge = () => status.supporter ? `<span class="sup-badge">${App.ICON.heart}Supporter</span>` : "";

  /** Looks chosen earlier fall back to the free defaults when they aren't unlocked. */
  function enforce() {
    const p = App.P.get(), patch = {};
    for (const k of Object.keys(LOCKED)) if (p[k] && App.locked(k, p[k])) patch[k] = DEFAULTS[k];
    if (Object.keys(patch).length) App.P.set(patch);
  }
  enforce();

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

  /* ---------- Settings group ---------- */
  App.supporterGroup = (group, item) => {
    const s = load();
    if (!A.supporter && A.native) return ""; // apps before 0.6.0
    const price = s.prices.ante_supporter;
    const head = s.supporter
      ? item({ icon: "heart", tone: "#f472b6", title: "Ante Supporter", sub: "Thank you. Every look is yours.", trail: (App.P.get().receipts || []).length ? `<button class="btn-sm" data-a="showReceipt">Receipt</button>` : `<span class="pill good"><i></i>Supporter</span>` })
      : item({ icon: "heart", tone: "#f472b6", title: "Ante Supporter", sub: "Every theme, font, felt and card back. Blocking stays free.", trail: `<button class="btn-sm" data-a="supporter">${esc(price || "See")}</button>` });
    const tips = `<div class="sitem tips-row"><span class="sicon" style="--ic:#fb923c" aria-hidden="true">${App.ICON.coffee}</span>
      <span class="sitem-t"><span class="sitem-title">Leave a tip</span><span class="sitem-sub">Keeps Ante free and ad-free</span></span></div>
      <div class="tip-chips">${TIPS.map(([id, label]) => `<button class="chip tip" data-a="tip" data-v="${id}" ${s.available ? "" : "disabled"}><span>${esc(label)}</span>${s.prices[id] ? `<small>${esc(s.prices[id])}</small>` : ""}</button>`).join("")}</div>`;
    return group("Support Ante", `${head}${tips}${item({ icon: "info", title: "Restore purchase", sub: "After reinstalling, or on a new phone", action: "restorePurchase" })}`,
      s.available ? "" : "Purchases work once Ante is installed from Google Play.");
  };

  /* ---------- the Supporter sheet ---------- */
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.supporter = (sh, sheet, head) => {
    const s = load(), P = App.P, price = s.prices.ante_supporter;
    const fl = [...LOCKED.theme].map(id => P.FLAVORS[id]);
    const fonts = [...LOCKED.clock].map(id => P.CLOCKS[id]);
    return sheet("", `${head("Ante Supporter", "sup-h")}
      <p class="muted">One purchase, yours for good. It only changes how Ante looks: blocking, Focus, Strict mode, schedules and every table stay free for everyone.</p>
      <div class="sup-grid" aria-hidden="true">
        ${fl.map(f => `<span class="sup-tile" style="background:${f.c.base};color:${f.c.text}"><b>${esc(f.name)}</b><i style="background:${f.c.s1}"></i></span>`).join("")}
        ${fonts.map(k => `<span class="sup-tile font"><b style="font-family:'${esc(k.family)}',monospace">1:09</b><small>${esc(k.name)}</small></span>`).join("")}
        ${["emerald", "navy", "wine", "noir"].map(id => `<span class="sup-tile felt-t" style="background:radial-gradient(circle at 50% 30%, ${P.FELTS[id].felt}, ${P.FELTS[id].deep})"><small>${esc(P.FELTS[id].name)}</small></span>`).join("")}
        ${["lattice", "gold"].map(id => `<span class="sup-tile backs"><span class="back-sw" data-back="${id}"><i></i></span><small>${esc(P.BACKS[id])}</small></span>`).join("")}
      </div>
      <ul class="ex-list"><li style="--k:0">${App.ICON.check}<span>Frappé and Macchiato flavours, four more clock fonts</span></li>
        <li style="--k:1">${App.ICON.check}<span>Four table felts and three card backs</span></li>
        <li style="--k:2">${App.ICON.check}<span>A Supporter badge on your profile</span></li></ul>
      ${s.supporter ? `<p class="pc-state on">${App.ICON.heart}<span>You're a Supporter. Thank you!</span></p><button class="btn primary" data-a="closeSheet">Done</button>`
        : `<div class="btn-row"><button class="btn quiet" data-a="closeSheet">Not now</button><button class="btn primary" data-a="buySupporter" ${s.available ? "" : "disabled"}>${price ? `Unlock · ${esc(price)}` : "Unlock"}</button></div>
        <p class="fine center">${s.available ? "By tapping Unlock you ask for the looks right away and lose the 14-day right of withdrawal." : "Purchases work once Ante is installed from Google Play."}</p>`}`, "sup-h");
  };

  /** Results from Google Play (native) or the demo. */
  window.anteBilling = raw => {
    let r; try { r = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    load();
    if (r.ok && r.product === "ante_supporter") {
      // A confirmation the buyer can keep (Consumer Rights Directive Art. 8(7)): product, price, date, immediate delivery.
      const receipt = { product: "Ante Supporter", price: status.prices.ante_supporter || "", at: Date.now() };
      App.P.set({ receipts: (App.P.get().receipts || []).concat([receipt]).slice(-10) });
      App.toast("Thank you! Every look is unlocked."); App.haptic("win"); App.SFX.play("bigWin");
      ui.sheet = { type: "receipt", receipt };
    }
    else if (r.ok) { App.toast("Thank you for the tip!"); App.haptic("win"); }
    else if (r.error === "pending") App.toast("Your payment is pending. Ante unlocks once it goes through.");
    else if (r.error !== "cancelled") App.toast("The purchase didn't go through. Nothing was charged.");
    App.render(); App.paintOverlay();
  };

  const receiptText = r => [
    "Ante – purchase confirmation",
    `Product: ${r.product} (digital content: extra looks for the Ante app)`,
    `Price: ${r.price || "as shown by Google Play"}`,
    `Date: ${new Date(r.at).toLocaleString(App.locale ? App.locale() : undefined)}`,
    "You asked for the content to be delivered immediately and acknowledged that you lose the 14-day right of withdrawal once it is delivered. Your warranty rights for digital content are not affected.",
    `Seller: ${App.L.OWNER}, ${App.L.ADDRESS}, ${App.L.EMAIL}. Payment handled by Google Play.`,
  ].map(l => (App.t ? App.t(l) : l)).join("\n");
  App.sheetViews.receipt = (sh, sheet, head) => {
    const r = sh.receipt || {};
    return sheet("", `${head("Your purchase", "rc-h")}
      <div class="receipt">${receiptText(r).split("\n").map((l, i) => `<p class="${i ? "" : "rc-title"}">${esc(l)}</p>`).join("")}</div>
      <p class="fine">Keep this confirmation: save it or send it to yourself.</p>
      <div class="btn-row"><button class="btn quiet" data-a="closeSheet">Done</button><button class="btn primary" data-a="shareReceipt">Save or share</button></div>`, "rc-h");
  };

  const pick = (kind, key) => d => {
    if (App.locked(kind, d.v)) return App.act.supporter();
    App.P.set({ [key]: d.v }); App.SFX.play("tap"); App.render();
  };
  Object.assign(App.act, {
    supporter() { load(); ui.sheet = { type: "supporter" }; App.SFX.play("tap"); App.paintOverlay(); },
    buySupporter() { if (!A.buy || !A.buy("ante_supporter")) App.toast("Google Play isn't ready. Try again in a moment."); },
    tip(d) { if (!A.buy || !A.buy(d.v)) App.toast("Google Play isn't ready. Try again in a moment."); },
    restorePurchase() { if (A.restorePurchases) A.restorePurchases(); setTimeout(() => { load(); App.render(); App.toast(status.supporter ? "Supporter restored." : "No purchase found on this Google account."); }, 1500); },
    shareReceipt() { const sh = ui.sheet; if (!sh || !sh.receipt) return; if (!A.shareText || !A.shareText("Ante purchase confirmation", receiptText(sh.receipt))) App.toast("Install the new app version (0.8.0) to save the confirmation."); },
    showReceipt() { const r = (App.P.get().receipts || []).slice(-1)[0]; if (r) { ui.sheet = { type: "receipt", receipt: r }; App.paintOverlay(); } },
    felt: pick("felt", "felt"),
    cardBack: pick("back", "back"),
  });
})();
