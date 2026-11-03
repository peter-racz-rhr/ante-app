# Brief for reviewing and reworking Ante

## 1. What the app is for

**Ante** is a free Android screen-time blocker with a casino twist. You give apps a daily budget
of minutes. When the budget runs out, Ante covers the app with a block screen. If you want more
time, you can "bet" minutes at casino-style tables. The house keeps a small edge, so over time
playing costs minutes instead of adding them. No real money, no ads, no account needed, and
nothing leaves the phone except optional Google Drive backup and a Ko-fi supporter check.

**Who uses it:** adults, 18+ (because of the casino theme), who doomscroll and want something
stricter and more fun than Digital Wellbeing. Languages: English, Hungarian, German.

**What people do most, in order:**
1. Home: see time left today (big dot-matrix clock) and the per-app limits.
2. Hit a limit → block screen → "take a breath" wait, or play for more time.
3. Tables: roulette, blackjack, slots, poker, coin flip, plinko, crash, baccarat, keno, dice.
4. Set limits: per app, or per category (Social, Video, Games, News, Shopping) with a shared or per-app budget.
5. Focus sessions, schedules (work hours, sleep), and Strict mode, which can't be turned off until it ends.
6. Website filter: blocks adult and gambling sites with a DNS-only local VPN; lock for 1/7/30 days or "No Nut November".
7. Profile: hours given back, weekly streak, 56 milestone badges, the Ko-fi Supporter badge (badge and gold ring only; everything is free).

**What annoys the owner now** (owner: fill in or correct this list before the review):
- The Play Store art and some screens look too "vibe-coded" or generic; it should look premium.
- (add your own: screens that feel cramped, confusing, slow, ugly…)

**Hard rules — don't break these:**
- The app must stay completely free. Supporters get only the badge and the gold photo ring.
- Blocking must never be weakened: Strict mode, locks and Focus can't be bypassed from the UI.
- Game outcomes are decided natively (`core/Dealer.kt`, SecureRandom); `js/dealer.js` is only the browser-demo twin. Don't move odds into the UI.
- Every UI string must also exist in Hungarian and German (`js/lang-hu.js`, `js/lang-de.js`); the language audit fails otherwise.
- No real-money gambling, ever.

## 2. How to run it

**Stack:** native Android (Kotlin) shell + a WebView UI in plain HTML/CSS/JavaScript (no framework).
- Native: `app/src/main/java/com/ante/app/` (blocking via AccessibilityService, VPN website filter, Google sign-in, Drive backup, widget, Quick Settings tile). Pure, testable logic is in `core/`.
- UI: `app/src/main/assets/web/` (`index.html`, `app.css`, `features.css`, `js/*.js`). It talks to native through `window.Ante` (`js/bridge.js`). In a normal browser, `bridge.js` runs a full mock, so **the whole UI works by just opening `index.html`**, e.g. `index.html?acc=1` (flags: `acc=1` blocking on, `reset=1` fresh demo data, `onboard=1` onboarding, `mode=block&pkg=com.instagram.android` the block screen, `supporter=1` a Ko-fi supporter).
- Supporter server: `server/kofi-supporters/` (Cloudflare Worker).

**Versions:** AGP 8.10.1, Kotlin 2.0.21, JDK 17, compileSdk/targetSdk 36, minSdk 26, Node 20, Playwright (Chromium).

**Build and test** (the same steps CI runs, `.github/workflows/build.yml`):
```
./gradlew testDebugUnitTest          # Kotlin unit tests (about 150)
./gradlew assembleDebug              # the APK
node --test web-tests/games.test.js web-tests/dealer.test.js web-tests/worker.test.mjs
node web-tests/e2e.js build/e2e      # full UI flow test in Chromium, with screenshots
node web-tests/stress.js build/stress  # extreme data, every screen, widths, themes, fonts
node web-tests/lang.js build/lang    # EN/HU/DE: nothing wraps, gets cut off or stays English
```
All of these pass on the current version. A UI change isn't finished until e2e, stress and lang pass.

**Store images:** `node scripts/store-play.js` makes them again from the live UI.

## 3. How to work

Please work in steps, as you proposed:
1. Audit first and send a ranked list of problems. No code changes yet.
2. Propose a visual direction (2–3 options with a mock-up each) and let the owner choose.
3. Rework screen by screen. After each screen, show before/after screenshots at 390 px width in all three languages, and run the tests.

The current look: dark "Neutral" theme by default, Geist font, dot-matrix clock fonts, rounded cards, a pill-shaped bottom navbar that hides on scroll. Catppuccin themes are optional.

## 4. Version control

The project is in git. The original stays safe on GitHub branch `backup-2026-11-03`; this zip is a copy of it. Commit every step separately, with a clear message, so each change can be reviewed and undone.
