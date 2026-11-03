/* window.Ante: one API for the UI. On the phone it calls the Kotlin bridge (window.AnteNative).
   In a desktop browser it runs a mock with the same rules, so the whole UI can be tested there.
   Mock options in the URL: ?mode=block&pkg=com.instagram.android&acc=1&note=Session%20over. */
(function () {
  "use strict";
  const N = window.AnteNative;

  function parse(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }

  const BAD = { ok: false, error: "bet" };
  if (N) {
    const has = name => typeof N[name] === "function";
    const D = has("play") ? null : window.AnteDealer((pkg, sec) => N.bet(pkg, sec | 0), (pkg, game, stake, ret) => N.settle(pkg, game, stake | 0, Math.round(ret)));
    // Plinko, Crash, Dice, Baccarat and Keno are dealt natively from 0.9.0.
    const appVersion = (() => { try { return String(parse(N.versions(), {}).app || ""); } catch (e) { return ""; } })();
    const atLeast = (v, want) => { const a = v.split(".").map(Number), b = want.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
    window.Ante = {
      native: true,
      has09: atLeast(appVersion, "0.9.0"),
      state: () => parse(N.state(), { limits: [], ledger: [] }),
      context: () => parse(N.context(), { mode: "main" }),
      apps: () => parse(N.apps(), []),
      icon: pkg => N.icon(pkg),
      setLimit: (pkg, label, sec) => N.setLimit(pkg, label, sec | 0),
      removeLimit: pkg => N.removeLimit(pkg), // false during Focus or Strict mode
      setGroup: (key, label, members, sec) => (has("setGroup") ? N.setGroup(key, label, JSON.stringify(members), sec | 0) : false),
      // Table rounds: dealt by the phone since 0.6.0; older apps run them here with bet/settle.
      play: (pkg, game, stake, args) => (D ? D.play(pkg, game, stake | 0, args) : parse(N.play(pkg, game, stake | 0, JSON.stringify(args || {})), BAD)),
      bjDeal: (pkg, stake) => (D ? D.bjDeal(pkg, stake | 0) : parse(N.bjDeal(pkg, stake | 0), BAD)),
      bjHit: () => (D ? D.bjHit() : parse(N.bjHit(), BAD)),
      bjDouble: () => (D ? D.bjDouble() : parse(N.bjDouble(), BAD)),
      bjStand: () => (D ? D.bjStand() : parse(N.bjStand(), BAD)),
      pkDeal: (pkg, stake) => (D ? D.pkDeal(pkg, stake | 0) : parse(N.pkDeal(pkg, stake | 0), BAD)),
      pkDraw: held => (D ? D.pkDraw(held | 0) : parse(N.pkDraw(held | 0), BAD)),
      freeSpin: pkg => (has("freeSpin") ? parse(N.freeSpin(pkg), BAD) : { ok: false, error: "old" }),
      setSchedule: sc => (has("setSchedule") ? N.setSchedule(sc.id | 0, String(sc.label || ""), sc.days | 0, sc.startMin | 0, sc.endMin | 0, sc.on !== false) : 0),
      removeSchedule: id => (has("removeSchedule") ? N.removeSchedule(id | 0) : false),
      // Ko-fi supporter (0.10.0+): status, and a check that answers on window.anteSupporter.
      supporter: () => (has("supporter") ? parse(N.supporter(), { supporter: false, configured: false }) : { supporter: false, configured: false }),
      checkSupporter: has("checkSupporter") ? () => N.checkSupporter() : undefined,
      sendFeedback: has("sendFeedback") ? (subject, text) => N.sendFeedback(String(subject), String(text)) : undefined,
      redeemSupporter: has("redeemSupporter") ? code => N.redeemSupporter(String(code || "")) : undefined,
      // Website filter (0.10.0+).
      webFilter: has("webFilter") ? () => parse(N.webFilter(), null) : undefined,
      setWebFilter: (on, adult, gambling, custom) => (has("setWebFilter") ? N.setWebFilter(!!on, !!adult, !!gambling, String(custom)) : false),
      webFilterLock: days => (has("webFilterLock") ? N.webFilterLock(days | 0) : false),
      webFilterConsent: () => (has("webFilterConsent") ? N.webFilterConsent() : false),
      // Your data (0.7.0+): Drive backup, download, delete. Missing on older apps.
      savePrefs: json => { if (has("savePrefs")) N.savePrefs(json); },
      backupStatus: has("backupStatus") ? () => parse(N.backupStatus(), { auto: false, lastAt: 0 }) : undefined,
      setAutoBackup: on => { if (has("setAutoBackup")) N.setAutoBackup(!!on); },
      backupNow: () => N.backupNow(),
      restoreBackup: () => N.restoreBackup(),
      exportData: () => (has("exportData") ? N.exportData() : false),
      shareText: (subject, text) => (has("shareText") ? N.shareText(String(subject), String(text)) : false),
      deleteAllData: drive => (has("deleteAllData") ? N.deleteAllData(!!drive) : false),
      open: (pkg, sec) => N.open(pkg, sec | 0),
      closeBlock: () => N.closeBlock(),
      openAnte: () => N.openAnte(),
      openAccessibilitySettings: () => N.openAccessibilitySettings(),
      openAppInfo: () => N.openAppInfo(),
      haptic: kind => { try { N.haptic(kind); } catch (e) { /* older bridge */ } },
      account: () => parse(N.account(), { signedIn: false, onboarded: true }),
      signInWithGoogle: () => N.signInWithGoogle(),
      signOut: () => N.signOut(),
      pickPhoto: () => { try { return N.pickPhoto(); } catch (e) { return false; } }, // false on apps older than 0.3.0
      removePhoto: () => { try { N.removePhoto(); } catch (e) { /* older app */ } },
      finishOnboarding: () => N.finishOnboarding(),
      openLink: url => N.openLink(url),
      startWait: () => N.startWait(),
      waitLeftMs: () => Number(N.waitLeftMs()),
      setStrict: on => N.setStrict(!!on),
      startStrict: days => { try { return N.startStrict(days | 0); } catch (e) { return false; } }, // false on apps older than 0.5.0
      startFocus: min => { try { return N.startFocus(min | 0); } catch (e) { return false; } },
      endFocus: () => { try { return N.endFocus(); } catch (e) { return false; } },
      openGuarded: pkg => N.openGuarded(pkg),
      openBatterySettings: () => N.openBatterySettings(),
      openDateSettings: () => N.openDateSettings(),
      // Over-the-air UI updates. Older native builds don't have these, so every call is guarded.
      ready: () => { try { N.ready(); } catch (e) { /* older bridge */ } },
      versions: () => { try { return parse(N.versions(), {}); } catch (e) { return {}; } },
      applyUpdate: () => { try { return N.applyUpdate(); } catch (e) { return false; } },
    };
    return;
  }

  /* ---------------- browser mock ---------------- */
  const KEY = "ante-mock-v2";
  const q = new URLSearchParams(location.search);
  const HUES = ["#C13584", "#0E9F99", "#D93636", "#5B6472", "#F0601F", "#C9A400", "#2E9E5B", "#2F7FD8", "#7A5AF8", "#B4654A"];
  const SAMPLE_APPS = [
    ["com.instagram.android", "Instagram"], ["com.zhiliaoapp.musically", "TikTok"], ["com.google.android.youtube", "YouTube"],
    ["com.twitter.android", "X"], ["com.reddit.frontpage", "Reddit"], ["com.snapchat.android", "Snapchat"],
    ["com.whatsapp", "WhatsApp"], ["com.google.android.apps.maps", "Maps"], ["com.netflix.mediaclient", "Netflix"],
    ["com.spotify.music", "Spotify"],
  ];
  function monogram(label, hue) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${hue}"/><text x="48" y="62" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="40" fill="#fff">${label.slice(0, 2)}</text></svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
  }
  const CATS = { "com.instagram.android": "social", "com.zhiliaoapp.musically": "social", "com.twitter.android": "social", "com.reddit.frontpage": "social", "com.snapchat.android": "social",
    "com.google.android.youtube": "video", "com.netflix.mediaclient": "video", "com.supercell.clashroyale": "games", "com.king.candycrushsaga": "games" };
  const apps = SAMPLE_APPS.concat([["com.supercell.clashroyale", "Clash Royale"], ["com.king.candycrushsaga", "Candy Crush"]])
    .map(([pkg, label], i) => ({ pkg, label, icon: monogram(label, HUES[i % HUES.length]), cat: CATS[pkg] || "" }));
  const today = () => new Date().toISOString().slice(0, 10);

  /* Sample past days so the charts have something to show in the browser. Deterministic. */
  function sampleHistory() {
    const out = [];
    for (let i = 1; i <= 180; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const wave = Math.sin(i / 9) * 900 + Math.sin(i / 2.3) * 500;
      const used = Math.max(0, Math.round(3000 + wave + ((i * 7919) % 1300) - Math.min(i, 60) * -8));
      const won = (i * 37) % 5 === 0 ? 300 + (i % 4) * 120 : 0, lost = (i * 13) % 3 === 0 ? 300 : 60;
      const ig = Math.round(used * (0.42 + 0.12 * Math.sin(i / 5))), yt = Math.round(used * (0.33 + 0.1 * Math.cos(i / 7)));
      out.push({ day: key, usedSec: used, wonSec: won, lostSec: lost, byApp: { "com.instagram.android": ig, "com.google.android.youtube": yt, "com.zhiliaoapp.musically": Math.max(0, used - ig - yt) } });
    }
    return out;
  }
  function fresh() {
    const now = Date.now();
    return {
      day: today(),
      accessibility: q.get("acc") === "1",
      limits: [
        { pkg: "com.instagram.android", label: "Instagram", limitSec: 1200, leftSec: 840 },
        { pkg: "com.zhiliaoapp.musically", label: "TikTok", limitSec: 1800, leftSec: 1800 },
        { pkg: "com.google.android.youtube", label: "YouTube", limitSec: 2700, leftSec: 1520 },
      ],
      ledger: [
        { game: "Coin flip", pkg: "com.instagram.android", deltaSec: 270, atMs: now - 3600e3 },
        { game: "Roulette", pkg: "com.google.android.youtube", deltaSec: -300, atMs: now - 7200e3 },
      ],
      session: null,
      parked: {},
      strict: false,
      usedTodaySec: 2160,
      usedTodayByApp: { "com.instagram.android": 360, "com.google.android.youtube": 1180, "com.zhiliaoapp.musically": 620 },
      history: sampleHistory(),
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !Array.isArray(S.limits) || q.get("reset") === "1") S = fresh();
  if (q.get("acc") === "1") S.accessibility = true;
  if (!Array.isArray(S.history)) { S.history = sampleHistory(); S.usedTodaySec = S.usedTodaySec || 0; }
  if (S.day !== today()) { S.day = today(); S.limits.forEach(l => { l.leftSec = l.limitSec; }); S.ledger = []; S.parked = {}; }
  const open = {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode */ } };
  const keyOf = pkg => { const g = S.groups || {}; for (const k in g) if ((g[k] || []).includes(pkg)) return k; return pkg; };
  const lim = pkg => S.limits.find(l => l.pkg === keyOf(pkg));
  const ctx = { mode: q.get("mode") === "block" ? "block" : "main", pkg: q.get("pkg") || null, note: q.get("note") || null };
  const AKEY = "ante-mock-account";
  let ACCT = {};
  try { ACCT = JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) { ACCT = {}; }
  if (q.get("reset") === "1" || q.get("onboard") === "1") ACCT = {};
  const saveAcct = () => { try { localStorage.setItem(AKEY, JSON.stringify(ACCT)); } catch (e) { /* private mode */ } };
  const WAIT = q.get("wait") === "1" ? 1000 : 30000;
  let waitStart = 0;
  const say = msg => window.dispatchEvent(new CustomEvent("ante-mock", { detail: msg }));

  /* Same rules as Schedule.kt / TimeBank.kt: windows by weekday (bit 0 = Monday), overnight
     windows run into the next day, a skipped window stays off until its end. */
  const strictOn = now => !!S.strict && (!S.strictUntilMs || now < S.strictUntilMs);
  function windowEnd(sc, now) {
    if (!sc.on) return 0;
    const base = new Date(now); base.setHours(0, 0, 0, 0);
    for (const back of [0, 1]) {
      const d = new Date(base); d.setDate(d.getDate() - back);
      if (!(sc.days & (1 << ((d.getDay() + 6) % 7)))) continue;
      const from = new Date(d); from.setMinutes(sc.startMin);
      const to = new Date(d); if (sc.endMin <= sc.startMin) to.setDate(to.getDate() + 1); to.setMinutes(sc.endMin);
      if (now >= +from && now < +to) return +to;
    }
    return 0;
  }
  const schedEnd = now => (now < (S.scheduleSkipUntilMs || 0) ? 0 : Math.max(0, ...(S.schedules || []).map(sc => windowEnd(sc, now))));
  const focusOn = now => now < (S.focusUntilMs || 0) || schedEnd(now) > 0;
  const validSched = sc => sc.days >= 1 && sc.days <= 127 && sc.startMin >= 0 && sc.startMin < 1440 && sc.endMin >= 0 && sc.endMin < 1440 && sc.startMin !== sc.endMin;
  function freeSpinOk() {
    const budget = S.limits.reduce((a, l) => a + l.limitSec, 0);
    if (!budget || S.freeSpinDay === S.day) return false;
    const y = new Date(S.day + "T12:00:00"); y.setDate(y.getDate() - 1);
    const key = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    const h = (S.history || []).find(x => x.day === key);
    return !!h && h.usedSec <= budget;
  }
  const FREE_SPIN_PRIZES = [60, 120, 180, 300, 600, 900], FREE_SPIN_WEIGHTS = [30, 25, 20, 15, 8, 2];
  let D = null; // the JS dealer, made once the mock API below exists
  const drive = () => { try { return JSON.parse(localStorage.getItem("ante-mock-drive")) || {}; } catch (e) { return {}; } };
  const saveDrive = d => { try { localStorage.setItem("ante-mock-drive", JSON.stringify(d)); } catch (e) { /* private mode */ } };
  const WKEY = "ante-mock-web";
  const web = () => { try { return JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { return {}; } };
  const saveWeb = w => { try { localStorage.setItem(WKEY, JSON.stringify(w)); } catch (e) { /* private mode */ } };
  if (q.get("reset") === "1") saveWeb({});
  const SUP = { on: (() => { try { return localStorage.getItem("ante-mock-supporter") === "1" && q.get("reset") !== "1"; } catch (e) { return false; } })() };

  window.Ante = {
    native: false,
    resetMock: () => { S = fresh(); save(); saveWeb({}); },
    state: () => {
      const now = Date.now();
      if (S.strictUntilMs && now >= S.strictUntilMs) { S.strict = false; S.strictUntilMs = 0; save(); }
      if (S.focusUntilMs && now >= S.focusUntilMs) { S.focusUntilMs = 0; save(); }
      const sched = schedEnd(now);
      const strictActive = strictOn(now), focusActive = focusOn(now);
      const focusEndsAt = Math.max(now < (S.focusUntilMs || 0) ? S.focusUntilMs : 0, sched || 0);
      return JSON.parse(JSON.stringify(Object.assign({ watching: true, autoTime: true, batteryOk: q.get("battery") !== "0" }, S, {
        now, strictActive, focusActive, focusEndsAt, scheduleActive: !!sched, canEditSchedules: !strictActive && !sched, freeSpin: freeSpinOk(),
      })));
    },
    context: () => {
      if (ctx.mode !== "block" || !ctx.pkg) return { mode: ctx.mode, platform: "browser" };
      const a = apps.find(x => x.pkg === ctx.pkg);
      const known = { "com.android.settings": "Settings", "com.google.android.packageinstaller": "Package installer" };
      return { mode: "block", platform: "browser", pkg: ctx.pkg, label: a ? a.label : known[ctx.pkg] || ctx.pkg, icon: a ? a.icon : "", note: ctx.note };
    },
    apps: () => apps.slice(),
    icon: pkg => (apps.find(a => a.pkg === pkg) || {}).icon || "",
    // Same rules as TimeBank.setLimit: cuts apply now, raises from tomorrow, removed limits remember their time.
    setLimit(pkg, label, sec) {
      sec = Math.max(60, Math.min(86400, sec | 0));
      S.parked = S.parked || {};
      if (!/^cat:/.test(pkg) && S.groups) S.groups = Object.fromEntries(Object.entries(S.groups).map(([k, v]) => [k, v.filter(m => m !== pkg)]).filter(([, v]) => v.length));
      const l = S.limits.find(x => x.pkg === pkg);
      if (l) { l.leftSec = Math.max(0, l.leftSec - Math.max(0, l.limitSec - sec)); l.limitSec = sec; l.label = label; }
      else S.limits.push({ pkg, label, limitSec: sec, leftSec: pkg in S.parked ? Math.min(sec, S.parked[pkg]) : sec });
      delete S.parked[pkg];
      save(); return true;
    },
    // Same rules as TimeBank.setGroup: members share the category's budget; dropping apps waits for locks to end.
    setGroup(key, label, members, sec) {
      if (!/^cat:[a-z]{1,16}$/.test(key) || !members.length) return false;
      const now = Date.now(), old = (S.groups || {})[key] || [];
      const dropping = old.some(m => !members.includes(m)), replacing = members.some(m => S.limits.some(l => l.pkg === m));
      if ((dropping || replacing) && (focusOn(now) || strictOn(now))) return false;
      S.groups = Object.fromEntries(Object.entries(S.groups || {}).filter(([k]) => k !== key).map(([k, v]) => [k, v.filter(m => !members.includes(m))]).filter(([, v]) => v.length));
      S.groups[key] = members.slice();
      S.limits = S.limits.filter(l => !members.includes(l.pkg));
      return this.setLimit(key, label, sec);
    },
    removeLimit(pkg) {
      const now = Date.now();
      if (focusOn(now) || strictOn(now)) return false; // same rule as TimeBank.canRemoveLimits
      const l = S.limits.find(x => x.pkg === pkg); if (!l) return true;
      if (S.groups) delete S.groups[pkg];
      S.parked = S.parked || {}; S.parked[pkg] = Math.min(l.leftSec, l.limitSec);
      S.limits = S.limits.filter(x => x.pkg !== pkg); save(); return true;
    },
    bet(pkg, sec) {
      const l = lim(pkg); sec |= 0;
      if (!l || sec <= 0 || sec > l.leftSec) return false;
      l.leftSec -= sec; open[pkg] = (open[pkg] || 0) + sec; save(); return true;
    },
    settle(pkg, game, stake, ret) {
      const l = lim(pkg); stake |= 0;
      if (!l || stake <= 0 || stake > (open[pkg] || 0)) return -2147483648;
      open[pkg] -= stake;
      ret = Math.max(0, Math.min(Math.round(ret), stake * 250));
      l.leftSec += ret;
      S.wonTodaySec = (S.wonTodaySec || 0) + Math.max(0, ret - stake);
      S.lostTodaySec = (S.lostTodaySec || 0) + Math.max(0, stake - ret);
      S.ledger.unshift({ game, pkg, deltaSec: ret - stake, atMs: Date.now() });
      S.ledger = S.ledger.slice(0, 50); save();
      return ret - stake;
    },
    open(pkg, sec) {
      const l = lim(pkg); sec |= 0;
      if (!l || sec <= 0 || sec > l.leftSec || focusOn(Date.now())) return false;
      l.leftSec -= sec; save();
      say(`Opens ${l.label} for ${Math.round(sec / 60)} min`);
      return true;
    },
    closeBlock: () => say("Goes to the home screen"),
    openAnte: () => say("Opens Ante"),
    openAccessibilitySettings: () => {
      if (S.strict && !(waitStart && Date.now() - waitStart >= WAIT)) return false;
      waitStart = 0; S.accessibility = true; save(); say("Opens Accessibility settings (mock: switched on)"); return true;
    },
    openAppInfo: () => { say("Opens Ante's App info page"); return true; },
    haptic: () => {},
    // Account. ?onboard=1 shows onboarding; ?google=fail makes sign-in fail.
    account: () => Object.assign({ signedIn: false, name: "", email: "", onboarded: q.get("onboard") !== "1", googleConfigured: true }, ACCT),
    signInWithGoogle() {
      setTimeout(() => {
        if (q.get("google") === "fail") { window.anteAuth && window.anteAuth(JSON.stringify({ ok: false, error: "no_account", message: "No Google account on this phone. Add one in Settings, then try again." })); return; }
        Object.assign(ACCT, { signedIn: true, name: "Demo account", email: "demo@example.com" }); saveAcct();
        window.anteAuth && window.anteAuth(JSON.stringify({ ok: true, name: ACCT.name, email: ACCT.email }));
      }, 500);
    },
    signOut() { Object.assign(ACCT, { signedIn: false, name: "", email: "" }); saveAcct(); SUP.on = false; try { localStorage.removeItem("ante-mock-supporter"); } catch (e) { /* private mode */ } },
    pickPhoto() {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = () => {
        const f = input.files && input.files[0]; if (!f) return;
        const img = new Image();
        img.onload = () => {
          const side = Math.min(img.width, img.height), c = document.createElement("canvas");
          c.width = c.height = 256;
          c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
          ACCT.photo = c.toDataURL("image/jpeg", 0.86); ACCT.customPhoto = true; saveAcct();
          window.anteAccountChanged && window.anteAccountChanged(null);
        };
        const fail = () => window.anteAccountChanged && window.anteAccountChanged("Couldn't read that picture. Try another one.");
        img.onerror = fail;
        // A data: URL, because the page's CSP allows data: images but not blob: ones.
        const reader = new FileReader();
        reader.onload = () => { img.src = reader.result; };
        reader.onerror = fail;
        reader.readAsDataURL(f);
      };
      input.click();
      return true;
    },
    removePhoto() { ACCT.photo = ""; ACCT.customPhoto = false; saveAcct(); },
    finishOnboarding() { ACCT.onboarded = true; saveAcct(); },
    ready() {},
    versions: () => ({ app: "web demo", native: 0, web: 0 }),
    applyUpdate: () => { location.reload(); return true; },
    openLink(url) { if (/^(https:\/\/ko-fi\.com\/peteracz|mailto:peter\.racz\.rhr@gmail\.com)$/.test(url)) window.open(url, "_blank", "noopener"); return true; },
    // Strict mode. ?wait=1 shortens the 30 s wait to 1 s for tests.
    startWait: () => { waitStart = Date.now(); },
    waitLeftMs: () => (waitStart ? Math.max(0, waitStart + WAIT - Date.now()) : -1),
    setStrict(on) {
      if (!on && S.strictUntilMs && Date.now() < S.strictUntilMs) return false; // a timed lock has no early exit
      if (!on && S.strict && !(waitStart && Date.now() - waitStart >= WAIT)) return false;
      S.strict = !!on; if (!on) S.strictUntilMs = 0; waitStart = 0; save(); return true;
    },
    // ?unit=s makes "days" and "minutes" last seconds, so tests can watch locks end.
    startStrict(days) {
      if (!(Number.isInteger(days) && days >= 1 && days <= 31)) return false;
      const unit = q.get("unit") === "s" ? 1000 : 86400000, now = Date.now(), cur = S.strict && S.strictUntilMs > now ? S.strictUntilMs : 0;
      S.strict = true; S.strictUntilMs = Math.max(now + days * unit, cur); save(); return true;
    },
    startFocus(min) {
      if (!(min >= 5 && min <= 720)) return false;
      S.focusUntilMs = Date.now() + min * (q.get("unit") === "s" ? 1000 : 60000); save(); return true;
    },
    endFocus() {
      const now = Date.now();
      if (!(waitStart && now - waitStart >= WAIT) || strictOn(now)) return false;
      const sched = schedEnd(now);
      if (sched) S.scheduleSkipUntilMs = sched;
      S.focusUntilMs = 0; waitStart = 0; save(); return true;
    },
    openGuarded(pkg) { if (!(waitStart && Date.now() - waitStart >= WAIT)) return false; waitStart = 0; say("Opens Settings for 2 minutes"); return true; },
    openBatterySettings: () => { say("Opens battery optimization"); S.batteryOk = true; save(); return true; },
    openDateSettings: () => { say("Opens Date & time"); return true; },
    play: (pkg, game, stake, args) => D.play(pkg, game, stake | 0, args),
    bjDeal: (pkg, stake) => D.bjDeal(pkg, stake | 0),
    bjHit: () => D.bjHit(), bjDouble: () => D.bjDouble(), bjStand: () => D.bjStand(),
    pkDeal: (pkg, stake) => D.pkDeal(pkg, stake | 0),
    pkDraw: held => D.pkDraw(held | 0),
    freeSpin(pkg) {
      const l = lim(pkg);
      if (!freeSpinOk()) return { ok: false, error: "used" };
      if (!l) return { ok: false, error: "stake" };
      let r = Math.random() * 100, index = 0;
      while (index < FREE_SPIN_WEIGHTS.length - 1 && (r -= FREE_SPIN_WEIGHTS[index]) >= 0) index++;
      const prizeSec = FREE_SPIN_PRIZES[index];
      l.leftSec += prizeSec; S.freeSpinDay = S.day; S.wonTodaySec = (S.wonTodaySec || 0) + prizeSec;
      S.ledger.unshift({ game: "Daily spin", pkg, deltaSec: prizeSec, atMs: Date.now() }); S.ledger = S.ledger.slice(0, 50);
      save(); return { ok: true, index, prizeSec };
    },
    // Ko-fi supporters in the demo: ?supporter=1 starts as one; "check" finds a donation for any
    // signed-in account (?kofi=0 finds none).
    supporter: () => { const on = SUP.on || q.get("supporter") === "1"; return { supporter: on, verified: on, since: on ? Date.now() : 0, configured: true, kofi: "https://ko-fi.com/peteracz", email: ACCT.email || "" }; },
    // Feedback in the demo: kept on the page instead of opening an email app.
    sendFeedback(subject, text) { window.__lastFeedback = { subject, text }; return true; },
    // A code in the demo: "ANTE-DEMO" works for any signed-in account.
    redeemSupporter(code) {
      if (!ACCT.signedIn) return JSON.stringify({ ok: false, error: "signin" });
      if (String(code).replace(/\s+/g, "").toUpperCase() !== "ANTE-DEMO") return JSON.stringify({ ok: false, error: "code" });
      SUP.on = true; try { localStorage.setItem("ante-mock-supporter", "1"); } catch (e) { /* private mode */ }
      return JSON.stringify({ ok: true, supporter: true, via: "code" });
    },
    checkSupporter() {
      setTimeout(() => {
        if (!ACCT.signedIn) return window.anteSupporter && window.anteSupporter(JSON.stringify({ ok: false, error: "signin" }));
        const found = q.get("kofi") !== "0";
        if (found) { SUP.on = true; try { localStorage.setItem("ante-mock-supporter", "1"); } catch (e) { /* private mode */ } }
        window.anteSupporter && window.anteSupporter(JSON.stringify({ ok: true, supporter: found }));
      }, 400);
    },
    // Website filter in the demo: state in this browser; Android's VPN permission "asks" once.
    webFilter() {
      const w = web(), now = Date.now(), d = new Date(now);
      const november = d.getMonth() === 10 ? new Date(d.getFullYear(), 11, 1).getTime() : 0;
      return { available: true, on: !!w.on, adult: w.adult !== false, gambling: !!w.gambling, custom: w.custom || [], lockUntil: (w.lockUntil || 0) > now ? w.lockUntil : 0,
        nnnUntil: w.nnnUntil || 0, nnnDone: !!w.nnnUntil && now >= w.nnnUntil, november, running: !!w.on && !!w.consented, consented: !!w.consented, strict: strictOn(now) };
    },
    setWebFilter(on, adult, gambling, customJson) {
      const w = web(), now = Date.now();
      let custom; try { custom = JSON.parse(customJson); } catch (e) { return false; }
      if (!Array.isArray(custom)) return false;
      custom = [...new Set(custom.map(x => String(x).toLowerCase()).filter(x => /^[a-z0-9_.-]{3,253}$/.test(x) && x.includes(".")))].slice(0, 200);
      const cur = { on: !!w.on, adult: w.adult !== false, gambling: !!w.gambling, custom: w.custom || [] };
      const loosens = (cur.on && !on) || (cur.adult && !adult) || (cur.gambling && !gambling) || cur.custom.some(x => !custom.includes(x));
      if (loosens && ((w.lockUntil || 0) > now || strictOn(now))) return false;
      Object.assign(w, { on: !!on, adult: !!adult, gambling: !!gambling, custom }); saveWeb(w); return true;
    },
    webFilterLock(days) {
      const w = web(), now = Date.now(), d = new Date(now);
      let end;
      if (days === 0) { if (d.getMonth() !== 10) return false; end = new Date(d.getFullYear(), 11, 1).getTime(); w.nnnUntil = Math.max(w.nnnUntil || 0, end); }
      else if ([1, 7, 30].includes(days)) end = now + days * 86400000; else return false;
      Object.assign(w, { on: true, adult: true, lockUntil: Math.max(w.lockUntil || 0, end) }); saveWeb(w); return true;
    },
    webFilterConsent() {
      setTimeout(() => {
        const w = web(), ok = q.get("vpn") !== "deny"; if (ok) { w.consented = true; saveWeb(w); }
        window.anteWeb && window.anteWeb(JSON.stringify(Object.assign(window.Ante.webFilter(), { ok })));
      }, 300);
      return true;
    },
    // Your data in the demo: the "Drive backup" lives in this browser's storage.
    savePrefs(json) { try { localStorage.setItem("ante-mock-uiprefs", json); } catch (e) { /* private mode */ } },
    backupStatus: () => { const d = drive(); return { auto: !!d.auto, lastAt: d.lastAt || 0, signedIn: !!ACCT.signedIn }; },
    setAutoBackup(on) { const d = drive(); d.auto = !!on; saveDrive(d); },
    backupNow() {
      setTimeout(() => {
        if (!ACCT.signedIn) { window.anteDrive && window.anteDrive(JSON.stringify({ op: "backup", ok: false, error: "auth" })); return; }
        const d = drive(); d.file = { bank: JSON.parse(JSON.stringify(S)), prefs: JSON.parse(localStorage.getItem("ante-mock-uiprefs") || "{}"), savedAtMs: Date.now() }; d.lastAt = Date.now(); saveDrive(d);
        window.anteDrive && window.anteDrive(JSON.stringify({ op: "backup", ok: true, lastAt: d.lastAt }));
      }, 300);
    },
    restoreBackup() {
      setTimeout(() => {
        const f = drive().file;
        if (!f) { window.anteDrive && window.anteDrive(JSON.stringify({ op: "restore", ok: false, error: "none" })); return; }
        // Same rules as Backup.merge: keep this phone's limits (time left only goes down), add the rest; locks only extend.
        const b = f.bank, same = b.day === S.day;
        S.limits.forEach(l => { const bl = (b.limits || []).find(x => x.pkg === l.pkg); if (bl && same) l.leftSec = Math.min(l.leftSec, bl.leftSec); });
        (b.limits || []).forEach(bl => { if (!lim(bl.pkg)) S.limits.push(Object.assign({}, bl, { leftSec: same ? Math.min(bl.leftSec, bl.limitSec) : bl.limitSec })); });
        const now = Date.now();
        if ((b.strictUntilMs || 0) > now) { S.strict = true; S.strictUntilMs = Math.max(S.strictUntilMs || 0, b.strictUntilMs); }
        S.schedules = (S.schedules || []).concat((b.schedules || []).filter(x => !(S.schedules || []).some(y => y.id === x.id))).slice(0, 8);
        save();
        window.anteDrive && window.anteDrive(JSON.stringify({ op: "restore", ok: true, prefs: f.prefs, savedAtMs: f.savedAtMs }));
      }, 300);
    },
    exportData() { say("Opens the share sheet with your data as JSON"); return true; },
    shareText(subject) { say(`Opens the share sheet: ${subject}`); return true; },
    deleteAllData(alsoDrive) {
      const now = Date.now();
      if (strictOn(now) || focusOn(now) || (web().lockUntil || 0) > now) return false;
      if (alsoDrive) { try { localStorage.removeItem("ante-mock-drive"); } catch (e) { /* private mode */ } }
      S = fresh(); S.limits = []; S.ledger = []; S.history = []; S.usedTodaySec = 0; S.usedTodayByApp = {}; save();
      ACCT = {}; saveAcct();
      setTimeout(() => window.anteDrive && window.anteDrive(JSON.stringify({ op: "deleted", ok: true })), 200);
      return true;
    },
    setSchedule(sc) {
      const now = Date.now(), list = S.schedules = S.schedules || [];
      const clean = { id: sc.id | 0, label: String(sc.label || "").trim().slice(0, 24), days: sc.days | 0, startMin: sc.startMin | 0, endMin: sc.endMin | 0, on: sc.on !== false };
      if (!validSched(clean)) return 0;
      const i = list.findIndex(x => x.id === clean.id);
      if (i < 0) { if (list.length >= 8) return 0; clean.id = Math.max(0, ...list.map(x => x.id)) + 1; list.push(clean); }
      else { if (strictOn(now) || schedEnd(now)) return 0; list[i] = clean; }
      save(); return clean.id;
    },
    removeSchedule(id) {
      const now = Date.now(), list = S.schedules || [];
      if (!list.some(x => x.id === id) || strictOn(now) || schedEnd(now)) return false;
      S.schedules = list.filter(x => x.id !== id); save(); return true;
    },
  };
  D = window.AnteDealer(window.Ante.bet, window.Ante.settle);
})();
