# Putting Ante on Google Play, Ko-fi supporters and the website filter

Do these in order. Steps marked **you** need your Google account or your money; everything in the
code is already done.

## 1. Developer account (you, once)

1. Go to <https://play.google.com/console/signup> and pick **Personal** (just you).
2. Pay the one-time **$25** fee, then verify your identity with an ID card. This takes 1 to 3 days.
3. Verify a phone number. The Console also asks for an address: use the one in the imprint
   (Kálti Márk u. 2/B, 1183 Budapest).

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
| Content rating | Fill in the questionnaire honestly. Under **Gambling**, say there is **simulated gambling** and **no real money**. Since 2020 PEGI rates simulated gambling **PEGI 18**, so expect 18+. |
| Target audience | **18 and over**, matching the Terms and the "I'm 18 or older" step in onboarding. |
| News app | No. |
| Data safety | See section 6 below. |
| Government app | No. |
| Financial features | None. |
| Health | No. |

## 4. The accessibility permission (the big review risk)

**The specific rule:** Play's Accessibility policy says the API may not be used to *prevent users
from disabling or uninstalling any app or service*; only parental-control apps set up by a parent
and enterprise tools are exempt. So the **release** build (the one you upload to Play) never keeps
the uninstall screen covered: in Strict mode it opens after the same 30-second wait as Settings.
The **debug** build you install from Android Studio keeps the hard lock. This is the
`HARD_STRICT` switch in `app/build.gradle.kts`; don't turn it on for release.

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
- **Website filter**: site names are checked on the phone and never stored or sent, so nothing is
  *collected* (Play counts on-device processing as not collected).
- **Ko-fi supporter check**: a SHA-256 fingerprint of the email goes to your Cloudflare Worker.
  Declare *Personal info → Email address* as **collected** (hashed), purpose *App functionality*.
- **Is data encrypted in transit?** Yes (HTTPS).
- **Can users request deletion?** Yes: uninstalling deletes everything, and Settings → Sign out
  removes the account.

## 7. Ante Supporter (Ko-fi donations)

There is no Play Billing any more, and nothing in Ante is locked: every feature and every look is
free for everyone. Anyone who donates on Ko-fi, any amount, even once, with the same email as
their Google sign-in becomes an Ante Supporter and gets only the Supporter badge and a gold ring
round their profile picture.

Set-up: `server/kofi-supporters/README.md` (a free Cloudflare Worker, about 10 minutes). Then put
the Worker address in `app/src/main/res/values/supporter.xml` → `supporter_server` and your Ko-fi
page in `kofi_url`.

Play policy: donations that unlock no features are allowed outside Play Billing, as long as the
listing doesn't promise paid features. A badge as a thank-you is fine; keep it that way.

## 7a. Website filter (VpnService declaration)

The website filter is a local VPN that only carries DNS lookups (`WebFilterService.kt`). Play asks
every app that uses `VpnService` to fill in the **VPN declaration** (Policy → App content →
VpnService): core purpose *content filtering / parental-control style blocking*, data stays on
the device, no traffic is sent to a remote server, no ads. Say it is user-started and that the
system VPN key icon shows while it runs. The adult/gambling lists are built with
`node scripts/build-blocklist.js` (MIT-licensed sources, credited in the app).

## 7b. Google Drive backup (you, once)

Backup uses your existing Google Cloud project, the one with the sign-in client:

1. **APIs & Services → Library → Google Drive API → Enable.**
2. **Google Auth Platform → Data Access → Add or remove scopes**, then add
   `https://www.googleapis.com/auth/drive.appdata`. It is a *non-sensitive* scope, so it needs no
   security review.
3. **Clients:** Drive access needs an **Android** OAuth client with package `com.ante.app` and the
   SHA-1 of every key that signs the app: your debug key (Android Studio → Gradle → signingReport)
   and, after upload, the **App signing key** SHA-1 from Play Console → Test and release → App integrity.
   Make one Android client per SHA-1.
4. While the consent screen is in **Testing**, only the test users you list can back up. Add your
   Gmail, or press **Publish app** (non-sensitive scopes only need the brand details).
5. Link the deletion page (`docs/legal/delete-data.md`, published) in Data safety → Data deletion.

How it behaves: the backup is one file in a hidden folder of the user's own Drive that only Ante
can read. Restoring merges into the phone and can't be used to cheat: it never gives back time
already used today, never ends a Strict lock or Focus, and never removes a schedule.

## 7c. Your public contact details (Digital Services Act)

If you ever sell anything in Ante (or Play treats Ko-fi unlocks as sales) you are a *trader*, and Play Console asks for your trader details
(Policy → App content → Trader status). Google then shows your **name, address, email and phone
on the store listing** in the EU. If you don't want your home address public, use a business
address or a mail-forwarding address, and use the same one in the Imprint.

## 8. Store listing

**Grow → Store presence → Main store listing**:

- **App name:** Ante: Screen Time Blocker
- **Short description (80):** Block apps by the minute, then bet your screen time. The house usually wins.
- **Full description:** say plainly how Ante uses the Accessibility API ("Ante uses Android's
  Accessibility service only to see which app is in front, so it can cover apps that are over the
  limit you set. It never reads your screen."); Play requires this. Then the hook and the features: daily limits per app, the block
  screen, Focus and schedules, timed Strict mode, the tables (no real money; the house edge means
  you play your scrolling away), the widget, privacy (no ads, no tracking, nothing leaves your
  phone), and a Supporter badge for Ko-fi donors.
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
