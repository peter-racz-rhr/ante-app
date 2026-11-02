// Google Play listing art, built from the real app (browser demo) on a casino-felt set.
// Usage: node scripts/store-play.js  → docs/store/01..05-*.png, feature-graphic.png (icon-512.png stays the app icon)
// 01 and 02 are one wide picture: the block-screen phone straddles the seam between them.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "app/src/main/assets/web");
const STORE = path.join(ROOT, "docs/store"), TMP = path.join(ROOT, "build/store-play");
[STORE, TMP].forEach(d => fs.mkdirSync(d, { recursive: true }));
const URL = "file://" + path.join(WEB, "index.html");
const FONT = n => "file://" + path.join(WEB, "fonts", n);
const SCREEN_W = 390, SCREEN_H = 800, STATUS = 44; // app viewport plus a drawn status bar = 390 × 844

/* ---------- 1. Real screens: Neutral dark, white accent, emerald felt ---------- */
async function capture(b) {
  const shots = {};
  const open = async q => {
    const c = await b.newContext({ viewport: { width: SCREEN_W, height: SCREEN_H }, deviceScaleFactor: 3 });
    await c.addInitScript(() => { window.__anteNoBadgePop = true; });
    const p = await c.newPage();
    await p.goto(URL + "?acc=1&reset=1"); await p.waitForSelector(".screen");
    await p.evaluate(() => {
      localStorage.setItem("ante-prefs", JSON.stringify({ theme: "neutral", accent: "white", clock: "bitcount", felt: "emerald", back: "gold", name: "Peter", sound: false, haptics: true,
        seenIntro: { focus: true, strict: true }, lang: "en", terms: { v: 99, at: 1 }, badges: ["streak30", "hours50"] }));
    });
    await p.goto(URL + (q || "?acc=1")); await p.waitForSelector(".screen"); await p.waitForTimeout(800);
    return p;
  };
  const snap = async (p, n) => { const f = path.join(TMP, n + ".png"); await p.screenshot({ path: f }); shots[n] = "file://" + f; };

  let p = await open(); await snap(p, "home");
  await p.click('[data-a="schedules"]'); await p.waitForTimeout(300);
  for (const k of ["sleep", "work"]) { await p.click(`[data-a="schedPreset"][data-v="${k}"]`); await p.waitForTimeout(300); await p.click('[data-a="schedSave"]'); await p.waitForTimeout(300); }
  await p.waitForTimeout(300); await snap(p, "schedules");
  await p.click('.sheet [data-a="closeSheet"].btn'); await p.waitForTimeout(200);
  await p.click('[data-t="profile"]'); await p.waitForTimeout(500); await snap(p, "profile");
  await p.click('[data-a="recap"]'); await p.waitForTimeout(900); await snap(p, "recap");
  await p.context().close();

  p = await open("?mode=block&pkg=com.instagram.android&acc=1"); await p.waitForTimeout(400); await snap(p, "block"); await p.context().close();

  p = await open();
  await p.click('[data-t="tables"]'); await p.waitForTimeout(400); await snap(p, "tables");
  await p.click('[data-a="game"][data-id="roulette"]'); await p.waitForTimeout(600);
  // Spin until a win shows (a store picture shouldn't open on a loss).
  for (let k = 0; k < 8; k++) {
    await p.click('[data-a="rSpin"]'); await p.waitForTimeout(7500);
    if (/win/i.test(await p.textContent("#result").catch(() => ""))) break;
  }
  await snap(p, "roulette");
  await p.click('[data-a="leave"]').catch(() => {}); await p.waitForTimeout(400);
  await p.click('[data-a="game"][data-id="blackjack"]'); await p.waitForTimeout(500); await p.click('[data-a="bjDeal"]'); await p.waitForTimeout(3500); await snap(p, "blackjack");
  await p.context().close();

  p = await open();
  await p.evaluate(() => window.App.act.web()); await p.waitForTimeout(300);
  await p.evaluate(() => window.App.act.webOn()); await p.waitForTimeout(800);
  await p.evaluate(() => { window.App.ui.sheet = { type: "web" }; window.App.paintOverlay(); }); await p.waitForTimeout(400);
  await snap(p, "web");
  await p.context().close();
  return shots;
}

/* ---------- 2. The set: felt, gold, chips, cards, a titanium phone ---------- */
const GOLD = "linear-gradient(180deg,#fff3c4 0%,#f1d27a 38%,#c99a3b 70%,#9a6f22 100%)";
const NOISE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>')}")`;
const LOGO = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 7.5h7v1.2L13 12l2.5 3.3v1.2h-7v-1.2L11 12 8.5 8.7z" fill="currentColor"/></svg>`;

const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Geist;font-weight:400 800;src:url(${FONT("Geist-latin.woff2")}) format('woff2')}
@font-face{font-family:Bitcount;font-weight:100 900;src:url(${FONT("BitcountGridDouble-latin.woff2")}) format('woff2')}
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:Geist,sans-serif;color:#f4efe2;
  background:radial-gradient(70% 55% at 50% 38%, #1f7a52 0%, #145a3c 45%, #0b3a27 78%, #062419 100%);}
/* Felt: fine fibres and a soft vignette, like a lit card table */
body::before{content:"";position:absolute;inset:0;background-image:${NOISE};background-size:240px;opacity:.5;mix-blend-mode:overlay;pointer-events:none}
body::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.55));pointer-events:none}
.z{position:absolute;z-index:2}
.brand{display:flex;align-items:center;gap:16px;font-weight:750;font-size:44px;letter-spacing:-.02em;color:#f4efe2}
.brand svg{width:50px;height:50px;color:#e9c46a}
.h{font-weight:780;letter-spacing:-.045em;line-height:.98;color:#fbf7ec;text-shadow:0 4px 30px rgba(0,0,0,.35)}
.h em{font-style:normal;background:${GOLD};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(60,35,0,.35))}
.s{color:rgba(244,239,226,.78);font-weight:500;line-height:1.35;letter-spacing:-.01em}
/* A gold rule like a table's inlay line */
.rule{height:3px;border-radius:2px;background:${GOLD};opacity:.9}
.pill{display:inline-flex;align-items:center;gap:14px;padding:16px 28px;border-radius:999px;background:rgba(6,30,20,.55);box-shadow:inset 0 0 0 1.5px rgba(233,196,106,.55);
  font-weight:620;font-size:30px;white-space:nowrap;color:#f4efe2;backdrop-filter:blur(6px)}
.pill i{width:12px;height:12px;border-radius:50%;background:${GOLD}}

/* The phone: titanium band, black glass, punch-hole camera, side keys */
.dev{position:absolute;aspect-ratio:${SCREEN_W + 30}/${SCREEN_H + STATUS + 30};border-radius:13.5%/6.4%;padding:2.3%;
  background:linear-gradient(135deg,#8d8f94 0%,#3c3d41 14%,#5d5f64 30%,#1e1f22 52%,#4b4c50 72%,#2a2b2e 88%,#7d7f84 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35), inset 0 0 0 4px rgba(0,0,0,.6), 0 90px 140px -40px rgba(0,0,0,.75), 0 40px 60px -30px rgba(0,0,0,.6);z-index:3}
.dev::before,.dev::after{content:"";position:absolute;width:1.1%;border-radius:3px;background:linear-gradient(90deg,#2a2b2e,#6d6f74,#2a2b2e)}
.dev::before{right:-0.9%;top:20%;height:9%}
.dev::after{left:-0.9%;top:16%;height:13%;box-shadow:0 calc(100% + 40px) 0 0 #3a3b3e}
.glass{position:relative;width:100%;height:100%;border-radius:12.2%/5.8%;overflow:hidden;background:#0a0a0a;box-shadow:0 0 0 3px #050505}
.glass .sb{height:${(STATUS / (SCREEN_H + STATUS)) * 100}%;display:flex;align-items:center;justify-content:space-between;padding:0 8%;font-weight:650;color:#fafafa;background:#0a0a0a}
.glass .sb svg{height:42%}
.glass .cam{position:absolute;left:50%;top:1.55%;width:3.3%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle at 40% 35%,#2b3550,#05060a 60%);box-shadow:0 0 0 1px #1a1a1a}
.glass img{display:block;width:100%}
.glass::after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.08),transparent 28%);pointer-events:none}

/* Props: clay chips and cards, a few, mostly off the edges */
.chip{position:absolute;border-radius:50%;z-index:1;box-shadow:0 18px 30px -8px rgba(0,0,0,.6), inset 0 -6px 0 rgba(0,0,0,.25)}
.chip::before{content:"";position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(from 8deg, #fff 0 12deg, transparent 12deg 45deg);
  -webkit-mask:radial-gradient(circle, transparent 62%, #000 63%, #000 86%, transparent 87%);mask:radial-gradient(circle, transparent 62%, #000 63%, #000 86%, transparent 87%)}
.chip::after{content:"";position:absolute;inset:24%;border-radius:50%;border:3px dashed rgba(255,255,255,.55);background:radial-gradient(circle at 40% 35%, rgba(255,255,255,.18), transparent 60%)}
.card{position:absolute;z-index:1;width:230px;aspect-ratio:5/7;border-radius:18px;background:linear-gradient(160deg,#fffdf7,#efe8d8);box-shadow:0 30px 50px -12px rgba(0,0,0,.6);
  font-weight:800;font-size:58px;line-height:1;padding:18px 20px}
.card.red{color:#c2272d}.card.blk{color:#16161a}
.card b{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);font-size:150px}
.card .rv{position:absolute;right:20px;bottom:18px;transform:rotate(180deg)}
.blur{filter:blur(5px)}
.widget{border-radius:46px;background:#141414;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.08),0 40px 70px -20px rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#fafafa}
.widget .dot{font-family:Bitcount;font-weight:330;line-height:.9;font-variation-settings:"ELSH" 0}
.widget small{font-size:28px;color:#a3a3a3;font-weight:600}
.tile{display:flex;align-items:center;gap:22px;padding:0 34px;border-radius:40px;background:#fafafa;color:#0a0a0a;box-shadow:0 30px 60px -20px rgba(0,0,0,.6)}
.tile svg{width:52px;height:52px}.tile b{display:block;font-size:36px}.tile span{font-size:26px;font-weight:600;opacity:.6}
</style></head><body>${body}</body></html>`;

const STATUSBAR = `<div class="sb" style="font-size:var(--sbf)"><span>9:41</span><span style="display:flex;gap:.5em;align-items:center;height:100%">
  <svg viewBox="0 0 18 12" fill="#fafafa"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
  <svg viewBox="0 0 26 12" fill="none"><rect x=".75" y=".75" width="21.5" height="10.5" rx="3" stroke="#fafafa" stroke-opacity=".5" stroke-width="1.5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill="#fafafa"/><rect x="23.5" y="4" width="1.8" height="4" rx=".9" fill="#fafafa" fill-opacity=".5"/></svg></span></div>`;
/** A phone at (x, y), [w] wide, showing [src]. */
const phone = (src, x, y, w, rot = 0, z = 3) => `<div class="dev" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);z-index:${z};--sbf:${(w * 0.036).toFixed(1)}px">
  <div class="glass">${STATUSBAR}<img src="${src}"><span class="cam"></span></div></div>`;
const chip = (x, y, d, color, extra = "") => `<div class="chip ${extra}" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;background:radial-gradient(circle at 40% 35%, color-mix(in oklab, ${color} 80%, white), ${color} 55%, color-mix(in oklab, ${color} 70%, black))"></div>`;
const card = (x, y, rank, suit, red, rot, extra = "") => `<div class="card ${red ? "red" : "blk"} ${extra}" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)">${rank}<br>${suit}<b>${suit}</b><span class="rv">${rank}<br>${suit}</span></div>`;

async function render(b, html, w, h, file) {
  const f = path.join(TMP, path.basename(file) + ".html");
  fs.writeFileSync(f, html);
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto("file://" + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: file });
  await c.close();
}

async function store(b, S) {
  const W = 1080, H = 1920;
  // 1 + 2: one 2160 px panorama, the block-screen phone straddling the seam.
  const pano = page(W * 2, H, `
    <div class="z brand" style="left:90px;top:100px">${LOGO}Ante</div>
    <p class="z h" style="left:90px;top:220px;font-size:136px;width:900px">Your feed never <em>ends.</em></p>
    <div class="z rule" style="left:94px;top:520px;width:120px"></div>
    <p class="z s" style="left:90px;top:560px;font-size:44px;width:820px">Give every app a daily budget of minutes.</p>
    ${phone(S.home, 150, 740, 640, -4)}
    ${phone(S.block, 860, 640, 640, 5, 4)}
    <p class="z h" style="left:1220px;top:220px;font-size:136px;width:860px;text-align:right">Your day <em>does.</em></p>
    <div class="z rule" style="right:94px;top:520px;width:120px"></div>
    <p class="z s" style="left:1220px;top:560px;font-size:44px;width:850px;text-align:right">When the time is up, Ante covers the app.</p>
    <div class="z widget" style="right:110px;top:800px;width:440px;height:260px"><span class="dot" style="font-size:150px">1:09</span><small>left today</small></div>
    <p class="z s" style="right:116px;top:1085px;font-size:26px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:rgba(233,196,106,.9)">Home-screen widget</p>
    <div class="z pill" style="right:110px;top:1210px"><i></i>One budget per category</div>
    <div class="z pill" style="right:110px;top:1320px"><i></i>Blocks adult sites too</div>
    ${chip(1580, 1560, 230, "#b3202a")}${chip(1760, 1660, 200, "#16161a")}${chip(1950, 1500, 260, "#1d4fa8", "blur")}
    ${card(-60, 1650, "A", "♠", false, -18)}`);
  const panoFile = path.join(TMP, "pano.png");
  await render(b, pano, W * 2, H, panoFile);
  const c = await b.newContext({ viewport: { width: W, height: H } });
  const p = await c.newPage();
  for (const [i, x] of [[1, 0], [2, W]]) {
    await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${fs.readFileSync(panoFile).toString("base64")}" style="display:block;margin-left:${-x}px"></body>`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(STORE, `0${i}-${i === 1 ? "feed-never-ends" : "your-day-does"}.png`) });
  }
  await c.close();

  // 3: the tables
  await render(b, page(W, H, `
    <p class="z h" style="left:80px;top:140px;font-size:124px;width:930px">Want more time? <em>Bet it.</em></p>
    <div class="z rule" style="left:84px;top:430px;width:120px"></div>
    <p class="z s" style="left:80px;top:470px;font-size:42px;width:900px">Ten tables: roulette, blackjack, plinko and more. The house keeps a small edge, so the more you play, the less you scroll.</p>
    ${phone(S.blackjack, 560, 860, 520, 8, 2)}
    ${phone(S.roulette, 90, 800, 600, -4, 3)}
    ${chip(-70, 1450, 250, "#b3202a")}${chip(120, 1640, 190, "#16161a")}${chip(930, 660, 150, "#1d4fa8", "blur")}
    <div class="z pill" style="left:80px;top:665px;font-size:28px"><i></i>No real money · Fair odds, dealt by your phone</div>`),
  W, H, path.join(STORE, "03-bet-the-minutes.png"));

  // 4: Focus, schedules and the website filter
  await render(b, page(W, H, `
    <p class="z h" style="left:80px;top:140px;font-size:124px;width:930px">Lock it in.<br><em>On schedule.</em></p>
    <div class="z rule" style="left:84px;top:430px;width:120px"></div>
    <p class="z s" style="left:80px;top:470px;font-size:42px;width:900px">Focus for work hours and sleep, every week by itself. Block adult and gambling sites with one switch.</p>
    ${phone(S.web, 520, 760, 560, 5, 2)}
    ${phone(S.schedules, 70, 700, 580, -4, 3)}
    <div class="z tile" style="left:640px;top:1640px;width:380px;height:130px;z-index:5"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg><div><b>Focus</b><span>Quick Settings</span></div></div>
    ${chip(-80, 1650, 240, "#16161a")}${chip(930, 1720, 200, "#b3202a", "blur")}`),
  W, H, path.join(STORE, "04-focus-schedules.png"));

  // 5: hours back and the badges
  await render(b, page(W, H, `
    <p class="z h" style="left:80px;top:140px;font-size:124px;width:930px">See the hours you <em>got back.</em></p>
    <div class="z rule" style="left:84px;top:430px;width:120px"></div>
    <p class="z s" style="left:80px;top:470px;font-size:42px;width:900px">A weekly card made for a screenshot, and 56 badges to earn on the way. Free, no ads, nothing leaves your phone.</p>
    ${phone(S.profile, 540, 800, 520, 7, 2)}
    ${phone(S.recap, 80, 720, 600, -4, 3)}
    ${chip(860, 1660, 230, "#b3202a")}${chip(-60, 1700, 180, "#1d4fa8", "blur")}`),
  W, H, path.join(STORE, "05-hours-back.png"));

  // Feature graphic (1024×500)
  await render(b, page(1024, 500, `
    <div class="z brand" style="left:60px;top:70px;font-size:38px">${LOGO}Ante</div>
    <p class="z h" style="left:60px;top:145px;font-size:80px;width:560px">Bet your <em>screen time.</em></p>
    <p class="z s" style="left:60px;top:340px;font-size:24px;width:500px">App limits you can't scroll past, and tables where the house usually wins.</p>
    ${phone(S.roulette, 650, 50, 270, -6, 3)}
    ${phone(S.block, 810, 110, 250, 7, 2)}
    ${chip(560, 380, 150, "#b3202a")}${chip(940, -40, 120, "#16161a", "blur")}`),
  1024, 500, path.join(STORE, "feature-graphic.png"));

}

(async () => {
  const b = await chromium.launch();
  const S = await capture(b);
  await store(b, S);
  await b.close();
  console.log("Wrote", fs.readdirSync(STORE).length, "store images to docs/store");
})().catch(e => { console.error(e); process.exit(1); });
