/* Milestones: badges you earn by using Ante (limits, streaks, hours given back, Focus, Strict
   mode, schedules, a big win) plus the Supporter badge. Earned badges are kept in prefs.earned
   ({id: time}) so they stay even when the reason goes away, and up to three of them (prefs.badges)
   show under your name on Profile. */
(function () {
  "use strict";
  const App = window.App, esc = App.esc, ui = App.ui;
  const SHOW_MAX = 3;

  /* Tier colours: [light, mid, dark] for the medal rim. */
  const TIER = {
    bronze: ["#f2c39b", "#c9803f", "#7a4419"],
    silver: ["#f4f6fa", "#aeb6c4", "#5d6675"],
    gold: ["#fff1b0", "#f5c542", "#a06a00"],
    diamond: ["#e0fbff", "#67e8f9", "#0e7490"],
    special: ["#ffd9ec", "#f472b6", "#9d174d"],
  };
  const G = {
    limit: '<path d="M8 4h8M8 20h8M9 4c0 4 6 5 6 8s-6 4-6 8M15 4c0 4-6 5-6 8s6 4 6 8"/>',
    cat: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .2 1.6 1 2.6 2 3C11.2 8.6 11 5.6 12 3z"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    chip: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
    spin: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5.6 5.6M12 12 4.6 9.2"/>',
    heart: '<path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z" fill="currentColor"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  };

  /* Every badge: tier, glyph, name, how to earn it, and a test on the current state (c). */
  const BADGES = [
    { id: "supporter", tier: "gold", g: "heart", name: "Supporter", how: "Donated on Ko-fi to keep Ante free.", test: () => App.isSupporter && App.isSupporter(), crest: true },
    { id: "first", tier: "bronze", g: "limit", name: "First limit", how: "Set your first daily limit.", test: c => c.limits > 0 },
    { id: "category", tier: "bronze", g: "cat", name: "Sorted", how: "Limit a whole category of apps.", test: c => c.groups > 0 },
    { id: "schedule", tier: "bronze", g: "cal", name: "On schedule", how: "Set up a Focus schedule.", test: c => c.schedules > 0 },
    { id: "focus", tier: "silver", g: "focus", name: "In the zone", how: "Start a Focus session.", test: c => c.focus },
    { id: "strict", tier: "gold", g: "lock", name: "No way out", how: "Turn on Strict mode.", test: c => c.strict },
    { id: "streak3", tier: "bronze", g: "flame", name: "3 days", how: "Stay within your limits 3 days in a row.", test: c => c.streak >= 3 },
    { id: "streak7", tier: "silver", g: "flame", name: "A week", how: "Stay within your limits 7 days in a row.", test: c => c.streak >= 7 },
    { id: "streak30", tier: "gold", g: "flame", name: "A month", how: "Stay within your limits 30 days in a row.", test: c => c.streak >= 30 },
    { id: "streak100", tier: "diamond", g: "flame", name: "100 days", how: "Stay within your limits 100 days in a row.", test: c => c.streak >= 100 },
    { id: "hours1", tier: "bronze", g: "clock", name: "First hour", how: "Get 1 hour back for your real life.", test: c => c.hours >= 1 },
    { id: "hours10", tier: "silver", g: "clock", name: "10 hours", how: "Get 10 hours back for your real life.", test: c => c.hours >= 10 },
    { id: "hours50", tier: "gold", g: "clock", name: "50 hours", how: "Get 50 hours back for your real life.", test: c => c.hours >= 50 },
    { id: "hours100", tier: "diamond", g: "clock", name: "100 hours", how: "Get 100 hours back for your real life.", test: c => c.hours >= 100 },
    { id: "nnn", tier: "special", g: "moon", name: "No Nut November", how: "Lock the adult site filter for all of November.", test: c => c.nnn },
    { id: "spin", tier: "bronze", g: "spin", name: "Lucky spin", how: "Take the daily spin.", test: () => false },
    { id: "bigwin", tier: "silver", g: "chip", name: "High roller", how: "Win 10× your stake or more at a table.", test: () => false },
  ];
  const byId = Object.fromEntries(BADGES.map(b => [b.id, b]));
  App.BADGES = BADGES;

  /* ---------- the medal ---------- */
  let uid = 0;
  /** A badge medal as SVG. Unearned badges are drawn flat and grey. */
  App.badgeSvg = (id, size, off) => {
    const b = byId[id]; if (!b) return "";
    const t = off ? ["#5b5f6b", "#3d414b", "#262930"] : TIER[b.tier], k = "bg" + (++uid);
    // The Supporter badge sits on a gold seal: a 24-point star behind the medal.
    const rays = b.crest ? `<polygon fill="url(#${k}r)" points="${Array.from({ length: 48 }, (_, i) => {
      const a = (i * Math.PI) / 24 - Math.PI / 2, r = i % 2 ? 27.5 : 31.5;
      return `${(32 + Math.cos(a) * r).toFixed(1)},${(32 + Math.sin(a) * r).toFixed(1)}`;
    }).join(" ")}"/>` : "";
    return `<svg class="badge-svg${off ? " off" : ""}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
      <defs><linearGradient id="${k}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset=".55" stop-color="${t[1]}"/><stop offset="1" stop-color="${t[2]}"/></linearGradient>
        <radialGradient id="${k}f" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${t[1]}"/><stop offset="1" stop-color="${t[2]}"/></radialGradient></defs>
      ${rays}<circle cx="32" cy="32" r="${b.crest ? 25 : 27}" fill="url(#${k}r)"/><circle cx="32" cy="32" r="${b.crest ? 25 : 27}" fill="none" stroke="${t[2]}" stroke-opacity=".5" stroke-width=".8"/><circle cx="32" cy="32" r="21.5" fill="url(#${k}f)"/>
      <circle cx="32" cy="32" r="21.5" fill="none" stroke="${t[0]}" stroke-opacity=".55" stroke-width="1"/>
      <path d="M14 24a20 20 0 0 1 22-13" fill="none" stroke="#fff" stroke-opacity="${off ? 0.08 : 0.35}" stroke-width="2.4" stroke-linecap="round"/>
      <g transform="translate(20 20)" fill="none" stroke="${off ? "#9aa0ab" : "#fff"}" color="${off ? "#9aa0ab" : "#fff"}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${G[b.g]}</g></svg>`;
  };

  /* ---------- earning ---------- */
  function facts() {
    const S = App.S, m = App.modes ? App.modes() : {};
    return {
      limits: (S.limits || []).length, groups: Object.keys(S.groups || {}).length, schedules: (S.schedules || []).length,
      focus: !!m.focus, strict: !!m.strict, streak: App.streak ? App.streak() : 0, hours: App.hoursAdded ? App.hoursAdded() : 0,
      nnn: !!(App.nnnDone && App.nnnDone()),
    };
  }
  const earned = () => Object.assign({}, App.P.get().earned || {});
  App.hasBadge = id => !!earned()[id] || (id === "supporter" && App.isSupporter && App.isSupporter());

  function award(ids, quiet) {
    if (!ids.length) return;
    const e = earned(), now = Date.now();
    ids.forEach(id => { e[id] = now; });
    App.P.set({ earned: e });
    if (quiet) return;
    const b = byId[ids[ids.length - 1]];
    const say = () => { App.toast(ids.length > 1 ? `${ids.length} new badges on your profile.` : `New badge: ${b.name}`); App.haptic("win"); };
    // Never talk over another message (an update note, a win): wait until it's gone.
    const later = () => (App.ui.toast ? setTimeout(later, 900) : say());
    setTimeout(later, 400);
  }
  /** Gives the badges whose condition is true now. Someone updating with lots already done gets
      them quietly instead of a pile of toasts. Writes nothing when nothing changed. */
  App.syncMilestones = () => {
    const p = App.P.get(), have = p.earned || {}, c = facts();
    const fresh = BADGES.filter(b => !have[b.id] && b.id !== "supporter" && b.test(c)).map(b => b.id);
    award(fresh, !p.earned && fresh.length > 1);
  };
  /** Event badges: "spin", "bigwin", "supporter". */
  App.milestone = id => { if (byId[id] && !earned()[id]) award([id]); };

  /* ---------- on Profile ---------- */
  /** The badges chosen to show under your name; the Supporter badge leads when you have it. */
  function shown() {
    const p = App.P.get(), pick = (p.badges || []).filter(id => byId[id] && App.hasBadge(id) && id !== "supporter");
    return (App.isSupporter && App.isSupporter() ? ["supporter"] : []).concat(pick).slice(0, SHOW_MAX + 1);
  }
  App.badgeRow = () => {
    const ids = shown();
    if (!ids.length) return "";
    return `<button class="badge-row" data-a="badges" aria-label="Your badges">${ids.map(id => id === "supporter"
      ? `<span class="sup-badge">${App.badgeSvg(id, 18)}<span>Supporter</span></span>`
      : `<span class="badge-mini" title="${esc(byId[id].name)}">${App.badgeSvg(id, 24)}</span>`).join("")}</button>`;
  };
  App.milestonesCard = () => {
    const n = BADGES.filter(b => App.hasBadge(b.id)).length;
    const tiles = BADGES.map(b => {
      const on = App.hasBadge(b.id);
      return `<button class="mbadge${on ? " on" : ""}" data-a="badge" data-v="${b.id}" aria-label="${esc(b.name)}${on ? "" : " (locked)"}">${App.badgeSvg(b.id, 46, !on)}<span class="mb-name">${esc(b.name)}</span></button>`;
    }).join("");
    return `<section class="panel pcard" aria-labelledby="pm-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#f5c542" aria-hidden="true">${App.ICON.star || App.ICON.heart}</span><h2 class="h3" id="pm-h">Milestones</h2></div>
        <span class="streak"><span class="dotnum">${n}</span>/${BADGES.length}</span></div>
      <div class="mgrid">${tiles}</div>
      <p class="sitem-sub">Tap a badge you've earned to show it under your name.</p></section>`;
  };

  App.sheetViews = App.sheetViews || {};
  App.sheetViews.badge = (sh, sheet, head) => {
    const b = byId[sh.id], on = App.hasBadge(b.id), at = earned()[b.id];
    const showing = (App.P.get().badges || []).includes(b.id), full = (App.P.get().badges || []).length >= SHOW_MAX;
    const btn = b.id === "supporter"
      ? (on ? `<button class="btn primary" data-a="closeSheet">Done</button>` : `<button class="btn primary" data-a="supporter">How to get it</button>`)
      : !on ? `<button class="btn primary" data-a="closeSheet">Got it</button>`
      : `<button class="btn ${showing ? "quiet" : "primary"}" data-a="badgeShow" data-v="${b.id}" ${!showing && full ? "disabled" : ""}>${showing ? "Hide from profile" : "Show on profile"}</button>`;
    return sheet("", `${head(b.name, "badge-h")}
      <div class="badge-hero${on ? "" : " off"}">${App.badgeSvg(b.id, 120, !on)}
        <p class="muted">${esc(b.how)}</p>
        ${on && at ? `<p class="fine">Earned ${esc(new Date(at).toLocaleDateString(App.locale()))}</p>` : on ? "" : `<p class="fine">Not earned yet</p>`}
        ${on && !showing && full && b.id !== "supporter" ? `<p class="fine">You show 3 badges already. Hide one first.</p>` : ""}</div>
      ${btn}`, "badge-h");
  };

  Object.assign(App.act, {
    badge(d) { if (!byId[d.v]) return; ui.sheet = { type: "badge", id: d.v }; App.SFX.play("tap"); App.paintOverlay(); },
    badges() { const el = document.querySelector(".mgrid"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); },
    badgeShow(d) {
      if (!byId[d.v] || d.v === "supporter" || !App.hasBadge(d.v)) return;
      const cur = (App.P.get().badges || []).filter(id => byId[id]);
      const next = cur.includes(d.v) ? cur.filter(id => id !== d.v) : cur.concat([d.v]).slice(0, SHOW_MAX);
      App.P.set({ badges: next }); App.haptic("tap"); ui.sheet = null; App.render(); App.paintOverlay();
    },
  });
})();
