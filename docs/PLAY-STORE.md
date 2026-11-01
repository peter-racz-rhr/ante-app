# Putting Ante on Google Play, and setting up Ante Supporter

Do these in order. Steps marked **you** need your Google account or your money; everything in the
code is already done.

## 1. Developer account (you, once)

1. Go to <https://play.google.com/console/signup> and pick **Personal** (just you).
2. Pay the one-time **$25** fee, then verify your identity with an ID card. This takes 1 to 3 days.
3. Verify a phone number. The Console also asks for an address: use the one in the imprint
   (Kálti Márk u. 2/B, 1035 Budapest).

## 2. A release key (you, once, and never lose it)

Play needs every update signed with the same key. In Android Studio choose **Build → Generate
Signed App Bundle or APK → Android App Bundle → Create new…** and save the `.jks` file
**outside the project**, for example `~/keys/ante-release.jks`. Then create `keystore.properties`
in the project folder (it is git-ignored):

```
storeFile=/Users/you/keys/ante-release.jks
storePassword=…
keyAlias=ante
keyPassword=…
```

Back up the `.jks` file and both passwords (a password manager plus a USB stick). Play App Signing
(the default) keeps Google's copy of the *app* key, but losing *your* upload key still means
asking Google support to reset it.

## 3. Create the app in the Console

**Create app** → name *Ante*, default language English (United States), **App**, **Free**. Tick
both declarations.

Then work through **Dashboard → Set up your app**:

| Section | What to enter |
|---|---|
| Privacy policy | The privacy page has to be at a public URL. The easiest option is GitHub Pages: run `node scripts/export-legal.js`, publish `docs/legal/` with Pages, and paste the privacy link. |
| App access | "All functionality is available without special access". |
| Ads | **No**, the app contains no ads. |
| Content rating | Fill in the questionnaire honestly. Under **Gambling**, say there is **simulated gambling** and **no real money**. Expect a 12+ or 16+ rating (PEGI 12 / Teen). |
| Target audience | **18 and over** is the safest choice with simulated gambling. 13+ is possible but brings more review. |
| News app | No. |
| Data safety | See section 6 below. |
| Government app | No. |
| Financial features | None. |
| Health | No. |

## 4. The accessibility permission (the big review risk)

Play restricts `AccessibilityService` to apps that really need it. Ante does: it has to see which
app is in front to block it. In **Policy → App content → Accessibility API**:

- Say Ante is a **digital-wellbeing / parental-control style** tool that blocks apps the user
  chose, and that it **does not read screen content** (`canRetrieveWindowContent=false`).
- Upload a short screen recording (30 to 60 s) that shows the disclosure sheet in Ante ("Before you
  switch it on"), turning the switch on in Settings, and an app being blocked.
- Point out that Ante shows a **prominent disclosure before** sending the user to Settings, which
  Play requires.

If review still says no, the fallback is a UsageStats mode (weaker, but no accessibility). Ask me
to build it.

## 5. Closed testing first (required for new personal accounts)

New personal developer accounts must run a **closed test with at least 12 testers for at least
14 days in a row** before they can publish to production.

1. **Testing → Closed testing → Create track** (call it *Friends*).
2. Add testers by email (a Google Group is easiest) and share the opt-in link.
3. Upload the bundle: Android Studio → **Build → Generate Signed App Bundle** (release), then
   upload `app/release/app-release.aab`. Raise `versionCode` in `app/build.gradle.kts` for every
   upload.
4. Keep 12 or more people opted in for 14 days, and ask them to open Ante a few times. After that,
   **Apply for production** appears on the dashboard. You answer a few questions about the test.

## 6. Data safety form

Ante collects almost nothing, and nothing leaves the phone except the update check and the Google
sign-in. Answer:

- **Does your app collect or share user data?** Yes, because Google sign-in reads a name, email and
  photo.
- **Personal info → Name, Email address**: *collected*, **not shared**, processed **on the device
  only** (ephemeral: no), **optional**, purpose *App functionality / Account management*.
- **Photos**: collected (profile picture), not shared, optional, *App functionality*.
- **App activity → App interactions**: collected (which limited app was opened, for blocking),
  stays on the phone, *App functionality*.
- **Purchase history**: collected by Google Play for Ante Supporter, *App functionality*.
- **Is data encrypted in transit?** Yes (HTTPS).
- **Can users request deletion?** Yes: uninstalling deletes everything, and Settings → Sign out
  removes the account.

## 7. Ante Supporter and tips (Play Billing)

The code is done: `Supporter.kt` (native) and `js/supporter.js` (UI). You create the products:

1. Upload any build that contains the billing library (0.6.0 or newer) to the closed test first.
   Play only allows products once it has seen the billing permission.
2. **Monetize → Products → In-app products → Create product**, four times. The **Product IDs must
   match exactly**:

   | Product ID | Name | Suggested price | Type |
   |---|---|---|---|
   | `ante_supporter` | Ante Supporter | €4.99 | one-time (Ante acknowledges it) |
   | `ante_tip_small` | Coffee tip | €1.99 | one-time (Ante consumes it, so it can be bought again) |
   | `ante_tip_medium` | Lunch tip | €4.99 | same |
   | `ante_tip_large` | Dinner tip | €9.99 | same |

   Activate each one. Play converts prices into every country's currency.
3. **Payments profile**: Console → **Settings → Payments profile** → add your bank account for
   payouts. Google keeps 15% of the first $1M a year (you must enrol in the 15% service fee tier;
   it is on by default for new accounts).
4. **Test without paying**: Console → **Settings → License testing** → add your own Gmail. Install
   Ante from the closed-test link, and the purchase sheet then says "Test card, always approves".
5. Taxes: Google handles VAT for buyers in the EU. You still declare the payouts as income in
   Hungary (as an individual, or through an *egyéni vállalkozó*). Ask an accountant once.

What a Supporter gets: the Frappé and Macchiato flavours, four clock fonts (Workbench, Sixtyfour,
Silkscreen, Pixelify), four table felts, three card backs and a badge. Debug builds (Android Studio
**Run**) unlock all of it, so you can always test.

Prices show in the app automatically once the products are active. Before that, the Supporter row
says "Purchases work once Ante is installed from Google Play".

## 8. Store listing

**Grow → Store presence → Main store listing**:

- **App name:** Ante: Screen Time Blocker
- **Short description (80):** Block apps by the minute, then bet your screen time. The house usually wins.
- **Full description:** start with the hook, then the features: daily limits per app, the block
  screen, Focus and schedules, timed Strict mode, the tables (no real money; the house edge means
  you play your scrolling away), the widget, privacy (no ads, no tracking, nothing leaves your
  phone), and Supporter looks.
- **App icon:** 512×512 PNG, in `docs/store/icon-512.png` (made from `docs/brand/ante-logo.svg`).
- **Feature graphic:** 1024×500, in `docs/store/feature-graphic.png`.
- **Phone screenshots:** the five in `docs/store/` (1080×1920).
- **Category:** Productivity. **Tags:** Digital wellbeing, Focus, Productivity.
- **Contact email:** peter.racz.rhr@gmail.com.

## 9. Every update after launch

1. Raise `versionCode` (and `versionName`) in `app/build.gradle.kts`.
2. Build a signed bundle and upload it to the track (closed, then production).
3. UI-only changes still reach phones through the signed over-the-air update from `main`. Play
   allows this because the update only changes the interface, not the native code. Keep it that
   way: anything that changes how Ante blocks goes through Play.
