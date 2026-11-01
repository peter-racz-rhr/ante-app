# Ante: full audit (1 November 2026)

What was tested, what broke, what got fixed, what is still open, and where the app could go
next. Everything below was run against the code in this repository at the time of writing.

## 1. Results at a glance

| Area | Result |
|---|---|
| Kotlin unit tests (time bank, blocking rules, clock, Focus/Strict, updates) | 87 / 87 pass |
| Game-rule tests (payouts, house edge) | 18 / 18 pass |
| End-to-end UI test (every flow, Chromium) | 129 / 129 pass |
| **New stress test** (`web-tests/stress.js`) | **1,649 / 1,649 pass** after fixes (61 failures before) |
| Security review | 0 critical, 3 high, 4 medium, 8 low. All highs fixed or mitigated |
| Real Android build on GitHub (AGP, all tests, APK) | Green on every push to `main` |

## 2. Stress test

`node web-tests/stress.js` loads deliberately absurd data and checks every screen:

- **Widths:** 320, 360, 412 and 480 px (the smallest Android phones up to large ones).
- **Themes:** Neutral (dark), Latte (light), Mocha.
- **Fonts:** all 10 clock fonts on Home and Profile at 320 px.
- **Data:** 20 limited apps with 60-character names: a 60-letter word, "WWWW…", emoji, Arabic,
  and an HTML injection attempt (`<img src=x onerror=…>`); 999:59:59 left on one app; 186 days
  of history with 24 h/day screen time; 50 ledger rows of ±99 h; Focus and a 30-day Strict lock
  running together; an 80-character Google name and a 254-character email; a 40-letter display
  name; stakes of 983 h.
- **Screens:** Home, Screen time, Results, Play, all five games, Profile, Settings, the three
  legal pages, the app picker, the limit editor, the wait sheet, both 3-step explainers, and
  four block screens (lots of time, done for today, Focus, Strict).

It fails on: sideways scrolling, any element sticking out of the screen, text spilling out of a
button or pill, a clock wider than its box, a game screen that needs scrolling, script errors,
and injected markup that renders or runs. It now runs in CI on every push.

**Found and fixed:**
- **Stake value** (`983:20:00`) spilled out of its box in all five games, at every width and in
  every theme. It now shrinks to fit (`data-fit`).
- **Limit times** overran their row with the widest font (Sixtyfour) at 999 h. They now shrink too.
- **Hostile names:** no injection rendered anywhere. Every app label, name, email and toast goes
  through `esc()`, and photos must be `data:image/...;base64` made by the app.

## 3. Security and privacy

**Fixed in this round:**
- **HIGH: Focus and Strict could be escaped by removing a limit.** `removeLimit` wasn't guarded,
  so deleting the app's limit uncovered it during a 30-day lock. It is now refused natively
  (`TimeBank.canRemoveLimits`), in the bridge, the browser mock and the UI. Tested in `ModesTest`.
- **HIGH: release APKs were signed with the debug key**, which anyone can reproduce. Release builds
  now use `keystore.properties` when present (keystores are ignored by git). Debug-key signing is
  only a fallback for personal builds.
- **BUG: a royal flush paid 100×, not the promised 250×.** The native payout cap was below the
  best real payout. The cap is now 250×, with tests.
- **MEDIUM: sign-out race.** The Google photo could be re-saved after you signed out while it was
  still downloading. It is now dropped unless the same account is still signed in.
- **LOW:** Android 12+ data-extraction rules exclude everything from cloud backup and
  device-to-device transfer (`allowBackup=false` already covered older Android). Update and photo
  requests send a plain `Ante` user agent instead of the phone model and Android version.

**Checked and fine:**
- **Google sign-in:** the ID token is never stored or logged, and the page cannot fake a sign-in.
- **Components:** only the launcher activity is exported; the accessibility service is protected
  by `BIND_ACCESSIBILITY_SERVICE` and cannot read screen content (`canRetrieveWindowContent=false`).
- **Device data:** no logging of personal data, no clipboard use, no PendingIntents.
- **WebView:** file and content access are off; it navigates only to its own private origin;
  every other request gets a 403; debugging is on only in debug builds.
- **Bridge inputs are validated:** package names by regex, links by an exact allowlist, colours as
  `#RRGGBB` only. A settle without a matching bet is rejected, and waits are timed natively against
  a tamper-resistant clock.
- **Over-the-air updates:** ECDSA P-256 signature over every field, exact size and SHA-256 checks,
  safe unzip, permanent downgrade protection, automatic fallback after failed starts.

**Still open (known limits, with the suggested fix):**
1. **Game outcomes are decided by the page.** Only a signed UI update could change them, so the
   signing key is the guard. If that key ever leaks, a malicious update could mint minutes up to
   250× a stake. *Fix:* roll outcomes natively, or cap net winnings per day.
2. **GitHub is the trust root for updates.** Protect `main` with required reviews, pin Actions to
   commit SHAs, and move `ANTE_OTA_KEY` into a protected Environment that needs approval.
3. **Clock jump after a reboot.** With auto-time on, a forged future date followed by a reboot is
   trusted, which could end a Strict lock early. *Fix:* cap forward jumps after a reboot, or
   confirm the time over the network.
4. **Strict mode is friction, not a jail.** The accessibility shortcut (volume keys), safe mode and
   force-stop can still turn blocking off, as `docs/BYPASS-AUDIT.md` documents. *Fix:* warn loudly
   when blocking stops during Strict; consider a device-admin option for "Strict+".
5. **Personal data is stored unencrypted.** Name, email and photo are in plain app-private storage:
   safe on a normal phone, readable with root.
6. **Screenshots aren't blocked.** There is no `FLAG_SECURE`, so screenshots and the recents
   thumbnail show the profile. This is on purpose: you need screenshots to report issues.

## 4. Speed

Measured in Chromium with the CPU slowed 4× (similar to a mid-range phone):

| | Before | After |
|---|---|---|
| Start to first clock | 1.33 s | **0.99 s** (no longer waits up to 400 ms for fonts) |
| Fitting big numbers on Home | 13.3 ms | **1.6 ms** (one layout pass instead of one per number) |
| Play tab, repeat visits | 68 ms | **37 ms** (mini roulette wheel drawn once and reused) |
| Idle on Home, 10 s | 5 ms of script, 1 layout | unchanged: the timers are cheap |

**Also fixed:** the Play tab leaked a `ResizeObserver` (and a whole roulette wheel) on every visit.
**Still heaviest:** Home (charts) and Settings (ten font previews) at around 50 ms each on a slow
phone. Fine for screen changes; they don't redraw while idle.

## 5. Updates and platform

- **Target API 36 (Android 16):** Google Play requires it for new apps and updates since
  31 August 2026; Ante targeted 35. Moved to 36 on branch `upgrade/api36` and merged once the real
  Android build passed. That needed the predictive-back migration (`OnBackInvokedCallback`),
  because `onBackPressed` is no longer called at target 36. The Android Gradle Plugin is now
  8.10.1 and Credential Manager 1.6.0 (the current stable release).
- **Play Store review risk: the accessibility permission.** Play restricts the
  AccessibilityService API for apps that aren't accessibility tools. A screen-time app must justify
  it as a digital-wellbeing feature in the Play Console declaration and show a prominent
  disclosure (Ante has one before Settings opens). The fallback, if review refuses it, is
  UsageStatsManager plus an overlay: weaker detection, but no accessibility permission.
- **Play Store review risk: simulated gambling.** No real money is involved and nothing points to
  real casinos, which is the key rule. Expect a higher age rating in the content-rating
  questionnaire.

## 6. Pros

- **A genuinely new idea.** No other blocker lets you *gamble* your screen time. The house edge
  means playing reduces screen time on average, which turns the urge to scroll into a game that
  works against the urge.
- **Hard to cheat for a sideloaded app:** a tamper-resistant clock, native timing of every wait, a
  bypass audit, timed Strict mode that can't be undone, and Focus that refuses to start sessions.
- **Private by design:** no server, no analytics, no ads, and the only network use is signed
  updates.
- **Updates without reinstalling:** UI changes reach phones in minutes, and they're signed.
- **Polished:** one-screen games, 10 clock fonts, Catppuccin themes, haptics, sounds and animated
  explainers.
- **Well tested:** 87 + 18 + 129 + 1,649 automated checks, all running in CI on every push.

## 7. Cons and risks

- **Play Store approval is the biggest risk:** the accessibility permission plus casino games.
- **Android only:** an iPhone version would need Apple's Screen Time API, a completely different
  design.
- **No sync or backup:** a new phone means starting over (by design: no server).
- **Strict mode can still be beaten** by a determined user (safe mode, the accessibility
  shortcut), like every Android blocker without device-owner rights.
- **Gambling theme can backfire:** for some people it could build a habit. An optional "no tables"
  mode would help them.
- **Estimates:** "hours added to your real life" is measured against your current limits, so it
  shifts when you change them.

## 8. Competitors

| App | Approach | What Ante can learn |
|---|---|---|
| ScreenZen (free) | breathing pause, limits, schedules | schedules ("no TikTok 22:00–07:00") |
| one sec | a pause before the app opens | intentions ("why are you opening this?") |
| Opal (paid) | scheduled deep-focus sessions, strict | Focus schedules and streak rewards |
| AppBlock | strict mode, website blocking | blocking websites in the browser |
| Freedom | cross-platform | sync across devices |

Ante's angle stays unique: **betting** minutes, with a visible, honest house edge.

## 9. Ideas, roughly in order of value

1. **Schedules:** automatic Focus on weekdays 9–17, and "sleep mode" at night.
2. **Intentions:** on the block screen, ask "What do you want to do?" and remind you when the time
   is up.
3. **Weekly report:** Sunday summary of hours added, streak, best day and table results.
4. **Website blocking:** cover youtube.com or reddit.com in the browser (accessibility can see the
   browser package; URL detection would need more).
5. **Native game outcomes:** closes security item 1, and makes the house edge provable.
6. **"No tables" switch:** for people who'd rather not gamble at all.
7. **Home-screen widget:** time left today in your clock font.
8. **Optional encrypted backup** to Google Drive (app folder), kept private.
9. **Friends:** share streaks or duel at the tables. Needs a server, so it's a bigger step.
10. **UsageStats fallback mode:** for the Play Store if the accessibility declaration is refused.

## Sources

- Google Play AccessibilityService policy: https://support.google.com/googleplay/android-developer/answer/10964491
- Target API requirements: https://developer.android.com/google/play/requirements/target-sdk
- Credential Manager releases: https://developer.android.com/jetpack/androidx/releases/credentials
- Gambling and simulated gambling policy: https://support.google.com/googleplay/android-developer/answer/9877032
- App blocker landscape (2026 roundups): https://dev.to/astraedus/best-free-app-blockers-for-android-2026-2eo2, https://habi.app/insights/best-screen-time-apps/
