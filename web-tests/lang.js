// Language audit: every screen and sheet in every language, at common phone widths.
// Fails when a button, chip or one-line label wraps onto a second line, is cut off with "…",
// or spills out of its box, and when English is left on screen in another language.
// Usage: node web-tests/lang.js [screenshot-dir]
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const INDEX = process.env.E2E_URL || "file://" + path.resolve(__dirname, "../app/src/main/assets/web/index.html");
const OUT = process.argv[2] || path.resolve(__dirname, "../build/lang");
fs.mkdirSync(OUT, { recursive: true });
const failures = []; let checks = 0;
const check = (ok, msg) => { checks++; if (!ok) { failures.push(msg); console.log("FAIL " + msg); } };

// One line by design: these must never wrap or be cut short.
const ONE_LINE = [".btn", ".btn-sm", ".chip", ".pill", ".seg-sm button", ".navpill button", ".sitem-title", ".t-name", ".fname",
  ".eyebrow", ".sgroup-label", ".sblock-h", ".topbar .h1", ".topbar .h2", ".sheet-head .h2", ".panel-head .h3", ".stake-val", ".gname", ".rtp"].join(",");
// Words that only appear in English UI text (to spot untranslated strings).
const ENGLISH = /\b(the|your|you|and|with|left|today|open|minutes|stake|tables|settings|back|more|less|week|days?|turn|time)\b/i;
const KEEP = /^(Ante|Instagram|TikTok|YouTube|Bitcount.*|Doto|DotGothic|Handjet|Workbench|Sixtyfour|Silkscreen|Pixelify|VT323|Latte|Frappé|Macchiato|Mocha|Google|Ko-fi|Blackjack!?|Poker|Roulette|Flush|Bar|Supporter|Ante Supporter|English|Magyar|Deutsch|Version)$/;

async function audit(p, tag, lang) {
  const r = await p.evaluate(([sel, eng, keep, lang]) => {
    const vis = el => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight * 3; };
    const name = el => `${(el.className && String(el.className).split(" ")[0]) || el.tagName.toLowerCase()} "${el.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}"`;
    const out = { wraps: [], cut: [], spill: [], english: [] };
    const root = [document.getElementById("app"), document.getElementById("overlay")];
    root.forEach(rt => rt && rt.querySelectorAll(sel).forEach(el => {
      if (!vis(el) || el.closest("svg, .ex-art, .ob-art, .sc, .how-stage")) return;
      // Lines of text: the tallest single text run against the line height.
      const range = document.createRange(); let lines = 0;
      el.childNodes.forEach(n => {
        if (n.nodeType === 3 && n.textContent.trim()) { range.selectNodeContents(n); const tops = new Set([...range.getClientRects()].map(q => Math.round(q.top))); lines = Math.max(lines, tops.size); }
        else if (n.nodeType === 1 && !n.matches("svg, i, img, .lock-mark") && n.textContent.trim()) { range.selectNodeContents(n); const tops = new Set([...range.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top / 4))); lines = Math.max(lines, tops.size); }
      });
      if (lines > 1 && !el.closest(".stake-val")) out.wraps.push(name(el));
      const cs = getComputedStyle(el);
      if ((cs.textOverflow === "ellipsis" || [...el.querySelectorAll("*")].some(c => getComputedStyle(c).textOverflow === "ellipsis" && c.scrollWidth > c.clientWidth + 1)) && el.scrollWidth > el.clientWidth + 1) out.cut.push(name(el));
      else if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== "visible") out.spill.push(name(el));
    }));
    if (lang !== "en") {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.textContent.trim().replace(/\s+/g, " ");
        if (!t || !n.parentElement || n.parentElement.closest("svg, style, script, .legal-body, .dotnum, .dotclock, input, textarea, .name, .lrow, .cred, .credits")) continue;
        if (!vis(n.parentElement) || new RegExp(keep).test(t)) continue;
        if (new RegExp(eng).test(t)) out.english.push(t.slice(0, 60));
      }
    }
    return out;
  }, [ONE_LINE, ENGLISH.source, KEEP.source, lang]);
  check(!r.wraps.length, `${tag}: wraps onto 2 lines: ${[...new Set(r.wraps)].slice(0, 6).join("; ")}`);
  check(!r.cut.length, `${tag}: cut off with …: ${[...new Set(r.cut)].slice(0, 6).join("; ")}`);
  check(!r.spill.length, `${tag}: spills out: ${[...new Set(r.spill)].slice(0, 6).join("; ")}`);
  check(!r.english.length, `${tag}: still in English: ${[...new Set(r.english)].slice(0, 6).join(" | ")}`);
}

const go = (p, view, extra) => p.evaluate(([v, x]) => { Object.assign(window.App.ui, { view: v }, x || {}); window.App.render(); }, [view, extra || null]).then(() => p.waitForTimeout(200));
const sheet = (p, s) => p.evaluate(s => { window.App.ui.sheet = s; window.App.paintOverlay(); }, s).then(() => p.waitForTimeout(250));

(async () => {
  const browser = await chromium.launch();
  for (const lang of ["en", "hu", "de"]) for (const width of [360, 412]) {
    const tag = `${lang} ${width}px`;
    const ctx = await browser.newContext({ viewport: { width, height: 860 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(); const errors = [];
    p.on("pageerror", e => errors.push(e.message));
    await p.goto(INDEX + "?acc=1&reset=1"); await p.waitForSelector(".screen");
    await p.evaluate(l => { localStorage.setItem("ante-prefs", JSON.stringify({ theme: "neutral", accent: "white", clock: "bitcount", name: "Péter", sound: false, haptics: true, seenIntro: {}, lang: l })); }, lang);
    await p.goto(INDEX + "?acc=1"); await p.waitForSelector(".screen"); await p.waitForTimeout(300);
    for (const v of ["home", "screentime", "results", "tables", "profile", "settings"]) {
      await go(p, v); await audit(p, `${tag} ${v}`, lang);
      if (width === 412) await p.screenshot({ path: path.join(OUT, `${lang}-${v}.png`), fullPage: true });
    }
    for (const g of ["coin", "roulette", "slots", "blackjack", "poker"]) { await go(p, "game", { game: g, stakePkg: "com.instagram.android", stake: 300 }); await audit(p, `${tag} game ${g}`, lang); if (width === 412) await p.screenshot({ path: path.join(OUT, `${lang}-game-${g}.png`) }); }
    await go(p, "home");
    const sheets = [{ type: "pick", apps: [], q: "" }, { type: "edit", pkg: "com.instagram.android", label: "Instagram", limit: 1200 }, { type: "strict" }, { type: "consent" },
      { type: "schedules" }, { type: "schedEdit", draft: { id: 0, label: "", days: 31, startMin: 540, endMin: 1020, on: true } }, { type: "recap" }, { type: "supporter" }, { type: "deleteData", drive: true },
      { type: "wait", left: 30000, title: "End Focus early", body: "Wait 30 seconds. If you still want to stop after that, you can.", cta: "End Focus" }];
    for (const s of sheets) { await sheet(p, s); await audit(p, `${tag} sheet ${s.type}`, lang); if (width === 412) await p.screenshot({ path: path.join(OUT, `${lang}-sheet-${s.type}.png`) }); }
    for (const mode of ["strict", "focus"]) for (const step of [0, 1, 2]) { await sheet(p, { type: "explain", mode, step, pick: null }); await audit(p, `${tag} explain ${mode} ${step}`, lang); }
    await sheet(p, null);
    for (const [q, n] of [["?mode=block&pkg=com.instagram.android&acc=1", "block"], ["?mode=block&pkg=com.instagram.android&acc=1&note=focus", "block-focus"], ["?mode=block&pkg=com.android.settings&note=strict&acc=1", "block-strict"], ["?onboard=1", "onboarding"]]) {
      await p.goto(INDEX + q); await p.waitForSelector(".screen"); await p.waitForTimeout(400);
      await audit(p, `${tag} ${n}`, lang);
      if (width === 412) await p.screenshot({ path: path.join(OUT, `${lang}-${n}.png`) });
      if (n === "onboarding") for (let i = 0; i < 3; i++) { const b = await p.$('.ob [data-a="obNext"], [data-a="obNext"]'); if (!b) break; await b.click(); await p.waitForTimeout(500); await audit(p, `${tag} onboarding ${i + 2}`, lang); }
    }
    check(!errors.length, `${tag}: script errors: ${errors.slice(0, 3).join(" | ")}`);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${checks} checks, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
