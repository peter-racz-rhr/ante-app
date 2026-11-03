/* Milestones: 53 badges you earn by using Ante (limits, categories, streaks, hours given back,
   Focus, Strict mode, the website filter, the tables) plus the Supporter badge. Earned badges are
   kept in prefs.earned ({id: time}); counters for events live in prefs.stats. Up to three badges
   (prefs.badges) show under your name. A new badge gets a full-screen moment. */
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
    trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12v4M9 20h6M10 16h4v4h-4z"/>',
    shield: '<path d="M12 3.5 5 6.3v5.4c0 4.3 3 7.4 7 8.8 4-1.4 7-4.5 7-8.8V6.3z"/><path d="m9 12 2.2 2.2L15.3 10"/>',
    globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.3 2.3 3.4 5 3.4 8s-1.1 5.7-3.4 8c-2.3-2.3-3.4-5-3.4-8s1.1-5.7 3.4-8z"/>',
    user: '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 19.5c1-3.5 3.6-5 6.5-5s5.5 1.5 6.5 5"/>',
    cloud: '<path d="M7.5 18h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7.5 18z"/>',
    star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z"/>',
    cards: '<rect x="4" y="6" width="10" height="14" rx="2"/><path d="M10 4h8a2 2 0 0 1 2 2v12"/>',
    palette: '<path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.6-.8 1.3-1.7-.4-1 .2-2.3 1.5-2.3H17a3 3 0 0 0 3-3c0-5-3.6-9-8-9z"/><circle cx="8" cy="11" r="1" fill="currentColor"/><circle cx="11" cy="7.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/>',
    chat: '<path d="M5 6h14v9H10l-4 3.5V15H5z"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  };

  const n = (k, c) => (c.stats[k] || 0);
  const streak = (id, d, tier) => ({ id, tier, g: "flame", name: d === 7 ? "A week" : d === 30 ? "A month" : d === 365 ? "A whole year" : `${d} days`, how: `Stay within your limits ${d} days in a row.`, test: c => c.streak >= d });
  const hours = (id, h, tier) => ({ id, tier, g: "clock", name: h === 1 ? "First hour" : `${h} hours`, how: `Get ${h} ${h === 1 ? "hour" : "hours"} back for your real life.`, test: c => c.hours >= h });
  /* Every badge: tier, glyph, name, how to earn it, and a test on the facts (c). */
  const BADGES = [
    { id: "supporter", tier: "gold", g: "heart", name: "Supporter", how: "Donated on Ko-fi to keep Ante free.", test: () => App.isSupporter && App.isSupporter(), crest: true },
    // Getting set up
    { id: "first", tier: "bronze", g: "limit", name: "First limit", how: "Set your first daily limit.", test: c => c.limits >= 1 },
    { id: "limits5", tier: "silver", g: "limit", name: "Five apps", how: "Put limits on 5 apps or categories.", test: c => c.limits >= 5 },
    { id: "limits10", tier: "gold", g: "limit", name: "Full control", how: "Put limits on 10 apps or categories.", test: c => c.limits >= 10 },
    { id: "category", tier: "bronze", g: "cat", name: "Sorted", how: "Limit a whole category of apps.", test: c => c.groups >= 1 },
    { id: "categories3", tier: "silver", g: "cat", name: "Organised", how: "Limit 3 categories.", test: c => c.groups >= 3 },
    { id: "schedule", tier: "bronze", g: "cal", name: "On schedule", how: "Set up a Focus schedule.", test: c => c.schedules >= 1 },
    { id: "schedules3", tier: "silver", g: "cal", name: "Routine", how: "Set up 3 Focus schedules.", test: c => c.schedules >= 3 },
    { id: "named", tier: "bronze", g: "user", name: "Hello", how: "Give yourself a name.", test: c => c.named },
    { id: "photo", tier: "bronze", g: "user", name: "Say cheese", how: "Add a profile picture.", test: c => c.photo },
    { id: "signin", tier: "bronze", g: "cloud", name: "Connected", how: "Sign in with Google.", test: c => c.signedIn },
    { id: "backup", tier: "silver", g: "cloud", name: "Safe and sound", how: "Back up to your Google Drive.", test: c => n("backup", c) >= 1 },
    { id: "stylist", tier: "bronze", g: "palette", name: "Stylist", how: "Change the colour or flavour.", test: c => n("theme", c) >= 1 },
    { id: "polyglot", tier: "bronze", g: "chat", name: "Polyglot", how: "Switch the language.", test: c => n("lang", c) >= 1 },
    { id: "recap", tier: "bronze", g: "star", name: "Look back", how: "Open your week in one card.", test: c => n("recap", c) >= 1 },
    // Focus and Strict mode
    { id: "focus", tier: "silver", g: "focus", name: "In the zone", how: "Start a Focus session.", test: c => c.focus || n("focus", c) >= 1 },
    { id: "focus10", tier: "gold", g: "focus", name: "Deep work", how: "Start 10 Focus sessions.", test: c => n("focus", c) >= 10 },
    { id: "focus50", tier: "diamond", g: "focus", name: "Monk mode", how: "Start 50 Focus sessions.", test: c => n("focus", c) >= 50 },
    { id: "strict", tier: "gold", g: "lock", name: "No way out", how: "Turn on Strict mode.", test: c => c.strict || n("strict", c) >= 1 },
    { id: "strict7", tier: "gold", g: "lock", name: "Locked in", how: "Lock Strict mode for 7 days or more.", test: c => n("strictMax", c) >= 7 },
    { id: "strict30", tier: "diamond", g: "lock", name: "Iron will", how: "Lock Strict mode for 30 days or more.", test: c => n("strictMax", c) >= 30 },
    { id: "tablesoff", tier: "silver", g: "snow", name: "Cold turkey", how: "Switch the tables off.", test: c => c.tablesOff },
    // Streaks
    streak("streak3", 3, "bronze"), streak("streak7", 7, "silver"), streak("streak14", 14, "silver"), streak("streak30", 30, "gold"),
    streak("streak60", 60, "gold"), streak("streak100", 100, "diamond"), streak("streak365", 365, "diamond"),
    // Hours back
    hours("hours1", 1, "bronze"), hours("hours10", 10, "bronze"), hours("hours25", 25, "silver"), hours("hours50", 50, "silver"),
    hours("hours100", 100, "gold"), hours("hours250", 250, "gold"), hours("hours500", 500, "diamond"),
    // Website filter
    { id: "web", tier: "bronze", g: "globe", name: "Clean feed", how: "Turn on the website filter.", test: c => c.web },
    { id: "webgamble", tier: "silver", g: "shield", name: "No bets", how: "Block gambling sites.", test: c => c.webGambling },
    { id: "websites5", tier: "silver", g: "globe", name: "Gatekeeper", how: "Block 5 sites of your own.", test: c => c.webCustom >= 5 },
    { id: "weblock7", tier: "gold", g: "shield", name: "Promise kept", how: "Lock adult sites for 7 days or more.", test: c => n("webLockMax", c) >= 7 },
    { id: "weblock30", tier: "diamond", g: "shield", name: "Unshakeable", how: "Lock adult sites for 30 days or more.", test: c => n("webLockMax", c) >= 30 },
    { id: "nnn", tier: "special", g: "moon", name: "No Nut November", how: "Keep the No Nut November lock until 1 December.", test: c => c.nnn },
    { id: "nnnstart", tier: "special", g: "moon", name: "Challenge accepted", how: "Start No Nut November.", test: c => c.nnnStarted },
    // The tables
    { id: "round1", tier: "bronze", g: "chip", name: "First bet", how: "Play a round at any table.", test: c => n("round", c) >= 1 },
    { id: "round100", tier: "silver", g: "chip", name: "Regular", how: "Play 100 rounds.", test: c => n("round", c) >= 100 },
    { id: "round1000", tier: "gold", g: "chip", name: "Night owl", how: "Play 1,000 rounds.", test: c => n("round", c) >= 1000 },
    { id: "win1", tier: "bronze", g: "trophy", name: "Beginner's luck", how: "Win a round.", test: c => n("win", c) >= 1 },
    { id: "win50", tier: "silver", g: "trophy", name: "On a roll", how: "Win 50 rounds.", test: c => n("win", c) >= 50 },
    { id: "win500", tier: "gold", g: "trophy", name: "Card shark", how: "Win 500 rounds.", test: c => n("win", c) >= 500 },
    { id: "bigwin", tier: "silver", g: "chip", name: "High roller", how: "Win 10× your stake or more.", test: c => n("bigwin", c) >= 1 },
    { id: "bigwin10", tier: "gold", g: "chip", name: "Jackpot hunter", how: "Win 10× your stake 10 times.", test: c => n("bigwin", c) >= 10 },
    { id: "games5", tier: "silver", g: "cards", name: "Explorer", how: "Play 5 different tables.", test: c => c.games >= 5 },
    { id: "games10", tier: "gold", g: "cards", name: "Seen it all", how: "Play all 10 tables.", test: c => c.games >= 10 },
    { id: "spin", tier: "bronze", g: "spin", name: "Lucky spin", how: "Take the daily spin.", test: c => n("spin", c) >= 1 },
    { id: "spin7", tier: "silver", g: "spin", name: "Spin week", how: "Take the daily spin 7 times.", test: c => n("spin", c) >= 7 },
    { id: "spin30", tier: "gold", g: "spin", name: "Spin month", how: "Take the daily spin 30 times.", test: c => n("spin", c) >= 30 },
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
    const S = App.S, m = App.modes ? App.modes() : {}, p = App.P.get(), ACC = App.ACC || {};
    const w = (App.webStatus && App.webStatus()) || {};
    return {
      stats: p.stats || {}, games: ((p.stats || {}).games || []).length,
      limits: (S.limits || []).length, groups: Object.keys(S.groups || {}).length, schedules: (S.schedules || []).length,
      focus: !!m.focus, strict: !!m.strict, streak: App.streak ? App.streak() : 0, hours: App.hoursAdded ? App.hoursAdded() : 0,
      named: !!p.name, photo: !!ACC.photo, signedIn: !!ACC.signedIn, tablesOff: App.tablesOn ? !App.tablesOn() : false,
      web: !!w.on, webGambling: !!(w.on && w.gambling), webCustom: (w.custom || []).length,
      nnn: !!w.nnnDone, nnnStarted: !!w.nnnUntil,
    };
  }
  const earned = () => Object.assign({}, App.P.get().earned || {});
  // The Supporter badge is only ever as real as the signed Supporter status, never a stored flag.
  App.hasBadge = id => (id === "supporter" ? !!(App.isSupporter && App.isSupporter()) : !!earned()[id]);

  /** Gives [ids]; [quiet] skips the celebration (someone updating with lots already done). */
  function award(ids, quiet) {
    if (!ids.length) return;
    const e = earned(), now = Date.now();
    ids.forEach(id => { e[id] = now; });
    App.P.set({ earned: e });
    if (!quiet) ids.forEach(id => celebrate(id));
  }
  /** Gives the badges whose condition is true now. Writes nothing when nothing changed. */
  App.syncMilestones = () => {
    const p = App.P.get(), have = p.earned || {}, c = facts();
    const fresh = BADGES.filter(b => !have[b.id] && b.id !== "supporter" && b.test(c)).map(b => b.id);
    award(fresh, !p.earned && fresh.length > 1);
  };
  /**
   * Counts an event and gives any badge it completes: "round" ({game}), "win", "bigwin", "spin",
   * "focus", "strict" ({days}), "webLock" ({days}), "backup", "theme", "lang", "recap", "supporter".
   */
  App.milestone = (ev, x) => {
    if (ev === "supporter") { if (!earned().supporter) award(["supporter"]); return; }
    const p = App.P.get(), st = Object.assign({}, p.stats || {});
    st[ev] = (st[ev] || 0) + 1;
    if (ev === "round" && x && x.game && !(st.games || []).includes(x.game)) st.games = (st.games || []).concat([String(x.game).slice(0, 20)]).slice(0, 20);
    if (ev === "strict" && x) st.strictMax = Math.max(st.strictMax || 0, x.days | 0);
    if (ev === "webLock" && x) st.webLockMax = Math.max(st.webLockMax || 0, x.days | 0);
    App.P.set({ stats: st });
    App.syncMilestones();
  };

  /* ---------- the big moment ---------- */
  const queue = [];
  let showing = false;
  function celebrate(id) {
    if (!byId[id] || window.__anteNoBadgePop) return; // automated tests turn the moment off

    queue.push(id);
    if (!showing) setTimeout(next, 350);
  }
  function next() {
    // Péter's letter goes first; the badge waits until it's closed.
    if (document.querySelector(".ltr")) { setTimeout(next, 600); return; }
    const id = queue.shift();
    if (!id) { showing = false; return; }
    showing = true;
    const b = byId[id], left = queue.length;
    const el = document.createElement("div");
    el.className = "bpop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "bpop-h");
    el.style.setProperty("--glow", TIER[b.tier][1]);
    const sparks = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i * 360) / 14}deg;--d:${(0.15 + (i % 5) * 0.06).toFixed(2)}s"></i>`).join("");
    el.innerHTML = `<div class="bpop-rays" aria-hidden="true"></div>
      <div class="bpop-card">
        <p class="bpop-eye">Badge unlocked</p>
        <div class="bpop-medal"><span class="bpop-glow" aria-hidden="true"></span><span class="bpop-sparks" aria-hidden="true">${sparks}</span>${App.badgeSvg(id, 148)}</div>
        <h2 class="bpop-name" id="bpop-h">${esc(b.name)}</h2>
        <p class="bpop-how">${esc(b.how)}</p>
        <div class="bpop-btns">${id === "supporter" ? "" : `<button class="btn quiet" data-pop="show">Show on profile</button>`}<button class="btn primary" data-pop="ok">${left ? "Next" : "Nice"}</button></div>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    App.haptic("win"); if (App.SFX) App.SFX.play("bigWin");
    const FX = window.AnteFX; if (FX && FX.burst) setTimeout(() => FX.burst(el.querySelector(".bpop-medal"), { power: 1.4, count: 70 }), 380);
    const close = () => { el.classList.remove("in"); el.classList.add("out"); setTimeout(() => { el.remove(); next(); }, 260); };
    el.addEventListener("click", e => {
      const t = e.target.closest("[data-pop]");
      if (!t) return;
      if (t.dataset.pop === "show") showOnProfile(id);
      close();
    });
  }
  App.celebrateBadge = celebrate;
  function showOnProfile(id) {
    const cur = (App.P.get().badges || []).filter(x => byId[x] && x !== id);
    App.P.set({ badges: [id].concat(cur).slice(0, SHOW_MAX) });
    if (ui.view === "profile") App.render();
  }

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
  const SHORT = 12; // three rows of four; the third fades out under "Show all"
  App.milestonesCard = () => {
    const list = BADGES.map(b => ({ b, on: App.hasBadge(b.id) })).sort((x, y) => (y.on - x.on));
    const got = list.filter(x => x.on).length, all = !!ui.badgesAll;
    const tiles = (all ? list : list.slice(0, SHORT)).map(({ b, on }) =>
      `<button class="mbadge${on ? " on" : ""}" data-a="badge" data-v="${b.id}" aria-label="${esc(b.name)}${on ? "" : " (locked)"}">${App.badgeSvg(b.id, 46, !on)}<span class="mb-name">${esc(b.name)}</span></button>`).join("");
    return `<section class="panel pcard" aria-labelledby="pm-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#f5c542" aria-hidden="true">${App.ICON.star || App.ICON.heart}</span><h2 class="h3" id="pm-h">Milestones</h2></div>
        <span class="streak"><span class="dotnum">${got}</span>/${BADGES.length}</span></div>
      <div class="mgrid-wrap${all ? " all" : ""}"><div class="mgrid" id="mgrid">${tiles}</div></div>
      <button class="btn quiet mgrid-more" data-a="badgesMore" aria-expanded="${all}">${all ? "Show fewer" : `Show all ${BADGES.length}`}</button>
      <p class="sitem-sub">Tap a badge you've earned to show it under your name.</p></section>`;
  };
  App.afterMilestones = () => {};

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
    badges() { const el = document.querySelector(".mgrid-wrap"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); },
    badgesMore() {
      ui.badgesAll = !ui.badgesAll; App.SFX.play("tap"); App.render();
      if (!ui.badgesAll) { const el = document.querySelector(".mgrid-wrap"); if (el) el.scrollIntoView({ block: "center" }); }
    },
    badgeShow(d) {
      if (!byId[d.v] || d.v === "supporter" || !App.hasBadge(d.v)) return;
      const cur = (App.P.get().badges || []).filter(id => byId[id]);
      const next = cur.includes(d.v) ? cur.filter(id => id !== d.v) : cur.concat([d.v]).slice(0, SHOW_MAX);
      App.P.set({ badges: next }); App.haptic("tap"); ui.sheet = null; App.render(); App.paintOverlay();
    },
  });
})();
