// End-to-end check of the bundled UI in Chromium, using the browser mock bridge.
// Usage: node web-tests/e2e.js [screenshot-dir]
// Exits non-zero on any console error, failed check or horizontal overflow.
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

// E2E_URL tests a served copy (for example the web demo build); default is the bundled app files.
const INDEX = process.env.E2E_URL || "file://" + path.resolve(__dirname, "../app/src/main/assets/web/index.html");
const OUT = process.argv[2] || path.resolve(__dirname, "../build/e2e");
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log((ok ? "ok   " : "FAIL ") + msg); };

/** Taps a navbar tab. Like a person, it first scrolls up a little if the navbar is tucked away. */
async function tab(p, t) {
  await p.evaluate(() => window.App.showNav && window.App.showNav());
  await p.waitForTimeout(350);
  await p.click(`[data-t="${t}"]`);
}

async function page(browser, query, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  // People in these tests have already accepted the current Terms (the onboarding test accepts them itself).
  if (!opts.newTerms && !/onboard=1/.test(query)) await ctx.addInitScript(() => {
    try { const p = JSON.parse(localStorage.getItem("ante-prefs") || "{}"); if (!p.terms) { p.terms = { v: 99, at: 1 }; localStorage.setItem("ante-prefs", JSON.stringify(p)); } } catch (e) { /* storage blocked */ }
  });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", e => p.errors.push(e.message));
  p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
  await p.goto(INDEX + query);
  await p.waitForSelector(".screen");
  await p.waitForTimeout(300);
  return p;
}
/** Polls a condition with evaluate(). Some Playwright versions run waitForFunction through eval, which the app's CSP rightly forbids. */
async function waitUntil(p, fn, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await p.evaluate(fn)) return; await p.waitForTimeout(50); }
  throw new Error("timed out waiting for " + fn.toString().slice(0, 80));
}
/** Inside a game: tap the stake until it draws on `pkg`'s minutes. */
async function stakeFrom(p, pkg) {
  for (let k = 0; k < 6 && (await p.evaluate(() => window.App.ui.stakePkg)) !== pkg; k++) await p.click('[data-a="stakeCycle"]');
}
/** Inside a game: step the stake down to one minute. */
async function stakeMin(p) {
  while (await p.$('[data-a="stake"][data-d="-1"]:not([disabled])')) await p.click('[data-a="stake"][data-d="-1"]');
}
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + ".png") });
const leftOf = (p, pkg) => p.evaluate(k => window.Ante.state().limits.find(l => l.pkg === k).leftSec, pkg);
async function noScroll(p, label) {
  const f = await p.evaluate(() => { const sc = document.getElementById("screen"); return [sc.scrollHeight, sc.clientHeight]; });
  check(f[0] <= f[1] + 1, `${label} fits one screen (${f[0]} <= ${f[1]})`);
}
async function noOverflow(p, label) {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(w[0] <= w[1], `${label}: no horizontal overflow (${w[0]} <= ${w[1]})`);
}

(async () => {
  const browser = await chromium.launch();

  /* Today + permission + add limit */
  let p = await page(browser, "?reset=1");
  await shot(p, "01-today-permission");
  check(await p.isVisible("text=Let Ante see which app you open"), "permission card shows when the switch is off");
  await p.click("text=Open Accessibility settings");
  await p.waitForSelector('[data-a="agreeAcc"]');
  check(await p.isVisible("text=does not read what is on your screen"), "disclosure shows before Settings");
  await shot(p, "01b-consent");
  await p.click('[data-a="agreeAcc"]');
  await p.waitForTimeout(400);
  check(!(await p.isVisible("text=Let Ante see which app you open")), "permission card hides after switching on");
  await shot(p, "02-today");
  await noOverflow(p, "today");
  await p.click('[data-a="add"]');
  await p.waitForSelector(".pick-list .limit");
  await p.fill("#app-search", "red");
  await p.waitForTimeout(100);
  check((await p.$$(".pick-list .limit")).length === 1, "app search filters the list");
  await shot(p, "03-picker");
  await p.click('.pick-list [data-pkg="com.reddit.frontpage"]');
  await p.click('[data-a="limSet"][data-v="900"]');
  await shot(p, "04-edit-sheet");
  await p.click('[data-a="saveLimit"]');
  await p.waitForTimeout(200);
  check(await p.isVisible('.limit[data-pkg="com.reddit.frontpage"]'), "new limit appears on Today");
  check((await leftOf(p, "com.reddit.frontpage")) === 900, "new limit starts full");

  /* Removing and re-adding a limit must not refill it */
  await p.evaluate(() => { window.Ante.bet("com.reddit.frontpage", 900); });
  await p.click('.limit[data-pkg="com.reddit.frontpage"]');
  await p.click('[data-a="removeLimit"]');
  await p.click('[data-a="add"]');
  await p.waitForSelector('.pick-list [data-pkg="com.reddit.frontpage"]');
  await p.click('.pick-list [data-pkg="com.reddit.frontpage"]');
  await p.click('[data-a="saveLimit"]');
  await p.waitForTimeout(200);
  check((await leftOf(p, "com.reddit.frontpage")) === 0, "removing and re-adding a used-up limit keeps it at 0:00");

  /* Tables list */
  await tab(p, "tables");
  await p.waitForTimeout(200);
  await shot(p, "05-tables");
  await noOverflow(p, "tables");
  {
    // Drag along the nav bar from Play to Profile: the indicator follows and letting go opens Profile.
    const a = await (await p.$('[data-t="tables"]')).boundingBox(), z = await (await p.$('[data-t="profile"]')).boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
    for (let k = 1; k <= 6; k++) await p.mouse.move(a.x + a.width / 2 + (z.x - a.x) * k / 6, a.y + a.height / 2);
    check(await p.evaluate(() => document.querySelector(".navpill").classList.contains("dragging")), "the nav indicator follows a drag");
    await p.mouse.up(); await p.waitForTimeout(450);
    check(await p.evaluate(() => window.App.ui.view === "profile"), "letting go over Profile opens Profile");
    check(!(await p.$(".navtip")), "tapping a tab shows no text label");
    await tab(p, "tables"); await p.waitForTimeout(250);
    check(await p.evaluate(() => window.App.ui.view === "tables"), "a plain tap still switches tabs");
    const sb = await p.evaluate(() => getComputedStyle(document.getElementById("screen")).scrollbarWidth);
    check(sb === "none", "no scrollbar on the page");
  }

  /* Coin */
  const ig = "com.instagram.android";
  check(!(await p.$("#stake-val")), "the Play tab shows only the games, no stake panel");
  await p.click('[data-a="game"][data-id="coin"]');
  await p.waitForTimeout(250); await noScroll(p, "coin");
  await stakeFrom(p, ig);
  check(await p.evaluate(() => window.App.ui.stakePkg) === "com.instagram.android", "tapping the stake switches which app's time is staked");
  let before = await leftOf(p, ig);
  await p.click('[data-a="coinFlip"]');
  await p.waitForTimeout(600);
  await shot(p, "06-coin-midair");
  await p.waitForSelector('[data-a="coinFlip"]:not([disabled])', { timeout: 5000 });
  let after = await leftOf(p, ig);
  check(after === before - 300 || after === before - 300 + 570, `coin settles to -5:00 or +4:30 (${before} → ${after})`);
  await shot(p, "07-coin-done");
  await p.click('[data-a="leave"]');

  /* Roulette */
  await p.click('[data-a="game"][data-id="roulette"]');
  await p.waitForTimeout(200);
  await shot(p, "08-roulette");
  {
    const r = await p.evaluate(() => { const b = document.querySelector(".wheel").getBoundingClientRect(); return [b.width, b.height]; });
    check(Math.abs(r[0] - r[1]) < 1, `roulette wheel is a circle (${r[0].toFixed(1)} × ${r[1].toFixed(1)})`);
  }
  await p.setViewportSize({ width: 300, height: 844 });
  await p.waitForTimeout(250);
  {
    const r = await p.evaluate(() => { const b = document.querySelector(".wheel").getBoundingClientRect(); return [b.width, b.height]; });
    check(Math.abs(r[0] - r[1]) < 1, `wheel stays round on a narrow phone (${r[0].toFixed(1)} × ${r[1].toFixed(1)})`);
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(250);
  // Several bets at once: black, odd and the number 17.
  // Everything fits without scrolling, on a big and a small phone.
  for (const [w, h] of [[390, 844], [360, 740]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
    const fit = await p.evaluate(() => { const sc = document.getElementById("screen"); return [sc.scrollHeight, sc.clientHeight]; });
    check(fit[0] <= fit[1] + 1, `roulette fits ${w}×${h} without scrolling (${fit[0]} <= ${fit[1]})`);
    const vis = await p.evaluate(() => { const r = document.querySelector('#controls .rgo').getBoundingClientRect(); return r.bottom <= innerHeight; });
    check(vis, `spin button is on screen at ${w}×${h}`);
  }
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(250);
  // 3 bets × 1:00 always fits after the coin round.
  await stakeMin(p);
  await p.click('[data-a="rClear"]');
  await p.click('[data-a="rToggle"][data-v="black"]');
  await p.click('[data-a="rToggle"][data-v="odd"]');
  await p.click('[data-a="rTab"][data-v="numbers"]');
  await p.click('[data-a="rToggle"][data-v="n:17"]');
  await shot(p, "08c-roulette-numbers");
  {
    const t = await p.evaluate(() => { const b = document.querySelector("#controls .rgo"); return (b ? b.textContent : "none") + " | stake " + window.App.ui.stake + " from " + window.App.ui.stakePkg + " left " + JSON.stringify(window.Ante.state().limits.map(l => [l.pkg.split(".")[1], l.leftSec])); });
    check(/3 bets/.test(t), "three bets show on the spin button (" + t + ")");
  }
  await p.click('[data-a="rTab"][data-v="outside"]');
  await p.click('[data-a="rToggle"][data-v="odd"]');
  await p.click('[data-a="rToggle"][data-v="odd"]');
  check(await p.evaluate(() => window.App.ui.rbets.slice().sort().join()) === "black,n:17,odd", "tapping a bet twice lifts it and puts it back");
  check(await p.evaluate(() => document.querySelector('[data-v="numbers"] .rcount').textContent) === "1", "the Numbers tab counts its bets");
  await shot(p, "08b-roulette-bets");
  const per = await p.evaluate(() => window.App.ui.stake);
  before = await leftOf(p, ig);
  {
    // Spin it by hand: a fast drag round the rim.
    const wb = await (await p.$(".wheel")).boundingBox();
    const cx = wb.x + wb.width / 2, cy = wb.y + wb.height / 2, r = wb.width * 0.4;
    await p.mouse.move(cx + r, cy); await p.mouse.down();
    for (let k = 1; k <= 6; k++) await p.mouse.move(cx + r * Math.cos(k * 0.35), cy + r * Math.sin(k * 0.35));
    await p.mouse.up();
  }
  await p.waitForTimeout(150);
  check(await p.evaluate(() => window.App.ui.busy === true), "flicking the wheel by hand spins it");
  await p.waitForTimeout(800);
  check(await p.evaluate(() => document.getElementById("screen").classList.contains("focus")), "the table goes full screen while it spins");
  await p.waitForTimeout(1700);
  await shot(p, "09-roulette-spinning");
  await p.waitForSelector('[data-a="rSpin"]:not([disabled])', { timeout: 9000 });
  after = await leftOf(p, ig);
  {
    const n = await p.evaluate(() => window.App.ui.hist[0]);
    const want = await p.evaluate(([n, per]) => window.AnteGames.rouletteReturn(["black", "odd", "n:17"], n) * per, [n, per]);
    check(after === before - 3 * per + want, `three bets settle together on ${n} (${before} → ${after}, expected ${before - 3 * per + want})`);
  }
  check(await p.isVisible(".wheel-result.show"), "winning number shows in the wheel");
  await shot(p, "10-roulette-done");
  await waitUntil(p, () => !!(() => !document.getElementById("screen").classList.contains("focus"))(), 4000);
  check(true, "the table snaps back after the round");
  await noOverflow(p, "roulette");
  await p.click('[data-a="leave"]');

  /* Slots */
  await p.click('[data-a="game"][data-id="slots"]');
  await p.waitForTimeout(250); await noScroll(p, "slots");
  await p.waitForTimeout(200);
  await stakeFrom(p, ig);
  await stakeMin(p);
  {
    // Pull the lever: drag the knob down past the catch.
    const lv = await p.$(".lever"); const b = await lv.boundingBox();
    before = await leftOf(p, ig);
    await p.mouse.move(b.x + b.width / 2, b.y + 24);
    await p.mouse.down();
    for (let k = 1; k <= 8; k++) await p.mouse.move(b.x + b.width / 2, b.y + 24 + (b.height - 48) * k / 8);
    await p.mouse.up();
    await p.waitForTimeout(300);
    check(await p.evaluate(() => window.App.ui.busy === true), "pulling the lever spins the reels");
    await p.waitForSelector('[data-a="sSpin"]:not([disabled])', { timeout: 6000 });
    await p.waitForTimeout(1900);
    // A short drag that doesn't reach the catch springs back without spinning.
    await p.mouse.move(b.x + b.width / 2, b.y + 24);
    await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + 50); await p.mouse.up();
    await p.waitForTimeout(150);
    check(await p.evaluate(() => !window.App.ui.busy), "a half pull does not spin");
    await p.waitForTimeout(600);
  }
  await p.click('[data-a="sSpin"]');
  await p.waitForTimeout(700);
  await shot(p, "11-slots-spinning");
  await p.waitForSelector('[data-a="sSpin"]:not([disabled])', { timeout: 6000 });
  check((await p.$$(".reel .strip .cell")).length === 9, "reels settle to three visible symbols each");
  await shot(p, "12-slots-done");
  await p.click('[data-a="leave"]');

  /* Blackjack (from TikTok's untouched budget, so earlier losing streaks can't starve it) */
  await p.click('[data-a="game"][data-id="blackjack"]');
  await p.waitForTimeout(250); await noScroll(p, "blackjack");
  await p.waitForTimeout(200);
  await stakeFrom(p, "com.zhiliaoapp.musically");
  await stakeMin(p);
  await p.click('[data-a="bjDeal"]');
  await waitUntil(p, () => !!(() => document.querySelector('[data-a="bjStand"]') || document.querySelector('[data-a="bjDeal"]:not([disabled])'))(), 6000);
  await shot(p, "13-blackjack-dealt");
  check(!(await p.$('[data-a="leave"]:not([disabled])')) || !(await p.$('[data-a="bjStand"]')), "back button locked while a hand is open");
  if (await p.$('[data-a="bjStand"]')) await p.click('[data-a="bjStand"]');
  await p.waitForSelector('[data-a="bjDeal"]:not([disabled])', { timeout: 8000 });
  await p.waitForTimeout(300);
  await shot(p, "14-blackjack-done");
  check((await p.textContent("#result")).length > 3, "blackjack shows a result line");
  await p.click('[data-a="leave"]');

  /* Poker */
  await p.click('[data-a="game"][data-id="poker"]');
  await p.waitForTimeout(250); await noScroll(p, "poker");
  await p.waitForTimeout(200);
  await p.click('[data-a="pDeal"]');
  await p.waitForSelector('[data-a="pDraw"]', { timeout: 6000 });
  await p.click('.vp-slot[data-i="0"]');
  await p.click('.vp-slot[data-i="2"]');
  check((await p.$$(".vp-slot.held")).length === 2, "tapping cards holds them");
  await shot(p, "15-poker-held");
  await p.click('[data-a="pDraw"]');
  await p.waitForSelector('[data-a="pDeal"]:not([disabled])', { timeout: 8000 });
  await shot(p, "16-poker-done");
  await noOverflow(p, "poker");

  /* Ledger */
  await p.click('[data-a="leave"]');
  await tab(p, "home");
  await p.waitForTimeout(200);
  await tab(p, "home");
  await p.waitForTimeout(200);
  check(await p.isVisible(".dotclock"), "home shows the dot-matrix clock");
  check((await p.$$(".card-chart .sbar-col")).length === 7, "home shows a 7-day stacked screen-time chart");
  check((await p.$$(".card-chart .sbar-col.now .sbar i")).length === 3, "today's bar is split into one segment per app");
  check(await p.isVisible(".card-balance .trend"), "net card shows today's graph");
  await shot(p, "17-home-after-bets");
  await p.click('.card-balance');
  await p.waitForTimeout(250);
  check((await p.$$(".txn")).length >= 5, "bets appear in table results");
  await shot(p, "17b-results");
  await tab(p, "home");
  await p.click('.card-chart');
  await p.waitForTimeout(250);
  check((await p.$$(".slegend li")).length === 3, "screen-time page has a legend per app");
  await p.click('[data-a="range"][data-r="months"]');
  check((await p.$$(".sbars .sbar-col")).length === 6, "screen time switches to 6 months");
  await shot(p, "17c-screentime");
  check(await p.evaluate(() => window.anteBack()) === true, "back from screen time returns home");
  check(await p.isVisible("text=Net minutes today"), "home shows the wins and losses card");
  check(p.errors.length === 0, "no console errors in main flow: " + p.errors.join(" | "));

  /* Back hook */
  check(await p.evaluate(() => window.anteBack()) === false, "back on Home lets the activity close");

  /* Block screen */
  const b = await page(browser, "?mode=block&pkg=" + ig + "&acc=1&breath=2");
  check(await b.isDisabled("#open-app"), "open button waits for a breath first");
  await shot(b, "18-block");
  await b.waitForSelector("#open-app:not([disabled])", { timeout: 4000 });
  check(await b.isVisible("text=Play for more time"), "block screen offers play");
  await b.click('[data-a="pickOpen"][data-v="600"]');
  check((await b.textContent('[data-a="openApp"]')).includes("10:00"), "open button follows the chosen time");
  await b.click('[data-a="toTables"]');
  await b.waitForTimeout(200);
  await b.click('[data-a="game"][data-id="coin"]'); await b.waitForTimeout(150);
  check(await b.evaluate(() => document.getElementById("stake-val").disabled), "block tables are locked to the blocked app");
  await b.click('[data-a="leave"]'); await b.waitForTimeout(150);
  await shot(b, "19-block-tables");
  check(await b.evaluate(() => window.anteBack()) === true, "back from block tables returns to the block screen");
  await b.click('[data-a="openApp"]');
  await b.waitForTimeout(200);
  check(b.errors.length === 0, "no console errors on block screen: " + b.errors.join(" | "));

  /* Session over, nothing left */
  const z = await page(browser, "?mode=block&pkg=com.zhiliaoapp.musically&acc=1&note=Session%20over.");
  await z.evaluate(() => { const s = window.Ante; s.bet("com.zhiliaoapp.musically", 1800); window.anteRefresh(); });
  await z.waitForTimeout(200);
  check(await z.isVisible("text=is done for today"), "empty budget shows the done-for-today state");
  await shot(z, "20-block-empty");

  /* Sounds: every effect plays without errors, mute is remembered */
  const snd = await page(browser, "?acc=1&reset=1");
  await tab(snd, "tables");
  const names = await snd.evaluate(() => window.AnteSFX.names);
  check(names.length >= 14, `sound bank has ${names.length} effects`);
  await snd.click('[data-a="game"][data-id="slots"]');
  await snd.evaluate(() => { window.AnteSFX.names.forEach(n => window.AnteSFX.play(n)); window.AnteSFX.reelStart(); window.AnteSFX.reelStop(); });
  await snd.click('[data-a="sSpin"]');
  await snd.waitForSelector('[data-a="sSpin"]:not([disabled])', { timeout: 6000 });
  check(await snd.evaluate(() => !window.AnteSFX.muted), "sound starts on");
  await snd.click('[data-a="sound"]');
  check(await snd.evaluate(() => window.AnteSFX.muted), "sound button mutes");
  await snd.reload(); await snd.waitForSelector(".screen");
  check(await snd.evaluate(() => window.AnteSFX.muted), "mute survives a reload");
  await snd.evaluate(() => window.AnteSFX.toggle());
  check(snd.errors.length === 0, "no console errors from audio: " + snd.errors.join(" | "));

  /* Health tips + strict mode */
  const st = await page(browser, "?acc=1&wait=1&battery=0&reset=1");
  check(await st.isVisible("text=Blocking on"), "status shows blocking is on");
  check(await st.isVisible(".navpill .ndot"), "profile tab gets a dot when something needs care");
  await tab(st, "profile");
  check(await st.isVisible(".me-card") && await st.isVisible("text=added to your real life"), "profile shows you, hours added, strict, week and donate");
  check(await st.isVisible(".week-dots") && await st.isVisible('[data-a="kofi"]'), "profile has the week and donate boxes");
  await shot(st, "22b-profile-summary");
  await st.click('[data-a="openSettings"]'); await st.waitForTimeout(150);
  check(await st.isVisible("text=Settings"), "the gear opens Settings");
  check(await st.isVisible('[data-a="settingsGo"][data-go="battery"]'), "profile flags restricted background use with an Allow button");
  // Untimed strict mode from older versions still works (turned on directly through the bridge).
  await st.evaluate(() => { window.Ante.setStrict(true); window.App.refresh(); window.App.render(); });
  await st.waitForTimeout(150);
  check(await st.isVisible('[data-a="strictOff"][aria-checked="true"]'), "strict mode turns on");
  await shot(st, "23-strict-on");
  await st.click('[data-a="strictOff"]');
  check(await st.isDisabled("#wait-go"), "turning strict off starts disabled behind a wait");
  check(await st.evaluate(() => window.Ante.setStrict(false)) === false, "bridge refuses to leave strict mode before the wait ends");
  await shot(st, "24-strict-wait");
  await st.waitForSelector("#wait-go:not([disabled])", { timeout: 3000 });
  await st.click("#wait-go");
  await st.waitForTimeout(150);
  check(await st.isVisible('[data-a="explain"][data-v="strict"]'), "strict mode turns off after the wait");

  /* Timed strict mode and Focus (?unit=s: a "day" or "minute" lasts one second) */
  {
    const md = await page(browser, "?acc=1&wait=1&reset=1&unit=s");
    await tab(md, "profile"); await md.waitForTimeout(200);
    await md.click('[data-a="explain"][data-v="strict"]');
    check(await md.isVisible(".ex-art.strict1"), "strict explainer opens with an animation");
    await shot(md, "25a-strict-explain-1");
    await md.click('[data-a="exNext"]');
    check((await md.$$(".ex-list li")).length === 4, "second step explains how strict mode works");
    await md.click('[data-a="exNext"]');
    check((await md.$$('.pk-list[data-wheel="days"] .pk-item')).length === 31, "last step is a scroll wheel from 1 to 31 days");
    check(await md.isVisible("text=Lock · 1 week"), "the wheel starts at one week");
    await md.click('.pk-item[data-v="5"]'); await md.waitForTimeout(700);
    await md.click('.pk-item[data-v="3"]'); await md.waitForTimeout(700);
    check(await md.isVisible("text=Lock · 3 days"), "the button names the length on the wheel");
    await shot(md, "25b-strict-explain-3");
    await md.click('[data-a="exGo"]'); await md.waitForTimeout(200);
    check(await md.isVisible("text=Locked until"), "profile shows the strict lock and its end");
    check(!(await md.$('[data-a="strictOff"]')), "a timed lock has no off switch");
    check(await md.evaluate(() => window.Ante.setStrict(false)) === false, "the bridge refuses to end a timed lock early");
    await md.waitForTimeout(3600); await md.evaluate(() => { window.App.refresh(); window.App.render(); }); await md.waitForTimeout(150);
    check(await md.isVisible('[data-a="explain"][data-v="strict"]'), "strict mode ends by itself when the time is up");
    await md.click('[data-a="explain"][data-v="strict"]'); await md.waitForTimeout(200);
    check(!(await md.$(".ex-art")) && (await md.$$('.pk-list[data-wheel="days"]')).length === 1, "the second time, the intro is skipped and it asks how long right away");
    check(await md.isVisible('[data-a="exIntro"]'), "the intro can still be replayed");
    const fits = await md.evaluate(() => [...document.querySelectorAll(".sheet .btn-row .btn")].every(b => b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1));
    check(fits, "sheet button labels fit on one line");
    await md.click('.sheet [data-a="closeSheet"].btn'); await md.waitForTimeout(150);

    await tab(md, "home"); await md.waitForTimeout(200);
    await md.click('.focus-card [data-a="explain"][data-v="focus"]');
    check(await md.isVisible(".ex-art.focus1"), "focus explainer opens from Home");
    await md.click('[data-a="exNext"]'); await md.click('[data-a="exNext"]');
    check((await md.$$('.pk-list')).length === 2, "Focus length is an hours and minutes wheel");
    await md.click('.pk-list[data-wheel="h"] .pk-item[data-v="1"]'); await md.waitForTimeout(700);
    await md.click('.pk-list[data-wheel="m"] .pk-item[data-v="0"]'); await md.waitForTimeout(700);
    check((await md.textContent('[data-a="exGo"]')).trim() === "Start · 1 h", "the Start button follows the wheel");
    await md.click('[data-a="exGo"]'); await md.waitForTimeout(200);
    check(await md.isVisible(".focus-card.on"), "Home shows Focus with a countdown");
    await shot(md, "25c-focus-home");
    check(await md.evaluate(() => window.Ante.open("com.instagram.android", 300)) === false, "no app can be opened during Focus, even with time left");
    await md.click('.focus-card [data-a="focusEnd"]');
    check(await md.isDisabled("#wait-go"), "ending Focus early starts behind a wait");
    await md.waitForSelector("#wait-go:not([disabled])", { timeout: 3000 });
    await md.click("#wait-go"); await md.waitForTimeout(200);
    check(!(await md.$(".focus-card.on")), "Focus ends after the wait");
    check(md.errors.length === 0, "no console errors in Focus and Strict: " + md.errors.join(" | "));
  }
  /* Scrolling: the navbar tucks away going down and comes back going up; a sheet holds the page still */
  {
    const sc = await page(browser, "?acc=1&reset=1");
    const box = await sc.$eval("#screen", el => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await sc.mouse.move(box.x, box.y);
    await sc.mouse.wheel(0, 500); await sc.waitForTimeout(400);
    check(await sc.evaluate(() => document.getElementById("app").classList.contains("nav-away")), "scrolling down hides the navbar");
    await sc.mouse.wheel(0, -120); await sc.waitForTimeout(400);
    check(!(await sc.evaluate(() => document.getElementById("app").classList.contains("nav-away"))), "scrolling back up shows the navbar again");
    await sc.evaluate(() => { document.getElementById("screen").scrollTop = 0; });
    await sc.click('.focus-card [data-a="explain"][data-v="focus"]'); await sc.waitForTimeout(400);
    const before = await sc.evaluate(() => document.getElementById("screen").scrollTop);
    const ends = await sc.$eval(".sheet .ex-title", el => { const r = el.getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; });
    await sc.mouse.move(ends.x, ends.y); await sc.mouse.wheel(0, 600); await sc.waitForTimeout(300);
    check(await sc.evaluate(() => document.getElementById("screen").scrollTop) === before, "swiping on a sheet doesn't scroll the page behind it");
    check(await sc.evaluate(() => getComputedStyle(document.getElementById("screen")).overflowY) === "hidden", "the page behind an open sheet is locked");
    await sc.context().close();
  }
  /* Changed Terms: shown once to people who accepted an older version */
  {
    const tm = await page(browser, "?acc=1&reset=1", { newTerms: true });
    await tm.waitForTimeout(900);
    check(await tm.isVisible('[data-a="termsAccept"]'), "people who haven't accepted the current Terms are asked once");
    await tm.click('[data-a="termsAccept"]'); await tm.waitForTimeout(300);
    await tm.reload(); await tm.waitForSelector(".screen"); await tm.waitForTimeout(900);
    check(!(await tm.$('[data-a="termsAccept"]')), "after accepting, the Terms aren't asked again");
    await tm.context().close();
  }
  /* Your data: Drive backup and restore, delete everything (with the lock rule) */
  {
    const dt = await page(browser, "?acc=1&reset=1");
    await dt.evaluate(() => { localStorage.removeItem("ante-mock-drive"); localStorage.setItem("ante-mock-account", JSON.stringify({ signedIn: true, onboarded: true, name: "Peti", email: "p@example.com" })); });
    await dt.goto(INDEX + "?acc=1"); await dt.waitForSelector(".screen");
    await tab(dt, "profile"); await dt.click('[data-a="openSettings"]'); await dt.waitForTimeout(250);
    check(await dt.isVisible("text=Never backed up"), "Settings shows the Drive backup, not yet made");
    await dt.click('[data-a="driveBackup"]'); await dt.waitForTimeout(700);
    check(await dt.isVisible("text=Backed up just now"), "Back up saves to Google Drive");
    await shot(dt, "27a-your-data");
    // A "new phone": fresh data, restore from the backup.
    await dt.evaluate(() => { window.Ante.resetMock(); const S = JSON.parse(localStorage.getItem("ante-mock-v2")); S.limits = []; localStorage.setItem("ante-mock-v2", JSON.stringify(S)); window.AntePrefs.set({ theme: "latte" }); });
    await dt.evaluate(() => { const d = JSON.parse(localStorage.getItem("ante-mock-drive")); d.file.prefs.theme = "mocha"; localStorage.setItem("ante-mock-drive", JSON.stringify(d)); });
    await dt.goto(INDEX + "?acc=1"); await dt.waitForSelector(".screen");
    await tab(dt, "profile"); await dt.click('[data-a="openSettings"]'); await dt.waitForTimeout(250);
    await dt.click('[data-a="driveRestore"]'); await dt.waitForTimeout(700);
    check((await dt.evaluate(() => window.Ante.state().limits.length)) === 3, "restoring brings the limits back");
    check((await dt.evaluate(() => window.AntePrefs.get().theme)) === "mocha", "restoring brings the settings back");
    // Delete is refused during Focus, and works afterwards.
    await dt.evaluate(() => window.Ante.startFocus(30));
    await dt.evaluate(() => { window.App.refresh(); window.App.render(); });
    await dt.click('[data-a="dataDelete"]'); await dt.waitForTimeout(300);
    check(await dt.isDisabled('[data-a="dataDeleteNow"]'), "deleting waits while Focus runs");
    check(await dt.evaluate(() => window.Ante.deleteAllData(true)) === false, "the bridge refuses to delete during Focus");
    await shot(dt, "27b-delete-locked");
    await dt.evaluate(() => { const S = JSON.parse(localStorage.getItem("ante-mock-v2")); S.focusUntilMs = 0; localStorage.setItem("ante-mock-v2", JSON.stringify(S)); });
    await dt.goto(INDEX + "?acc=1"); await dt.waitForSelector(".screen");
    await tab(dt, "profile"); await dt.click('[data-a="openSettings"]'); await dt.waitForTimeout(250);
    await dt.click('[data-a="dataDelete"]'); await dt.waitForTimeout(300);
    await dt.click('[data-a="dataDeleteNow"]'); await dt.waitForTimeout(1200);
    check(await dt.evaluate(() => !window.Ante.account().signedIn && !localStorage.getItem("ante-mock-drive") && !JSON.parse(localStorage.getItem("ante-prefs") || "{}").theme), "delete wipes the account, settings and Drive backup");
    check(dt.errors.length === 0, "no console errors in Your data: " + dt.errors.join(" | "));
    await dt.context().close();
  }
  /* Schedules, the daily spin, the tables switch and the weekly recap */
  {
    const pl = await page(browser, "?acc=1&reset=1");
    await pl.click('[data-a="schedules"]'); await pl.waitForTimeout(250);
    check(await pl.isVisible('[data-a="schedPreset"][data-v="sleep"]'), "schedules offer Work and Sleep presets");
    await pl.click('[data-a="schedPreset"][data-v="work"]'); await pl.waitForTimeout(300);
    check((await pl.$$(".sched-wheels .pk-list")).length === 4, "the editor has hour and minute wheels for the start and end");
    await pl.click('[data-a="schedDay"][data-v="0"]');
    check((await pl.textContent("#sched-sum")).startsWith("Tue, Wed, Thu, Fri"), "tapping a day takes it out of the schedule");
    await pl.click('[data-a="schedDay"][data-v="0"]');
    await pl.click('[data-a="schedSave"]'); await pl.waitForTimeout(250);
    check((await pl.$$(".sched-row")).length === 1, "the saved schedule is listed");
    await shot(pl, "26a-schedules");
    const saved = await pl.evaluate(() => window.Ante.state().schedules[0]);
    check(saved && saved.days === 31 && saved.startMin === 540 && saved.endMin === 1020, "the schedule is weekdays 9:00 to 17:00");
    // A window running now is Focus, and it can't be edited away.
    const live = await pl.evaluate(() => { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); return window.Ante.setSchedule({ id: 0, label: "Now", days: 127, startMin: (m + 1435) % 1440, endMin: (m + 30) % 1440 }); });
    check(live > 0, "a schedule covering now can be added");
    check(await pl.evaluate(() => window.Ante.state().focusActive), "a running schedule turns Focus on");
    check(await pl.evaluate(id => window.Ante.removeSchedule(id), live) === false, "a running schedule can't be removed");
    check(await pl.evaluate(() => window.Ante.open("com.instagram.android", 300)) === false, "no app opens during a scheduled window");
    await pl.click('.sheet [data-a="closeSheet"].btn'); await pl.waitForTimeout(200);
    await pl.evaluate(() => { window.App.refresh(); window.App.render(); });
    check(await pl.isVisible(".focus-card.on"), "Home shows the scheduled Focus");

    // Daily spin: yesterday (sample data) was within the limits.
    const pl2 = await page(browser, "?acc=1&reset=1");
    await pl2.evaluate(() => { window.Ante.resetMock(); const S = JSON.parse(localStorage.getItem("ante-mock-v2")); S.history[0].usedSec = 60; localStorage.setItem("ante-mock-v2", JSON.stringify(S)); });
    await pl2.goto(INDEX + "?acc=1"); await pl2.waitForSelector(".screen");
    await tab(pl2, "tables"); await pl2.waitForTimeout(250);
    const before = await pl2.evaluate(() => window.Ante.state().limits.reduce((a, l) => a + l.leftSec, 0));
    await pl2.click('[data-a="freeSpin"]'); await pl2.waitForTimeout(3300);
    const after = await pl2.evaluate(() => window.Ante.state().limits.reduce((a, l) => a + l.leftSec, 0));
    check([60, 120, 180, 300, 600, 900].includes(after - before), "the daily spin adds a prize of minutes");
    await shot(pl2, "26b-daily-spin");
    check((await pl2.evaluate(() => window.Ante.freeSpin("com.instagram.android"))).ok === false, "the daily spin works once a day");
    await pl2.waitForTimeout(900);
    check(await pl2.isVisible(".spin-card.idle"), "after spinning, the card says it's used");

    // The tables switch.
    await tab(pl2, "profile"); await pl2.waitForTimeout(200);
    await pl2.click('[data-a="recap"]'); await pl2.waitForTimeout(300);
    check(await pl2.isVisible(".recap .recap-big"), "the weekly recap card opens from Profile");
    await shot(pl2, "26c-recap");
    await pl2.click('.sheet [data-a="closeSheet"].btn'); await pl2.waitForTimeout(200);
    await pl2.click('[data-a="openSettings"]'); await pl2.waitForTimeout(250);
    await pl2.click('[data-a="tablesOn"]'); await pl2.waitForTimeout(250);
    check(!(await pl2.$('[data-t="tables"]')), "with the tables off, the Play tab is gone");
    await pl2.click('[data-a="tablesOn"]'); await pl2.waitForTimeout(250);
    check(!!(await pl2.$('[data-t="tables"]')), "turning the tables back on brings the Play tab back");
    // Ante Supporter: extra looks are locked until bought; blocking never is.
    check(await pl2.isVisible('[data-a="clock"][data-v="sixtyfour"] .lock-mark'), "Supporter fonts show a lock");
    await pl2.click('[data-a="clock"][data-v="sixtyfour"]'); await pl2.waitForTimeout(300);
    check(await pl2.isVisible('[data-a="buySupporter"]'), "a locked look opens the Supporter sheet");
    check(await pl2.evaluate(() => window.AntePrefs.get().clock) !== "sixtyfour", "a locked font isn't applied");
    await shot(pl2, "26d-supporter");
    await pl2.click('[data-a="buySupporter"]'); await pl2.waitForTimeout(900);
    check(await pl2.evaluate(() => window.App.isSupporter()), "buying unlocks Supporter");
    check(await pl2.isVisible(".receipt") && await pl2.isVisible("text=lose the 14-day right of withdrawal"), "after buying, a confirmation with the withdrawal waiver is shown");
    await shot(pl2, "26g-receipt");
    await pl2.click('.sheet [data-a="closeSheet"].btn'); await pl2.waitForTimeout(250);
    check(!(await pl2.$('[data-a="clock"][data-v="sixtyfour"] .lock-mark')), "after buying, the locks are gone");
    await pl2.click('[data-a="felt"][data-v="navy"]');
    check(await pl2.evaluate(() => window.AntePrefs.get().felt) === "navy", "a Supporter can pick a table felt");
    // Language: Hungarian everywhere, English again on the way back.
    await pl2.click('[data-a="lang"][data-v="hu"]'); await pl2.waitForTimeout(300);
    check(await pl2.isVisible("text=Beállítások"), "switching to Magyar translates the screen");
    await tab(pl2, "home"); await pl2.waitForTimeout(300);
    check(await pl2.isVisible("text=Képernyőidő"), "Home is in Hungarian too");
    await shot(pl2, "26e-hungarian");
    await tab(pl2, "profile"); await pl2.waitForTimeout(200); await pl2.click('[data-a="openSettings"]'); await pl2.waitForTimeout(250);
    await pl2.click('[data-a="lang"][data-v="de"]'); await pl2.waitForTimeout(300);
    check(await pl2.isVisible("h1:text('Einstellungen')"), "switching to Deutsch translates the screen");
    // The name is a nickname: at most 20 characters, however it's typed.
    await pl2.fill("#name-input", "Petiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
    check(Array.from(await pl2.inputValue("#name-input")).length <= 20 && Array.from(await pl2.evaluate(() => window.AntePrefs.get().name)).length <= 20, "the name stops at 20 characters");
    await pl2.focus("#name-input"); await pl2.waitForTimeout(450);
    check(await pl2.evaluate(() => getComputedStyle(document.querySelector(".navpill")).opacity) === "0", "the navbar hides while typing");
    await pl2.evaluate(() => document.activeElement.blur()); await pl2.waitForTimeout(450);
    check(await pl2.evaluate(() => getComputedStyle(document.querySelector(".navpill")).opacity) === "1", "the navbar comes back after typing");
    await pl2.click('[data-a="lang"][data-v="en"]'); await pl2.waitForTimeout(300);
    check(await pl2.isVisible("h1:text('Settings')"), "switching back to English works");
    check(pl.errors.length === 0 && pl2.errors.length === 0, "no console errors in schedules, spin and recap: " + pl.errors.concat(pl2.errors).join(" | "));
  }
  /* Themes, legal, support */
  await st.click('[data-a="theme"][data-v="mocha"]');
  check(await st.evaluate(() => document.documentElement.dataset.theme) === "mocha", "Catppuccin Mocha theme applies");
  await st.click('[data-a="accent"][data-v="peach"]');
  check(await st.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()) === "#fab387", "accent colour applies");
  await shot(st, "24b-profile-mocha");
  await st.click('[data-a="theme"][data-v="latte"]');
  await shot(st, "24c-profile-latte");
  {
    // Profile picture: pick a file, it shows as a round photo on Profile and Home, and can be removed.
    const pic = path.join(OUT, "_avatar-src.png");
    await st.screenshot({ path: pic, clip: { x: 0, y: 0, width: 300, height: 200 } });
    await st.click('[data-a="closeSettings"]'); await st.waitForTimeout(150);
    const [chooser] = await Promise.all([st.waitForEvent("filechooser"), st.click('.me [data-a="photoPick"]')]);
    await chooser.setFiles(pic);
    await st.waitForSelector(".me img.avatar", { timeout: 4000 });
    const sz = await st.evaluate(() => { const i = document.querySelector(".me img.avatar"); return [i.naturalWidth, i.naturalHeight]; });
    check(sz[0] === 256 && sz[1] === 256, `picked photo becomes a 256px square (${sz})`);
    await st.click('[data-a="openSettings"]'); await st.waitForTimeout(150);
    check(await st.isVisible("text=Your photo"), "settings says a photo is set");
    await st.click('[data-a="photoRemove"]'); await st.waitForTimeout(200);
    await st.click('[data-a="closeSettings"]'); await st.waitForTimeout(150);
    check(!(await st.$(".me img.avatar")), "removing the photo goes back to initials");
    await st.click('[data-a="openSettings"]'); await st.waitForTimeout(150);
  }
  await st.fill("#name-input", "Péter");
  await st.click('[data-a="closeSettings"]'); await st.waitForTimeout(150);
  check((await st.textContent(".me .avatar")).trim() === "P", "display name updates the avatar");
  check(await st.isVisible("text=Donate"), "Ko-fi support card is there");
  await st.click('[data-a="openSettings"]'); await st.waitForTimeout(150);
  await st.click('[data-a="doc"][data-v="imprint"]');
  check(await st.isVisible("text=Péter Rácz"), "imprint shows the provider");
  await shot(st, "24d-imprint");
  await st.click('[data-a="legalBack"]');
  await st.click('[data-a="theme"][data-v="neutral"]');
  check(st.errors.length === 0, "no console errors in strict flow: " + st.errors.join(" | "));

  const gs = await page(browser, "?mode=block&pkg=com.android.settings&note=strict&acc=1&wait=1");
  check(await gs.isVisible("text=is locked"), "strict mode covers Settings");
  await shot(gs, "25-guard-settings");
  await gs.click('[data-a="guardWait"]');
  check(await gs.evaluate(() => window.Ante.openGuarded("com.android.settings")) === false, "Settings stays shut before the wait ends");
  await gs.waitForSelector("#wait-go:not([disabled])", { timeout: 3000 });
  await gs.click("#wait-go");
  const gi = await page(browser, "?mode=block&pkg=com.google.android.packageinstaller&note=strict&acc=1");
  check(await gi.isVisible("text=Installing and removing apps is locked"), "strict mode covers the uninstaller");
  check(gs.errors.length + gi.errors.length === 0, "no console errors on guard screens");

  /* Onboarding: morphing sign-in, Google, permission step */
  const ob = await page(browser, "?onboard=1&reset=1");
  check(await ob.isVisible(".ob-slide.active .ob-title"), "first launch shows the story");
  await shot(ob, "26a-story1");
  {
    // Swipe left with a finger-like drag: the stage follows and lands on slide 2.
    const st = await (await ob.$("#ob-stage")).boundingBox();
    await ob.mouse.move(st.x + st.width * 0.8, st.y + 150); await ob.mouse.down();
    for (let k = 1; k <= 8; k++) { await ob.mouse.move(st.x + st.width * (0.8 - 0.06 * k), st.y + 150); await ob.waitForTimeout(16); }
    await shot(ob, "26a2-story-mid-swipe");
    await ob.mouse.up(); await ob.waitForTimeout(900);
    check(await ob.evaluate(() => window.App.ui.welcomeStep === 1), "swiping moves to the next story slide");
  }
  await shot(ob, "26b-story2");
  await ob.click('[data-a="obNext"]'); await ob.waitForTimeout(650);
  await shot(ob, "26c-story3");
  await ob.click('[data-a="obNext"]'); await ob.waitForTimeout(650);
  check(await ob.isVisible("text=Locked when it counts."), "the story also explains Focus, schedules and Strict mode");
  await ob.click('[data-a="obNext"]'); await ob.waitForTimeout(300);
  check(await ob.isVisible('[data-a="obAgree"]'), "the story leads to the 18+ agreement");
  await shot(ob, "26d-agree");
  await ob.click('[data-a="obAgree"]'); await ob.waitForTimeout(300);
  check(!!(await ob.evaluate(() => window.AntePrefs.get().terms && window.AntePrefs.get().terms.v)), "accepting stores the Terms version and date");
  check(await ob.isVisible(".w-title"), "agreeing leads to sign-in");
  check(!(await ob.$(".navpill")), "no navigation during onboarding");
  await shot(ob, "26-welcome");
  await ob.click('[data-a="signinOpen"]');
  await ob.waitForTimeout(600);
  check(await ob.isVisible("text=Continue with Google"), "sign-in pill opens into the sign-in card");
  await shot(ob, "27-signin-open");
  check(await ob.evaluate(() => window.anteBack()) === true, "back closes the sign-in card");
  await ob.waitForTimeout(500);
  await ob.click('[data-a="signinOpen"]'); await ob.waitForTimeout(500);
  await ob.click('.signin-card [data-a="google"]');
  await ob.waitForSelector('[data-a="obApps"]', { timeout: 3000 });
  check(true, "Google sign-in moves on to picking apps");
  await ob.waitForTimeout(300);
  check((await ob.$$('.ob-app[aria-checked="true"]')).length === 3, "the usual time-eaters come pre-picked");
  await ob.click('.ob-app[aria-checked="true"] >> nth=0'); await ob.waitForTimeout(100);
  check((await ob.textContent('[data-a="obApps"]')).trim() === "Limit 2 apps", "picking updates the button");
  await shot(ob, "26e-apps");
  await ob.click('[data-a="obApps"]'); await ob.waitForTimeout(400);
  check((await ob.evaluate(() => window.Ante.state().limits.length)) >= 2, "the picked apps get a daily limit");
  check(await ob.isVisible('[data-a="obSched"][data-v="work"]'), "next comes the schedules step");
  await ob.click('[data-a="obSched"][data-v="work"]'); await ob.waitForTimeout(300);
  check((await ob.evaluate(() => (window.Ante.state().schedules || []).some(s => s.label === "Work"))), "a schedule can be switched on during onboarding");
  await shot(ob, "26f-schedules");
  await ob.click('[data-a="obNextStep"]'); await ob.waitForTimeout(300);
  await ob.waitForSelector("text=One switch to turn on", { timeout: 3000 });
  check(true, "and last the permission step");
  await shot(ob, "28-welcome-perm");
  await ob.click('[data-a="finishWelcome"]');
  await ob.waitForTimeout(200);
  check(await ob.isVisible(".navpill"), "finishing onboarding lands on Today");
  await tab(ob, "profile");
  await ob.click('[data-a="openSettings"]'); await ob.waitForTimeout(150);
  check(await ob.isVisible("text=demo@example.com"), "settings shows the signed-in account");
  await shot(ob, "29-profile");
  await ob.click('[data-a="signOut"]'); await ob.waitForTimeout(150);
  check(await ob.isVisible('[data-a="google"]') && !(await ob.isVisible("text=demo@example.com")), "sign out works");
  await ob.goto(INDEX + "?acc=1"); await ob.waitForSelector(".screen");
  check(!(await ob.$(".w-title")) && !(await ob.$(".ob-title")), "onboarding does not come back after finishing");
  check(ob.errors.length === 0, "no console errors in onboarding: " + ob.errors.join(" | "));
  const of = await page(browser, "?onboard=1&reset=1&google=fail");
  await of.click('[data-a="obSkip"]'); await of.waitForTimeout(200);
  await of.click('[data-a="obAgree"]'); await of.waitForTimeout(300);
  await of.click('[data-a="signinOpen"]'); await of.waitForTimeout(500);
  await of.click('.signin-card [data-a="google"]');
  await of.waitForSelector("text=No Google account on this phone", { timeout: 3000 });
  check(true, "a failed Google sign-in explains what to do");

  /* Small phone + reduced motion */
  const s = await page(browser, "?acc=1", { width: 340, reduced: true });
  await noOverflow(s, "today at 340px");
  await tab(s, "tables");
  await noOverflow(s, "tables at 340px");
  await shot(s, "21-small-tables");
  await s.click('[data-a="game"][data-id="poker"]');
  await noScroll(s, "poker at 340px");
  await s.click('[data-a="pDeal"]');
  await s.waitForSelector('[data-a="pDraw"]', { timeout: 4000 });
  await noOverflow(s, "poker at 340px");
  await shot(s, "22-small-poker");
  check(s.errors.length === 0, "no console errors at 340px: " + s.errors.join(" | "));

  /* Over-the-air update: waits during a round, switches when calm, says so after the reload */
  const u = await page(browser, "?acc=1");
  await tab(u, "tables"); await u.waitForTimeout(150);
  await u.click('[data-a="game"][data-id="coin"]'); await u.waitForTimeout(150);
  const reloads = [];
  u.on("framenavigated", f => { if (f === u.mainFrame()) reloads.push(f.url()); });
  await u.evaluate(() => window.anteUpdateReady(1));
  await u.waitForTimeout(300);
  check(reloads.length === 0, "an update waits while a table is open");
  await u.click('[data-a="leave"]');
  await u.waitForSelector(".toast, [role=status]", { timeout: 4000 }).catch(() => {});
  await u.waitForTimeout(600);
  check(reloads.length === 1, "the update applies once the table is closed");
  check(await u.isVisible("text=Ante just updated itself."), "after an update, a short note says so");
  await tab(u, "profile"); await u.waitForTimeout(200);
  await u.click('[data-a="openSettings"]'); await u.waitForTimeout(150);
  check(await u.isVisible("text=built-in UI") || await u.isVisible("text=web demo"), "profile shows which UI version runs");
  check(u.errors.length === 0, "no console errors around updates: " + u.errors.join(" | "));

  await browser.close();
  console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nAll checks passed");
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
