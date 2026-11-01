// Stress test: extreme data on every screen, at several widths, themes and clock fonts.
// Usage: node web-tests/stress.js [screenshot-dir]
// Fails on: horizontal overflow, content poking out of the screen, text spilling out of buttons,
// clocks wider than their box, script errors, and any injected markup that runs.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const INDEX = process.env.E2E_URL || "file://" + path.resolve(__dirname, "../app/src/main/assets/web/index.html");
const OUT = process.argv[2] || path.resolve(__dirname, "../build/stress");
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) { failures.push(msg); console.log("FAIL " + msg); } };

const XSS = `<img src=x onerror="window.__pwned=1">`;
const LONG_WORD = "Supercalifragilisticexpialidociousandthensomemorewords";
const LABELS = [
  LONG_WORD, `Evil ${XSS}`, "😀😀😀 Emoji Überlang App Name With Ümlauts And More 😀", "تطبيق باسم طويل جدا للاختبار فقط",
  "A", "Instagram", "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
];
const pkgOf = i => `com.stress.app${i}`;

function extremeState(now) {
  const limits = Array.from({ length: 20 }, (_, i) => ({
    pkg: pkgOf(i), label: LABELS[i % LABELS.length] + (i >= LABELS.length ? ` ${i}` : ""),
    limitSec: 14400, leftSec: i === 0 ? 3599999 : (i % 3 === 0 ? 0 : 14400 - i * 300), // app 0: 999:59:59 left
  }));
  const day = d => { const x = new Date(now - d * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const history = Array.from({ length: 186 }, (_, k) => ({
    day: day(k + 1), usedSec: 86399, wonSec: 999999, lostSec: 999999,
    byApp: Object.fromEntries(limits.slice(0, 12).map((l, i) => [l.pkg, 7000 + i * 13])),
  }));
  return {
    day: day(0), accessibility: true, limits, history,
    ledger: Array.from({ length: 50 }, (_, k) => ({ game: k % 2 ? "Roulette" : `Game ${XSS}`, pkg: pkgOf(k % 20), deltaSec: (k % 2 ? 1 : -1) * 359999, atMs: now - k * 60e3 })),
    session: null, parked: {}, strict: true, strictUntilMs: now + 30 * 864e5, focusUntilMs: now + 4 * 3600e3,
    usedTodaySec: 86399, usedTodayByApp: Object.fromEntries(limits.map(l => [l.pkg, 4319])),
  };
}
const ACCOUNT = { signedIn: true, onboarded: true, name: "Bartholomew-Maximilian " + LONG_WORD.slice(0, 50), email: "a".repeat(64) + "@" + "very-long-subdomain-name-for-testing.".repeat(5) + "example.com", googleConfigured: true };

async function open(browser, width, query, prefs) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
  p.on("dialog", d => { p.errors.push("dialog opened: " + d.message()); d.dismiss(); });
  await p.goto(INDEX + "?acc=1");
  await p.evaluate(([state, acct, pr]) => {
    localStorage.setItem("ante-mock-v2", JSON.stringify(state));
    localStorage.setItem("ante-mock-account", JSON.stringify(acct));
    localStorage.setItem("ante-prefs", JSON.stringify(Object.assign({ theme: "neutral", accent: "white", clock: "bitcount", name: "", sound: false, haptics: true, seenIntro: {} }, pr)));
  }, [extremeState(Date.now()), ACCOUNT, prefs || {}]);
  await p.goto(INDEX + (query || "?acc=1"));
  await p.waitForSelector(".screen");
  await p.waitForTimeout(250);
  return p;
}

/** Layout checks for whatever is on screen now. */
async function audit(p, label) {
  const r = await p.evaluate(() => {
    const W = innerWidth, out = { overflowX: document.documentElement.scrollWidth - W, poking: [], spilling: [], clocks: [], injected: !!document.querySelector('img[src="x"]') || !!window.__pwned };
    const clipped = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== "visible" || cs.overflow !== "visible") return true; } return false; };
    const visible = el => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const name = el => (el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase();
    document.querySelectorAll("#app *, #overlay *").forEach(el => {
      if (!visible(el) || el.closest("svg")) return;
      const b = el.getBoundingClientRect();
      if ((b.right > W + 1 || b.left < -1) && !clipped(el)) out.poking.push(`${name(el)} [${Math.round(b.left)},${Math.round(b.right)}]`);
    });
    document.querySelectorAll("#app button, #app .chip, #overlay button, #app .pill, #app .sval").forEach(el => {
      if (!visible(el)) return;
      const cs = getComputedStyle(el);
      const ell = cs.textOverflow === "ellipsis" || [...el.querySelectorAll("*")].some(c => getComputedStyle(c).textOverflow === "ellipsis");
      if (!ell && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) && el.clientWidth > 0 && cs.overflow !== "visible") out.spilling.push(`${name(el)} "${el.textContent.trim().slice(0, 30)}"`);
      if (!ell && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.spilling.push(`${name(el)} wide "${el.textContent.trim().slice(0, 30)}"`);
    });
    document.querySelectorAll(".dotclock, .balance, .limit .left, .me-name").forEach(el => {
      if (!visible(el)) return;
      const b = el.getBoundingClientRect(), box = (el.closest(".dotclock-box, .panel, .limit, .me-card, .hero") || el.parentElement).getBoundingClientRect();
      if (b.right > Math.min(box.right, W) + 1 || b.left < Math.max(box.left, 0) - 1) out.clocks.push(`${name(el)} "${el.textContent.trim().slice(0, 14)}" ${Math.round(b.width)}px in ${Math.round(box.width)}px`);
    });
    return out;
  });
  check(r.overflowX <= 0, `${label}: page scrolls sideways by ${r.overflowX}px`);
  check(!r.poking.length, `${label}: off screen: ${[...new Set(r.poking)].slice(0, 4).join("; ")}`);
  check(!r.spilling.length, `${label}: text spills out of: ${[...new Set(r.spilling)].slice(0, 4).join("; ")}`);
  check(!r.clocks.length, `${label}: clock too wide: ${r.clocks.slice(0, 3).join("; ")}`);
  check(!r.injected, `${label}: injected markup was rendered`);
}

const go = (p, view, extra) => p.evaluate(([v, x]) => { Object.assign(window.App.ui, { view: v }, x || {}); window.App.render(); }, [view, extra || null]).then(() => p.waitForTimeout(220));
const sheet = (p, s) => p.evaluate(s => { window.App.ui.sheet = s; window.App.paintOverlay(); }, s).then(() => p.waitForTimeout(220));

(async () => {
  const browser = await chromium.launch();
  const t0 = Date.now();
  for (const width of [320, 360, 412, 480]) {
    for (const theme of ["neutral", "latte", "mocha"]) {
      const tag = `${width}px ${theme}`;
      const p = await open(browser, width, "?acc=1", { theme, accent: theme === "neutral" ? "white" : "mauve", name: theme === "mocha" ? "Ő".repeat(40) : "" });
      for (const v of ["home", "screentime", "results", "tables", "profile", "settings"]) {
        await go(p, v); await audit(p, `${tag} ${v}`);
        if (v === "home" && width === 360) await p.screenshot({ path: path.join(OUT, `home-${theme}.png`), fullPage: true });
      }
      for (const doc of ["terms", "privacy", "imprint"]) { await go(p, "legal", { doc, back: "settings" }); await audit(p, `${tag} legal ${doc}`); }
      for (const g of ["coin", "roulette", "slots", "blackjack", "poker"]) {
        await go(p, "tables"); await go(p, "game", { game: g, stakePkg: pkgOf(0), stake: 3540000 });
        await audit(p, `${tag} game ${g}`);
        const f = await p.evaluate(() => { const s = document.getElementById("screen"); return s.scrollHeight - s.clientHeight; });
        check(f <= 1, `${tag} game ${g}: needs scrolling (${f}px)`);
      }
      await go(p, "home");
      await sheet(p, { type: "pick", apps: window_apps(), q: "" }); await audit(p, `${tag} sheet pick`);
      await sheet(p, { type: "edit", pkg: pkgOf(1), label: LABELS[1], limit: 14400 }); await audit(p, `${tag} sheet edit`);
      await sheet(p, { type: "wait", left: 30000, title: "Settings is behind Strict mode and this title is long", body: LONG_WORD + " " + LONG_WORD, cta: "Open Settings now please" }); await audit(p, `${tag} sheet wait`);
      for (const mode of ["strict", "focus"]) for (const step of [0, 1, 2]) { await sheet(p, { type: "explain", mode, step, pick: null }); await audit(p, `${tag} explain ${mode} ${step}`); }
      await sheet(p, null);
      check(!p.errors.length, `${tag}: script errors: ${p.errors.slice(0, 3).join(" | ")}`);
      await p.context().close();
    }
    // Block screens with the longest app name, and the Focus block screen.
    for (const [q, tag] of [[`?mode=block&pkg=${pkgOf(0)}&acc=1`, "block lots of time"], [`?mode=block&pkg=${pkgOf(3)}&acc=1`, "block done for today"], [`?mode=block&pkg=${pkgOf(1)}&acc=1&note=focus`, "block focus"], ["?mode=block&pkg=com.android.settings&note=strict&acc=1", "block strict"]]) {
      const p = await open(browser, width, q);
      await audit(p, `${width}px ${tag}`);
      check(!p.errors.length, `${width}px ${tag}: script errors: ${p.errors.slice(0, 3).join(" | ")}`);
      await p.context().close();
    }
  }
  // Every clock font on Home and Profile at the narrowest width, with 999 hours left.
  const p = await open(browser, 320, "?acc=1");
  for (const clock of ["bitcount", "bitsingle", "doto", "dotgothic", "handjet", "workbench", "sixtyfour", "silkscreen", "pixelify", "vt323"]) {
    await p.evaluate(c => { window.AntePrefs.set({ clock: c }); }, clock);
    await p.evaluate(() => document.fonts && document.fonts.ready);
    for (const v of ["home", "profile"]) { await go(p, v); await p.waitForTimeout(150); await audit(p, `320px font ${clock} ${v}`); }
    if (clock === "sixtyfour") await p.screenshot({ path: path.join(OUT, "home-320-sixtyfour.png") });
  }
  check(!p.errors.length, `fonts: script errors: ${p.errors.slice(0, 3).join(" | ")}`);
  await browser.close();
  console.log(`\n${checks} checks in ${Math.round((Date.now() - t0) / 1000)} s, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

function window_apps() {
  return Array.from({ length: 30 }, (_, i) => ({ pkg: `com.more.app${i}`, label: LABELS[i % LABELS.length], icon: "" }));
}
