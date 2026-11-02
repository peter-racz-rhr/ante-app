/* Category limits: Social media, Video, Games, News and Shopping. When you set one up you choose
   one shared budget for the whole category (a "cat:social" limit, TimeBank.setGroup) or the same
   limit for each app. Apps are tagged natively (AppCatalog.categoryOf). */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui, fmt = App.fmtH;
  const ic = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const CATS = {
    social: { label: "Social media", tone: "#f472b6", icon: ic('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.4"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><path d="M15 15.2c2.6-.6 4.8.8 5.5 3.8"/>') },
    video: { label: "Video", tone: "#f87171", icon: ic('<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3z"/>') },
    games: { label: "Games", tone: "#a78bfa", icon: ic('<path d="M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3"/><circle cx="16" cy="12" r=".8" fill="currentColor"/>') },
    news: { label: "News", tone: "#60a5fa", icon: ic('<rect x="4" y="4" width="13" height="16" rx="2"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M7 8h7M7 12h7M7 16h4"/>') },
    shopping: { label: "Shopping", tone: "#fbbf24", icon: ic('<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>') },
  };
  App.CATS = CATS;
  const idOf = key => String(key).replace(/^cat:/, "");

  App.catIcon = (key, cls) => {
    const c = CATS[idOf(key)] || CATS.social;
    return `<span class="appicon cat-tile ${cls || ""}" style="--ic:${c.tone}" aria-hidden="true">${c.icon}</span>`;
  };
  App.catCount = key => ((App.S.groups || {})[key] || []).length;

  /** The Categories block at the top of "Add an app". */
  App.categoryRows = apps => {
    if (!apps || !A.setGroup && A.native) return "";
    const counts = {};
    apps.forEach(a => { if (a.cat && CATS[a.cat]) counts[a.cat] = (counts[a.cat] || 0) + 1; });
    const rows = Object.entries(CATS).filter(([id]) => counts[id]).map(([id, c]) => `
      <button class="limit pick" data-a="catOpen" data-v="${id}">${App.catIcon(id)}<span class="meta"><span class="name">${esc(c.label)}</span>
        <span class="muted cat-sub">${counts[id]} ${counts[id] === 1 ? "app" : "apps"}${App.lim("cat:" + id) ? " · has a limit" : ""}</span></span>${App.ICON.chev}</button>`).join("");
    const web = App.webRow ? App.webRow() : "";
    return rows || web ? `<p class="eyebrow pick-h">Categories</p><div class="pick-cats">${rows}${web}</div><p class="eyebrow pick-h">Apps</p>` : "";
  };

  App.sheetViews = App.sheetViews || {};
  App.sheetViews.cat = (sh, sheet, head) => {
    const c = CATS[sh.id], list = (sh.apps || []).filter(a => a.cat === sh.id || sh.members.includes(a.pkg));
    const h = Math.floor(sh.limit / 3600), m = Math.round((sh.limit % 3600) / 60);
    const rows = list.map(a => `<button class="ob-app" role="checkbox" aria-checked="${sh.members.includes(a.pkg)}" data-a="catPick" data-pkg="${esc(a.pkg)}">
        ${a.icon ? `<img class="appicon" src="${esc(a.icon)}" alt="" width="40" height="40">` : `<span class="appicon mono">${esc(a.label.slice(0, 2))}</span>`}
        <span class="name">${esc(a.label)}</span><span class="tick" aria-hidden="true">${App.ICON.check}</span></button>`).join("");
    const n = sh.members.length;
    return sheet("", `<div class="sheet-head">${App.catIcon(sh.id)}<div class="grow"><h2 class="h2" id="cat-h">${esc(c.label)}</h2><p class="muted">${n} ${n === 1 ? "app" : "apps"} picked</p></div>
        <button class="iconbtn" data-a="closeSheet" aria-label="Close">${App.ICON.close}</button></div>
      <div class="ob-apps cat-apps">${rows || `<p class="muted">No apps in this category on this phone.</p>`}</div>
      <div class="xg-chips two" role="radiogroup" aria-label="How the time works">
        <button class="chip" role="radio" data-a="catMode" data-v="shared" aria-pressed="${sh.mode === "shared"}" aria-checked="${sh.mode === "shared"}">Shared budget</button>
        <button class="chip" role="radio" data-a="catMode" data-v="each" aria-pressed="${sh.mode === "each"}" aria-checked="${sh.mode === "each"}">Same limit each</button></div>
      <p class="muted cat-explain" id="cat-explain">${sh.mode === "shared" ? `One budget for all of them together: ${esc(fmt(sh.limit))} a day across ${esc(c.label.toLowerCase())}.` : `Every app gets its own ${esc(fmt(sh.limit))} a day.`}</p>
      <div class="ob-budget"><p class="ob-budget-h">Daily budget</p>
        ${App.wheels([{ id: "ch", aria: "Hours", values: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12], label: String, value: h, unit: "h" },
          { id: "cm", aria: "Minutes", values: Array.from({ length: 12 }, (_, k) => k * 5), label: x => App.pad(x), value: m - (m % 5), unit: "min" }], { small: true })}</div>
      <div class="btn-row"><button class="btn quiet" data-a="closeSheet">Cancel</button><button class="btn primary" data-a="catSave" ${n ? "" : "disabled"}>${sh.edit ? "Save" : "Add limit"}</button></div>`, "cat-h");
  };
  App.wheelHandlers = App.wheelHandlers || {};
  App.wheelHandlers.cat = (id, v) => {
    const sh = ui.sheet; if (!sh || sh.type !== "cat") return;
    let h = Math.floor(sh.limit / 3600), m = Math.round((sh.limit % 3600) / 60);
    if (id === "ch") h = v; else m = v;
    if (!h && m < 5) { m = 5; App.setWheel(App.$overlay, "cm", 5); }
    sh.limit = h * 3600 + m * 60;
    const c = CATS[sh.id], el = document.getElementById("cat-explain");
    if (el) el.textContent = sh.mode === "shared" ? `One budget for all of them together: ${fmt(sh.limit)} a day across ${c.label.toLowerCase()}.` : `Every app gets its own ${fmt(sh.limit)} a day.`;
  };

  const loadApps = then => { try { const a = A.apps() || []; then(a); } catch (e) { then([]); } };
  Object.assign(App.act, {
    catOpen(d) {
      const id = d.v; if (!CATS[id]) return;
      const key = "cat:" + id, existing = App.lim(key);
      loadApps(apps => {
        const inCat = apps.filter(a => a.cat === id).map(a => a.pkg);
        const members = existing ? ((App.S.groups || {})[key] || []).slice() : inCat.filter(p => !App.lim(p));
        ui.sheet = { type: "cat", id, apps, members: members.length ? members : inCat, mode: "shared", limit: existing ? existing.limitSec : 3600, edit: !!existing };
        App.SFX.play("tap"); App.paintOverlay();
      });
    },
    catEdit(d) { App.act.catOpen({ v: idOf(d.pkg) }); },
    catPick(d) {
      const sh = ui.sheet; if (!sh || sh.type !== "cat") return;
      sh.members = sh.members.includes(d.pkg) ? sh.members.filter(p => p !== d.pkg) : sh.members.concat([d.pkg]);
      const b = App.$overlay.querySelector(`[data-a="catPick"][data-pkg="${CSS.escape(d.pkg)}"]`); if (b) b.setAttribute("aria-checked", String(sh.members.includes(d.pkg)));
      const go = App.$overlay.querySelector('[data-a="catSave"]'); if (go) go.disabled = !sh.members.length;
      App.haptic("tap");
    },
    catMode(d) { const sh = ui.sheet; if (!sh || sh.type !== "cat" || (d.v !== "shared" && d.v !== "each")) return; sh.mode = d.v; App.chipFx(); App.paintOverlay(); },
    catSave() {
      const sh = ui.sheet; if (!sh || sh.type !== "cat" || !sh.members.length) return;
      const c = CATS[sh.id];
      if (sh.mode === "shared") {
        if (!A.setGroup || !A.setGroup("cat:" + sh.id, c.label, sh.members, sh.limit)) { App.toast("That can't change while Focus or Strict mode is on."); return; }
        App.toast(`${c.label}: ${fmt(sh.limit)} a day, shared by ${sh.members.length} ${sh.members.length === 1 ? "app" : "apps"}.`);
      } else {
        let ok = 0;
        sh.members.forEach(p => { const a = sh.apps.find(x => x.pkg === p); if (A.setLimit(p, a ? a.label : p, sh.limit)) ok++; });
        App.toast(`${ok} ${ok === 1 ? "app" : "apps"} limited to ${fmt(sh.limit)} a day each.`);
      }
      App.haptic("win"); App.refresh(); ui.sheet = null; App.render();
    },
  });
})();
