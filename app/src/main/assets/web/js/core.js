/* Ante UI core: shared state, helpers and icons. Screens live in home.js, tables.js, profile.js
   and onboarding.js; app.js does sheets, navigation, rendering and boot. All share window.App. */
(function () {
  "use strict";
  const A = window.Ante;
  const CTX = A.context();
  const BLOCK = CTX.mode === "block";
  const App = window.App = {
    A, G: window.AnteGames, FX: window.AnteFX, CH: window.AnteCharts, P: window.AntePrefs, L: window.AnteLegal,
    SFX: window.AnteSFX || { play() {}, muted: true, toggle() { return true; }, reelStart() {}, reelStop() {} },
    CTX, BLOCK,
    S: A.state(), ACC: A.account(),
    views: {}, act: {},
    $app: document.getElementById("app"), $overlay: document.getElementById("overlay"),
  };
  App.ui = {
    view: BLOCK ? "block" : App.ACC.onboarded ? "home" : "welcome",
    welcomeStep: 0, range: "week", game: null, sheet: null, toast: null, doc: null, back: null,
    stakePkg: BLOCK ? CTX.pkg : null, stake: 300, openPick: 300, busy: false, res: null, round: null,
  };

  /* ---------- formatting ---------- */
  const pad = App.pad = n => String(n).padStart(2, "0");
  App.fmt = s => {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  };
  App.fmtH = sec => { // 1h 05m / 34m, for totals
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h ? `${h}h ${pad(m)}m` : `${m}m`;
  };
  App.signed = d => (d > 0 ? "+" : d < 0 ? "−" : "±") + App.fmt(Math.abs(d));
  App.esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  App.localKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  /* ---------- state helpers ---------- */
  App.refresh = () => { App.S = A.state(); App.ACC = A.account(); };
  App.lim = pkg => App.S.limits.find(l => l.pkg === pkg);
  App.labelOf = pkg => (App.lim(pkg) || {}).label || (pkg === CTX.pkg ? CTX.label : pkg);
  App.displayName = () => App.P.get().name || App.ACC.name || "";
  /** The profile picture if there is one, else initials. Only data: images (made by the app) are used. */
  App.avatar = (cls, extra) => {
    const p = App.ACC && App.ACC.photo, name = App.displayName ? App.displayName() : "";
    return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p || "")
      ? `<img class="avatar ${cls || ""}" src="${p}" alt="" ${extra || ""}>`
      : `<span class="avatar ${cls || ""}" ${extra || ""}>${App.esc(App.initials(name))}</span>`;
  };
  App.initials = n => (n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "A";

  const icons = App.iconCache = {};
  if (CTX.pkg && CTX.icon) icons[CTX.pkg] = CTX.icon;
  App.iconOf = pkg => {
    if (!(pkg in icons)) { try { icons[pkg] = A.icon(pkg) || ""; } catch (e) { icons[pkg] = ""; } }
    return icons[pkg];
  };
  /** The phone's real app icon (from Android), or a monogram in the browser demo. */
  App.appIcon = (pkg, cls) => {
    const src = App.iconOf(pkg), l = App.labelOf(pkg);
    return src
      ? `<img class="appicon ${cls || ""}" src="${App.esc(src)}" alt="" width="44" height="44">`
      : `<span class="appicon mono ${cls || ""}" aria-hidden="true">${App.esc(l.slice(0, 2))}</span>`;
  };

  /* ---------- feedback ---------- */
  App.haptic = kind => { if (!App.P.get().haptics) return; try { A.haptic(kind); } catch (e) { /* no-op */ } };
  App.chipFx = () => { App.haptic("tap"); App.SFX.play("chip"); };
  App.toast = msg => {
    App.ui.toast = msg; App.paintOverlay();
    clearTimeout(App.toast.t); App.toast.t = setTimeout(() => { App.ui.toast = null; App.paintOverlay(); }, 2600);
  };
  window.addEventListener("ante-mock", e => App.toast(e.detail));

  /* Shrinks [data-fit] text until it fits its box on one line (the big clock). */
  /* Shrinks [data-fit] text to its box. Batched: write all, read all, write all, so the page is
     laid out once instead of once per number. */
  App.fitText = () => {
    const els = [...document.querySelectorAll("[data-fit]")];
    const max = els.map(el => Number(el.dataset.fit) || 160);
    els.forEach((el, i) => { el.style.fontSize = max[i] + "px"; });
    const ratio = els.map(el => { const box = el.parentElement.clientWidth; return box ? box / Math.max(1, el.scrollWidth) : 1; });
    els.forEach((el, i) => { if (ratio[i] < 1) el.style.fontSize = Math.floor(max[i] * ratio[i] * 0.98) + "px"; });
  };

  const ic = (d, w = 22, extra = "") => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  App.ICON = {
    back: ic('<path d="M15 5l-7 7 7 7"/>', 20),
    chev: ic('<path d="M9 5l7 7-7 7"/>', 18),
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>', 20),
    plus: ic('<path d="M12 5v14M5 12h14"/>', 18),
    home: ic('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
    // two cards: the back one shows only its edge, so no lines cross the front card
    play: ic('<rect x="9" y="3.5" width="11" height="16" rx="2.4"/><path d="M9 6.3 5.6 7.2a2 2 0 0 0-1.4 2.4l2.9 10.6a2 2 0 0 0 2.4 1.4l3.3-.9"/><path d="M14.5 8.6 12.3 11.5l2.2 2.9 2.2-2.9z"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
    moon: ic('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
    half: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    soundOn: ic('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>', 20),
    soundOff: ic('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>', 20),
    lock: ic('<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 18),
    coffee: ic('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2M12 3.5v2"/>', 20),
    doc: ic('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', 20),
    // cog (shape after Lucide "settings", ISC licence)
    gear: ic('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    trash: ic('<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6"/>'),
    heart: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    camera: ic('<path d="M4 8.5A2 2 0 0 1 6 6.5h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.5"/>'),
    vibrate: ic('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4.5 8.5v7M19.5 8.5v7M2 10.5v3M22 10.5v3"/>'),
    shield: ic('<path d="M12 3.5 5 6.3v5.4c0 4.3 3 7.4 7 8.8 4-1.4 7-4.5 7-8.8V6.3z"/><path d="m9 12 2.2 2.2L15.3 10"/>'),
    battery: ic('<rect x="3" y="7.5" width="16" height="9" rx="2.2"/><path d="M21 10.5v3M6.5 10.5v3M9.5 10.5v3"/>'),
    clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    type: ic('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
    info: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.2"/>'),
    palette: ic('<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>', 20),
    logo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 7.5h7v1.2L13 12l2.5 3.3v1.2h-7v-1.2L11 12 8.5 8.7z" fill="currentColor"/></svg>',
    google: '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
  };
  App.soundBtn = () => `<button class="iconbtn sound" data-a="sound" aria-pressed="${!App.SFX.muted}" aria-label="${App.SFX.muted ? "Turn sound on" : "Turn sound off"}">${App.SFX.muted ? App.ICON.soundOff : App.ICON.soundOn}</button>`;
  App.backBtn = (action, label) => `<button class="iconbtn" data-a="${action}" aria-label="${App.esc(label)}">${App.ICON.back}</button>`;
  App.toggle = (action, on, label) => `<button class="switch" role="switch" aria-checked="${!!on}" data-a="${action}" aria-label="${App.esc(label)}"><i></i></button>`;
})();
