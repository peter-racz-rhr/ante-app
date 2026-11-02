/* Website filter: blocks adult sites (about a million, plus any name with an adult word), gambling
   sites and your own list, in every browser and app, through a DNS-only VPN on the phone
   (WebFilterService.kt). A lock (1, 7 or 30 days, or No Nut November: until 1 December) keeps
   the adult filter on; until it ends nothing can be switched off. */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;
  const ic = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  App.ICON.globe = ic('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5s1.2-6.1 3.6-8.5z"/>');
  App.ICON.adult = ic('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>');
  App.ICON.dice = ic('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>');
  const LOCKS = [1, 7, 30];
  const MAX_CUSTOM = 200;

  let st = null;
  /** The filter's state from the phone (or the demo); null on app versions before 0.10.0. */
  function load() {
    try { st = A.webFilter ? A.webFilter() : null; } catch (e) { st = null; }
    return st;
  }
  App.webStatus = () => load();
  App.nnnDone = () => { const s = st || load(); return !!(s && s.nnnDone); };
  const locked = s => !!(s && s.lockUntil && s.lockUntil > Date.now());
  const frozen = s => locked(s) || !!(s && s.strict);
  const when = ms => new Date(ms).toLocaleDateString(App.locale(), { day: "numeric", month: "long" });

  /** One line for Settings and the pick sheet. */
  function line(s) {
    if (!s) return "Install the new app version (0.10.0)";
    if (!s.on) return "Off";
    const parts = [s.adult && "Adult sites", s.gambling && "Gambling", s.custom.length && `${s.custom.length} of yours`].filter(Boolean);
    return (locked(s) ? `Locked until ${when(s.lockUntil)} · ` : "") + (parts.join(", ") || "On");
  }
  App.webItem = (item, status) => {
    const s = load();
    return item({ icon: "globe", tone: "#60a5fa", title: "Website filter", sub: esc(line(s)), action: "web",
      trail: s && s.on ? status(s.running ? "good" : "warn", s.running ? "On" : "Starting") : "" });
  };
  App.webRow = () => {
    const s = load();
    return `<button class="limit pick" data-a="web"><span class="appicon cat-tile" style="--ic:#60a5fa" aria-hidden="true">${App.ICON.globe}</span><span class="meta"><span class="name">Websites</span>
      <span class="muted cat-sub">${esc(s && s.on ? line(s) : "Adult and gambling sites, or your own list")}</span></span>${App.ICON.chev}</button>`;
  };

  /* ---------- the sheet ---------- */
  const row = (icon, tone, title, sub, trail) => `<div class="sitem"><span class="sicon" style="--ic:${tone}" aria-hidden="true">${App.ICON[icon]}</span>
      <span class="sitem-t"><span class="sitem-title">${title}</span>${sub ? `<span class="sitem-sub">${sub}</span>` : ""}</span>${trail}</div>`;
  App.sheetViews = App.sheetViews || {};
  App.sheetViews.web = (sh, sheet, head) => {
    const s = load();
    if (!s) return sheet("", `${head("Website filter", "web-h")}<p class="muted">Install the new app version (0.10.0) to block websites.</p>
      <button class="btn primary" data-a="closeSheet">Got it</button>`, "web-h");
    if (sh.confirm != null) return confirmView(sh, s, sheet, head);
    const fr = frozen(s), lk = locked(s);
    const lockBox = lk
      ? `<div class="web-lock on">${App.ICON.lock}<div><p class="sitem-title">${s.nnnUntil && s.nnnUntil >= s.lockUntil ? "No Nut November" : "Locked"}</p>
          <p class="sitem-sub">Adult sites stay blocked until ${esc(when(s.lockUntil))}. Nothing can be switched off before then.</p></div></div>`
      : `${s.november ? `<button class="web-nnn" data-a="webLock" data-v="0"><span class="nnn-badge" aria-hidden="true">${App.badgeSvg ? App.badgeSvg("nnn", 44) : ""}</span>
            <span class="grow"><span class="sitem-title">No Nut November</span><span class="sitem-sub">Lock adult sites until 1 December and earn the badge.</span></span>${App.ICON.chev}</button>` : ""}
         <p class="sblock-h">Lock adult sites for</p>
         <div class="xg-chips three">${LOCKS.map(d => `<button class="chip" data-a="webLock" data-v="${d}">${d === 1 ? "1 day" : `${d} days`}</button>`).join("")}</div>`;
    const custom = s.custom.map(d => `<li class="web-site"><span class="name">${esc(d)}</span>
        <button class="iconbtn plain" data-a="webDel" data-v="${esc(d)}" aria-label="Remove ${esc(d)}" ${fr ? "disabled" : ""}>${App.ICON.close}</button></li>`).join("");
    const needsOk = s.on && !s.consented;
    return sheet("", `${head("Website filter", "web-h")}
      <p class="muted">Blocks sites in every browser and app on this phone. Only the names of sites are checked, on the phone; nothing is sent anywhere.</p>
      <div class="sgroup web-group">
        ${row("globe", "#60a5fa", "Website filter", needsOk ? "Allow Ante's filter to start it" : s.on ? (s.running ? "On" : "Starting…") : "Off", App.toggle("webOn", s.on, "Website filter"))}
        ${row("adult", "#f472b6", "Adult sites", "About 980,000 sites, and any name with an adult word", App.toggle("webAdult", s.adult, "Adult sites"))}
        ${row("dice", "#fbbf24", "Gambling sites", "About 280,000 betting and casino sites", App.toggle("webGambling", s.gambling, "Gambling sites"))}
      </div>
      ${needsOk ? `<button class="btn primary" data-a="webConsent">Allow</button>` : ""}
      <div class="sblock web-block">${lockBox}</div>
      <div class="sblock web-block"><p class="sblock-h">Your sites</p>
        <div class="web-add"><input id="web-input" class="inline-input" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" placeholder="example.com" aria-label="Site to block">
          <button class="btn-sm" data-a="webAdd" ${s.custom.length >= MAX_CUSTOM ? "disabled" : ""}>Block</button></div>
        ${custom ? `<ul class="web-sites">${custom}</ul>` : `<p class="sitem-sub">Add any site, like a news or video site. Its apps stop working too.</p>`}</div>
      ${fr ? `<p class="fine">${lk ? "While the lock runs you can add sites, but not remove them or switch the filter off." : "Strict mode is on: you can add sites, but not remove them or switch the filter off."}</p>` : ""}
      <p class="fine">Works with Android's usual DNS. If Private DNS is set to a provider name (Settings → Network → Private DNS) or a browser uses its own Secure DNS, those sites can get through: set them to Automatic or Off.</p>`, "web-h");
  };
  function confirmView(sh, s, sheet, head) {
    const nnn = sh.confirm === 0, end = nnn ? s.november : Date.now() + sh.confirm * 86400000;
    return sheet("", `${head(nnn ? "No Nut November" : "Lock adult sites", "web-h")}
      ${nnn ? `<div class="badge-hero">${App.badgeSvg ? App.badgeSvg("nnn", 104) : ""}</div>` : ""}
      <p class="muted">Adult sites stay blocked until ${esc(when(end))}. You can't switch the filter off or unlock early, not even by deleting your data.</p>
      ${nnn ? `<p class="muted">Make it to 1 December and the No Nut November badge is yours.</p>` : ""}
      <div class="btn-row"><button class="btn quiet" data-a="webBack">Back</button><button class="btn primary" data-a="webLockGo">Lock</button></div>`, "web-h");
  }

  /* ---------- actions ---------- */
  const save = patch => {
    const s = load(); if (!s) return false;
    const n = Object.assign({ on: s.on, adult: s.adult, gambling: s.gambling, custom: s.custom }, patch);
    return A.setWebFilter(n.on, n.adult, n.gambling, JSON.stringify(n.custom));
  };
  const repaint = () => { load(); App.paintOverlay(); if (ui.view === "settings") App.render(); };
  const refused = () => App.toast(locked(st) ? "The lock is on. That works again when it ends." : "Strict mode is on. That works again when it ends.");
  window.anteWeb = raw => {
    let r; try { r = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    st = r;
    if (r.ok === false) App.toast("Without that permission the website filter can't start.");
    repaint();
  };
  Object.assign(App.act, {
    web() { if (!load()) { ui.sheet = { type: "web" }; App.paintOverlay(); return; } ui.sheet = { type: "web" }; App.SFX.play("tap"); App.paintOverlay(); },
    webOn() {
      const s = load(); if (!s) return;
      if (!save({ on: !s.on })) return refused();
      App.haptic("tap");
      if (!s.on && !load().consented) { A.webFilterConsent(); return; }
      if (!s.on) App.toast("Website filter on.");
      repaint();
    },
    webAdult() { const s = load(); if (!s) return; if (!save({ adult: !s.adult, on: s.on || !s.adult })) return refused(); App.haptic("tap"); afterOn(s); },
    webGambling() { const s = load(); if (!s) return; if (!save({ gambling: !s.gambling, on: s.on || !s.gambling })) return refused(); App.haptic("tap"); afterOn(s); },
    webConsent() { if (A.webFilterConsent) A.webFilterConsent(); },
    webAdd() {
      const s = load(), el = document.getElementById("web-input"); if (!s || !el) return;
      const d = cleanDomain(el.value);
      if (!d) { App.toast("That doesn't look like a website. Try example.com."); return; }
      if (s.custom.includes(d)) { el.value = ""; return; }
      if (!save({ custom: s.custom.concat([d]), on: true })) return refused();
      App.haptic("tap"); App.toast(`${d} is blocked.`); afterOn(s);
    },
    webDel(d) { const s = load(); if (!s) return; if (!save({ custom: s.custom.filter(x => x !== d.v) })) return refused(); App.haptic("tap"); repaint(); },
    webLock(d) { const n = parseInt(d.v, 10); if (n !== 0 && !LOCKS.includes(n)) return; ui.sheet = { type: "web", confirm: n }; App.SFX.play("tap"); App.paintOverlay(); },
    webBack() { ui.sheet = { type: "web" }; App.paintOverlay(); },
    webLockGo() {
      const sh = ui.sheet; if (!sh || sh.type !== "web" || sh.confirm == null) return;
      if (!A.webFilterLock(sh.confirm)) { App.toast("That lock can't start right now."); return; }
      App.haptic("win"); App.SFX.play("win");
      App.toast(sh.confirm === 0 ? "No Nut November is on. You've got this." : "Adult sites are locked.");
      ui.sheet = { type: "web" };
      const s = load(); if (s && !s.consented) A.webFilterConsent();
      repaint();
    },
  });
  /** Turning a list on also turns the filter on, which may need Android's permission first. */
  function afterOn(before) { const s = load(); if (!before.on && s.on && !s.consented) A.webFilterConsent(); repaint(); }

  /** "https://www.Example.com/path" → "example.com"; null when it isn't a site name. */
  function cleanDomain(raw) {
    let s = String(raw || "").trim().toLowerCase();
    s = s.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/^.*@/, "").replace(/:\d+$/, "").replace(/\.+$/, "").replace(/^www\./, "");
    if (!s || s.length > 253) return null;
    const labels = s.split(".");
    if (labels.length < 2 || labels.some(l => !/^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/.test(l))) return null;
    return s;
  }
  App.cleanDomain = cleanDomain;

  // Enter in the site field adds it.
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "web-input") { e.preventDefault(); App.act.webAdd(); } });
})();
