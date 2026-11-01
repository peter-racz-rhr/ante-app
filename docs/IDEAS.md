# Ante: paywall options and feature ideas (1 November 2026)

**Built since this list was written (0.6.0):** schedules (1), the home-screen widget (28), the
Quick Settings tile (29), the weekly recap (20), the daily free spin (12), the "no tables" switch
(15), native game outcomes (13), Hungarian (36), table skins (17) and Ante Supporter (paywall
model 3 plus tips, see `docs/PLAY-STORE.md`). Everything else below is still open.

## Paywall

### What should stay free
Limits, the block screen, the 30-second wait, one or two tables and the stats. If blocking itself
is paid, the app stops doing its one job for most people, and the reviews say so. Charge for
*more control* and *more fun*, never for the basic protection.

### Models, best fit first

1. **Ante Pro (subscription with a lifetime option).** About €2.99 per month, €19.99 per year,
   €39.99 lifetime. A 7-day free trial that starts the moment someone first hits a Pro feature,
   not on first launch. This is what Opal, one sec and ScreenZen-style apps converge on.
2. **One-time unlock.** A single €9.99 "Pro forever". It is simpler, it builds trust, and it fits
   an app with no server costs. It earns less over time.
3. **Free, with a "Supporter" tier.** Everything works; Supporters get cosmetics only (themes,
   fonts, table skins, a badge). The Ko-fi button already points this way.

**Recommendation:** start with model 1 and keep lifetime visible. People who want to fix a habit
hate subscriptions to fix it, and lifetime converts them.

### What goes behind Pro
- **Strict mode longer than 1 day** (free: 1 day; Pro: up to 31).
- **Focus schedules** (weekdays 9–17, sleep mode at night).
- **Unlimited limited apps** (free: 3 apps).
- **All five tables** (free: coin flip and roulette).
- **All 10 clock fonts and the Catppuccin themes** (free: Neutral plus 2 fonts).
- **Weekly report and the full history** (free: 7 days).
- **Home-screen widget.**

### Paywall moments that don't feel cheap
- Right after a win: "You added 2 h to your real life this week. Keep the streak with Pro."
- When someone picks more than 1 day on the Strict wheel, the extra days show a small lock.
  Scrolling past it opens the paywall.
- **Never** on the block screen. Asking for money at the moment someone is trying not to use
  their phone feels like extortion.

### A twist that fits Ante: commitment stakes
"Bet real money on your habit": pay €5, and you get it back if you stay within your limits all
week. If you don't, it goes to a charity you picked (Ante keeps a small fee). This is what
Beeminder and stickK do. **Warning:** real money plus casino games can become *real gambling* in
Google Play's eyes. Keep stakes refund-only (never pay out more than was paid in), and get legal
advice first.

### How to build it later
- **Google Play Billing** (BillingClient 7+) with a native `isPro()` check in the bridge. Make the
  native side the source of truth, never the WebView, because a page flag is easy to fake.
- **RevenueCat** (free up to $2.5k a month in revenue) handles receipts, trials, lifetime and
  restore without a server.
- An **OTA UI update can't grant Pro**: the native code checks the purchase token, and the UI
  only reads the result.
- Add the "Restore purchases" button, the price in local currency, and the auto-renew wording
  that Play requires.

## Feature ideas

### Blocking and control
1. **Schedules:** automatic Focus by time and weekday, and a sleep mode from 22:00 to 07:00.
2. **Intentions on the block screen:** "What do you want to do?" Ante shows the answer again
   when the time is up.
3. **Website blocking** for youtube.com and reddit.com in Chrome.
4. **App groups:** "Social" shares one budget across TikTok, Instagram and Snapchat.
5. **Open limits:** five opens a day instead of minutes.
6. **Breathing pause:** 5 seconds of breathing before the wait, as an option.
7. **Location Focus:** turns on at the library or the office (geofence, kept on the phone).
8. **Strict+:** device-admin mode, so uninstalling during Strict is blocked.
9. **Emergency unlock:** once a week, typing a long sentence ends Strict early. Sessions after
   that are logged on Profile, so it's honest.
10. **Rollover:** unused minutes carry into tomorrow, up to a cap.

### Games and the time bank
11. **More tables:** Plinko, crash (a rising multiplier, cash out in time), scratch cards,
    Hi-Lo, dice and keno.
12. **Daily free spin:** one free spin a day if you stayed within yesterday's limits.
13. **Provably fair, natively:** outcomes rolled in Kotlin, with the seed shown afterwards.
14. **House-edge meter:** "Lifetime: the house took 4 h 12 min from your scrolling."
15. **"No tables" switch** for people who'd rather not gamble.
16. **Loss limit:** stop betting after losing X today, to keep it healthy.
17. **Table skins:** felt colours, card backs, chip designs (Pro cosmetics).

### Motivation
18. **Streak shields:** one missed day a month that doesn't break the streak.
19. **Achievements:** first week under limits, 100 hours added, a royal flush.
20. **Weekly report card:** Sunday notification with hours added, best day and worst app.
21. **"What you got back":** turn saved hours into things like "3 books" or "12 workouts".
22. **Goals:** "Under 2 h of social a day for 30 days", with a progress ring.
23. **Monthly recap** you can share: a Spotify Wrapped-style story.

### Social (needs a small server)
24. **Friends:** see each other's streaks, without the apps or times.
25. **Duels:** whoever uses less this week wins the other's 30 minutes.
26. **Accountability partner:** a friend has to approve ending Strict early.
27. **Leaderboards** for hours added, among friends only.

### Widgets and the system
28. **Home-screen widget:** time left today in your clock font.
29. **Quick Settings tile:** start Focus with one tap.
30. **Persistent notification** with a live countdown during Focus.
31. **Wear OS tile:** time left on your watch.
32. **Shortcuts:** long-press the icon for "Focus 25 min" or "Focus 1 h".

### Polish
33. **Haptic detents** on the scroll wheel that get stronger at round numbers (1 h, 1 week).
34. **Sound pack:** soft casino sounds versus a minimal set.
35. **Dynamic colour:** a theme that follows Material You wallpaper colours.
36. **Languages:** Hungarian first, then German and Spanish.
37. **Accessibility pass:** TalkBack labels on every game and bigger touch targets.
38. **Tablet layout.**

### Data and trust
39. **Encrypted backup** to the Google Drive app folder, restored after sign-in.
40. **Export** of the history as CSV.
41. **Privacy dashboard:** "Ante has made 3 network requests this week" with a list.
42. **UsageStats fallback mode**, in case Play refuses the accessibility declaration.

### Launch
43. **Landing page** with the stageshow scenes as the hero.
44. **TikTok and Reels clips:** "I gambled my screen time and lost Instagram for a day" fits the
    idea perfectly.
45. **Play Store listing:** 8 screenshots made from the real UI, a 30-second video, and the
    content rating done honestly (simulated gambling).
46. **Closed testing with 12+ testers for 14 days**, which Google requires for new personal
    developer accounts before production.
