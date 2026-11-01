// Makes the Google Play and Instagram images from the real app (browser demo), so they always
// match the current UI. Usage: node scripts/store-art.js
// Writes docs/store/ (5 phone screenshots, the feature graphic, the 512 px icon) and
// docs/instagram/ (profile picture and the first carousel post).
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "app/src/main/assets/web");
const STORE = path.join(ROOT, "docs/store"), INSTA = path.join(ROOT, "docs/instagram");
const TMP = path.join(ROOT, "build/store-art");
[STORE, INSTA, TMP].forEach(d => fs.mkdirSync(d, { recursive: true }));
const URL = "file://" + path.join(WEB, "index.html");
const FONT = n => "file://" + path.join(WEB, "fonts", n);

/* ---------- 1. Real screens, Mocha with the mauve accent and the Doto clock font ---------- */
async function capture(b) {
  const shots = {};
  const page = async q => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
    const p = await c.newPage();
    await p.goto(URL + "?acc=1&reset=1"); await p.waitForSelector(".screen");
    await p.evaluate(() => {
      localStorage.setItem("ante-prefs", JSON.stringify({ theme: "mocha", accent: "mauve", clock: "doto", name: "Peter", sound: false, haptics: true, seenIntro: { focus: true, strict: true }, lang: "en" }));
      localStorage.setItem("ante-mock-supporter", "1");
    });
    await p.goto(URL + (q || "?acc=1")); await p.waitForSelector(".screen"); await p.waitForTimeout(700);
    return p;
  };
  const snap = async (p, n) => { const f = path.join(TMP, n + ".png"); await p.screenshot({ path: f }); shots[n] = "file://" + f; };
  let p = await page(); await snap(p, "home");
  await p.click('[data-a="schedules"]'); await p.waitForTimeout(300);
  for (const k of ["sleep", "work"]) { await p.click(`[data-a="schedPreset"][data-v="${k}"]`); await p.waitForTimeout(300); await p.click('[data-a="schedSave"]'); await p.waitForTimeout(300); }
  await p.waitForTimeout(300); await snap(p, "schedules");
  await p.click('.sheet [data-a="closeSheet"].btn'); await p.waitForTimeout(200);
  await p.click('[data-t="profile"]'); await p.waitForTimeout(300); await p.click('[data-a="recap"]'); await p.waitForTimeout(900); await snap(p, "recap");
  await p.context().close();
  p = await page("?mode=block&pkg=com.instagram.android&acc=1"); await p.waitForTimeout(300); await snap(p, "block"); await p.context().close();
  p = await page();
  await p.click('[data-t="tables"]'); await p.waitForTimeout(400); await snap(p, "tables");
  await p.click('[data-a="game"][data-id="roulette"]'); await p.waitForTimeout(600);
  await p.click('[data-a="rSpin"]'); await p.waitForTimeout(1500); await snap(p, "spin");
  await p.waitForTimeout(6000); await snap(p, "roulette");
  await p.click('[data-a="leave"]').catch(() => {}); await p.waitForTimeout(400);
  await p.click('[data-a="game"][data-id="blackjack"]'); await p.waitForTimeout(500); await p.click('[data-a="bjDeal"]'); await p.waitForTimeout(3500); await snap(p, "blackjack");
  await p.context().close();
  p = await page();
  await p.evaluate(() => { window.App.ui.sheet = { type: "explain", mode: "strict", step: 2, pick: null, quick: true }; window.App.paintOverlay(); }); await p.waitForTimeout(900); await snap(p, "strict");
  await p.context().close();
  return shots;
}

/* ---------- 2. Art pages ---------- */
const C = { crust: "#11111b", mantle: "#181825", base: "#1e1e2e", s0: "#313244", s1: "#45475a", text: "#cdd6f4", sub: "#a6adc8", mauve: "#cba6f7", pink: "#f5c2e7", green: "#a6e3a1", red: "#f38ba8" };
const LOGO = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M8.5 7.5h7v1.2L13 12l2.5 3.3v1.2h-7v-1.2L11 12 8.5 8.7z" fill="currentColor"/></svg>`;
const base = (w, h, body, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Geist;font-weight:400 700;src:url(${FONT("Geist-latin.woff2")}) format('woff2')}
@font-face{font-family:Doto;font-weight:100 900;src:url(${FONT("Doto-latin.woff2")}) format('woff2')}
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:Geist,sans-serif;color:${C.text};background:
  radial-gradient(60% 45% at 30% 18%, color-mix(in oklab, ${C.mauve} 26%, transparent), transparent 70%),
  radial-gradient(55% 40% at 85% 85%, color-mix(in oklab, ${C.pink} 14%, transparent), transparent 70%),
  linear-gradient(180deg, ${C.base}, ${C.crust});}
body::before{content:"";position:absolute;inset:0;background-image:radial-gradient(color-mix(in oklab, ${C.text} 9%, transparent) 1.6px, transparent 1.8px);background-size:22px 22px;mask-image:linear-gradient(180deg,#000,transparent 80%)}
.phone{position:absolute;border-radius:8.2%/3.8%;padding:1.6%;background:linear-gradient(160deg,#2a2b3d,#0c0c14);box-shadow:0 0 0 2px #45475a, 0 60px 120px -20px rgba(0,0,0,.7), 0 30px 60px -30px color-mix(in oklab, ${C.mauve} 40%, transparent)}
.phone img{display:block;width:100%;border-radius:7%/3.3%}
.h{position:absolute;font-weight:700;letter-spacing:-.035em;line-height:1.02}
.h em{font-style:normal;color:${C.mauve}}
.s{position:absolute;color:${C.sub};font-weight:500;line-height:1.35;letter-spacing:-.01em}
.pill{position:absolute;display:inline-flex;align-items:center;gap:14px;padding:18px 30px;border-radius:999px;background:color-mix(in oklab, ${C.s0} 85%, transparent);box-shadow:inset 0 0 0 2px ${C.s1};font-weight:600;font-size:34px;white-space:nowrap}
.pill i{width:14px;height:14px;border-radius:50%;background:${C.mauve}}
.brand{position:absolute;display:flex;align-items:center;gap:16px;font-weight:700;font-size:44px;letter-spacing:-.02em}
.brand svg{width:52px;height:52px;color:${C.mauve}}
.dot{font-family:Doto;font-weight:900}
.widget{position:absolute;border-radius:48px;background:${C.base};box-shadow:0 0 0 2px ${C.s0}, 0 40px 80px -20px rgba(0,0,0,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.widget .dot{line-height:.9;color:${C.text}}
.widget small{font-size:30px;color:${C.sub};font-weight:600}
.tile{position:absolute;display:flex;align-items:center;gap:22px;padding:0 34px;border-radius:40px;background:${C.mauve};color:${C.crust};box-shadow:0 30px 60px -20px rgba(0,0,0,.6)}
.tile svg{width:54px;height:54px}
.tile b{display:block;font-size:38px}
.tile span{font-size:28px;font-weight:600;opacity:.75}
.cap{position:absolute;font-size:28px;font-weight:600;color:${C.sub};letter-spacing:.02em;text-transform:uppercase}
${extra}</style></head><body>${body}</body></html>`;
const phone = (src, x, y, w, rot = 0, z = 1) => `<div class="phone" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg);z-index:${z}"><img src="${src}"></div>`;

async function render(b, html, w, h, file) {
  const f = path.join(TMP, path.basename(file) + ".html");
  fs.writeFileSync(f, html);
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto("file://" + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: file });
  await c.close();
}

/* ---------- 3. Google Play: five 1080×1920 screenshots, the first two one wide picture ---------- */
async function store(b, S) {
  const W = 1080, H = 1920;
  // 1 + 2: one 2160 px panorama, the block-screen phone straddling the seam.
  const pano = base(W * 2, H, `
    <div class="brand" style="left:90px;top:96px">${LOGO}Ante</div>
    <p class="h" style="left:90px;top:210px;font-size:132px;width:900px">Your feed never <em>ends.</em></p>
    <p class="s" style="left:90px;top:520px;font-size:44px;width:860px">Give every app a daily budget of minutes.</p>
    ${phone(S.home, 120, 720, 700, -5)}
    ${phone(S.block, 830, 600, 700, 6, 2)}
    <p class="h" style="left:1240px;top:210px;font-size:132px;width:860px;text-align:right">Your day <em>does.</em></p>
    <p class="s" style="left:1240px;top:520px;font-size:44px;width:860px;text-align:right">When the time is up, Ante covers the app.</p>
    <div class="pill" style="font-size:30px;right:70px;top:760px"><i></i>A daily budget per app</div>
    <div class="pill" style="font-size:30px;right:70px;top:880px"><i></i>A breath before you open</div>
    <div class="pill" style="font-size:30px;right:70px;top:1000px"><i></i>Bet minutes for more</div>
    <div class="widget" style="right:90px;top:1220px;width:440px;height:270px"><span class="dot" style="font-size:150px">1:09</span><small>left today</small></div>
    <p class="cap" style="right:90px;top:1520px">Home-screen widget</p>`);
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

  await render(b, base(W, H, `
    <p class="h" style="left:80px;top:130px;font-size:118px;width:920px">Want more time? <em>Bet it.</em></p>
    <p class="s" style="left:80px;top:430px;font-size:42px;width:900px">Roulette, blackjack, slots, poker and a coin flip. The house keeps a small edge, so the more you play, the less you scroll.</p>
    ${phone(S.blackjack, 520, 760, 560, 8)}
    ${phone(S.roulette, 70, 700, 600, -4, 2)}
    <div class="pill" style="left:80px;top:1760px;font-size:30px"><i style="background:${C.green}"></i>No real money · Fair odds, dealt by your phone</div>`),
  W, H, path.join(STORE, "03-bet-the-minutes.png"));

  await render(b, base(W, H, `
    <p class="h" style="left:80px;top:130px;font-size:118px;width:920px">Focus that runs <em>on time.</em></p>
    <p class="s" style="left:80px;top:430px;font-size:42px;width:900px">Work hours and sleep, every week, by itself. Start one from Quick Settings too.</p>
    ${phone(S.schedules, 440, 640, 600, 3)}
    <div class="tile" style="left:60px;top:860px;width:400px;height:140px;z-index:3"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg><div><b>Focus</b><span>25 min</span></div></div>
    <p class="cap" style="left:64px;top:1030px">Quick Settings</p>
    <div class="widget" style="left:60px;top:1150px;width:400px;height:250px;z-index:3"><span class="dot" style="font-size:132px">0:45</span><small>Focus until 17:00</small></div>
    <p class="cap" style="left:64px;top:1430px">Widget</p>`),
  W, H, path.join(STORE, "04-focus-schedules.png"));

  await render(b, base(W, H, `
    <p class="h" style="left:80px;top:130px;font-size:118px;width:920px">See the hours you <em>got back.</em></p>
    <p class="s" style="left:80px;top:430px;font-size:42px;width:900px">A weekly card made for a screenshot. Lock blocking for days with Strict mode.</p>
    ${phone(S.strict, 560, 760, 520, 7)}
    ${phone(S.recap, 80, 660, 620, -4, 2)}
    <div class="pill" style="left:80px;top:1760px;font-size:30px"><i style="background:${C.green}"></i>No ads · No tracking · Nothing leaves your phone</div>`),
  W, H, path.join(STORE, "05-hours-back.png"));

  // Feature graphic (1024×500) and the 512 px icon.
  await render(b, base(1024, 500, `
    <div class="brand" style="left:60px;top:70px;font-size:40px">${LOGO}Ante</div>
    <p class="h" style="left:60px;top:150px;font-size:76px;width:600px">Bet your <em>screen time.</em></p>
    <p class="s" style="left:60px;top:340px;font-size:26px;width:520px">App limits you can't scroll past, and tables where the house usually wins.</p>
    ${phone(S.home, 640, 70, 300, -6)}
    ${phone(S.block, 800, 120, 280, 7, 2)}`),
  1024, 500, path.join(STORE, "feature-graphic.png"));
  await render(b, `<!doctype html><body style="margin:0">${fs.readFileSync(path.join(ROOT, "docs/brand/ante-logo.svg"), "utf8").replace('width="512" height="512"', 'width="512" height="512" style="display:block"')}</body>`, 512, 512, path.join(STORE, "icon-512.png"));
}

/* ---------- 4. Instagram: profile picture and a 7-slide carousel (1080×1350) ---------- */
async function instagram(b, S) {
  await render(b, base(1080, 1080, `<div style="position:absolute;inset:0;display:grid;place-items:center">
    <svg viewBox="0 0 24 24" width="620" height="620" fill="none" style="color:${C.mauve};filter:drop-shadow(0 30px 60px rgba(203,166,247,.35))"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 7.5h7v1.2L13 12l2.5 3.3v1.2h-7v-1.2L11 12 8.5 8.7z" fill="currentColor"/></svg></div>`),
  1080, 1080, path.join(INSTA, "profile-picture.png"));

  const W = 1080, H = 1350;
  const n = (i, total = 7) => `<p class="s" style="right:70px;top:70px;font-size:30px">${i}/${total}</p>`;
  const tag = `<div class="brand" style="left:70px;top:62px;font-size:34px">${LOGO.replace("<svg", '<svg style="width:40px;height:40px"')}ante</div>`;
  const slides = [
    `${tag}${n(1)}
     <p class="h" style="left:70px;top:330px;font-size:150px;width:950px">Your phone is already a <em>casino.</em></p>
     <p class="s" style="left:70px;top:1000px;font-size:46px;width:900px">So I built one that pays you back in life.</p>
     <p class="s" style="left:70px;top:1190px;font-size:36px;color:${C.mauve}">Swipe →</p>`,
    `${tag}${n(2)}
     <p class="h" style="left:70px;top:230px;font-size:104px;width:940px">Every scroll is a pull of the <em>lever.</em></p>
     <div style="position:absolute;left:70px;top:640px;width:940px;display:flex;flex-direction:column;gap:28px;font-size:46px;font-weight:600">
       <p>↻ &nbsp;A feed that never ends</p><p>✦ &nbsp;Rewards at random</p><p>◷ &nbsp;No clock in sight</p></div>
     <p class="s" style="left:70px;top:1130px;font-size:40px;width:900px">That's not an accident. It's the same design as a slot machine.</p>`,
    `${tag}${n(3)}
     <p class="h" style="left:70px;top:170px;font-size:92px;width:940px">Ante gives every app a <em>budget.</em></p>
     ${phone(S.home, 250, 470, 580, -3)}`,
    `${tag}${n(4)}
     <p class="h" style="left:70px;top:170px;font-size:92px;width:940px">Time's up? The app is <em>covered.</em></p>
     ${phone(S.block, 250, 470, 580, 3)}`,
    `${tag}${n(5)}
     <p class="h" style="left:70px;top:170px;font-size:92px;width:940px">Want more? <em>Bet your minutes.</em></p>
     ${phone(S.roulette, 250, 470, 580, -3)}`,
    `${tag}${n(6)}
     <p class="h" style="left:70px;top:200px;font-size:104px;width:940px">The house keeps a small <em>edge.</em></p>
     <p class="s" style="left:70px;top:470px;font-size:44px;width:900px">So the more you gamble, the less you scroll.</p>
     <div style="position:absolute;left:70px;top:680px;width:940px;padding:56px;border-radius:48px;background:color-mix(in oklab, ${C.s0} 70%, transparent);box-shadow:inset 0 0 0 2px ${C.s1}">
       <p class="dot" style="font-size:210px;line-height:.9;color:${C.text}">2:54<span style="font-family:Geist;font-weight:700;font-size:70px;color:${C.sub}"> h</span></p>
       <p style="margin-top:20px;font-size:40px;color:${C.sub};font-weight:600">given back to real life this week</p></div>`,
    `${tag}${n(7)}
     <p class="h" style="left:70px;top:300px;font-size:150px;width:950px">Ante<span style="color:${C.mauve}">.</span></p>
     <p class="h" style="left:70px;top:480px;font-size:86px;width:940px;color:${C.sub}">Bet your screen time.</p>
     <div style="position:absolute;left:70px;top:760px;display:flex;flex-direction:column;gap:22px;font-size:42px;font-weight:600">
       <p>✓ &nbsp;Free, no ads</p><p>✓ &nbsp;No real money</p><p>✓ &nbsp;Nothing leaves your phone</p></div>
     <p class="s" style="left:70px;top:1150px;font-size:40px;width:940px;color:${C.mauve}">Link in bio · Save this for your next doomscroll</p>`,
  ];
  for (let i = 0; i < slides.length; i++) await render(b, base(W, H, slides[i]), W, H, path.join(INSTA, `post1-slide${i + 1}.png`));
}

(async () => {
  const b = await chromium.launch();
  const S = await capture(b);
  await store(b, S);
  await instagram(b, S);
  await b.close();
  console.log("Wrote", fs.readdirSync(STORE).length, "store images and", fs.readdirSync(INSTA).length, "Instagram images");
})().catch(e => { console.error(e); process.exit(1); });
