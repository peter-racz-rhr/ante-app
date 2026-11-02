/* Ante's legal documents, shown in the app (Profile → Legal) and exported to docs/legal/.
   Drafts written from how the app actually works. Have them reviewed by a lawyer before publishing. */
(function () {
  "use strict";
  const OWNER = "Péter Rácz";
  const ADDRESS = "Kálti Márk u. 2/B, 1183 Budapest, Hungary";
  const EMAIL = "peter.racz.rhr@gmail.com";
  const PHONE = "+36 50 104 5007";
  const UPDATED = "2 November 2026";
  // Fill these in if you register as a sole trader (egyéni vállalkozó), e.g. before selling anything.
  const TAX_NUMBER = "";
  const REGISTRATION = "";

  const DOCS = {
    credits: {
      title: "Credits",
      intro: "Ante is built by one person with the help of free, open work by others. Thank you.",
      sections: [
        ["Fonts", "Geist (interface) by Vercel. Clock fonts: Bitcount by Petr van Blokland, Doto by Óliver Lalan, DotGothic16 by Fontworks, Handjet by Rosetta, Workbench and Sixtyfour by Jens Kutilek, Silkscreen by Jason Kottke, Pixelify Sans by Stefie Justprince, VT323 by Peter Hull. All under the SIL Open Font License 1.1."],
        ["Colours", "The Latte, Frappé, Macchiato and Mocha themes use the Catppuccin palettes (MIT licence)."],
        ["Website lists", "The adult and gambling site lists come from The Block List Project (github.com/blocklistproject/Lists) and Steven Black's hosts (github.com/StevenBlack/hosts), both under the MIT licence."],
        ["Icons", "Line icons drawn for Ante; the settings cog follows Lucide's \"settings\" icon (ISC licence)."],
        ["Design tools", "Animated product scenes follow the Stageshow guidelines by Benji Taylor (MIT licence). Also used: ECC (Everything Claude Code) and Matt Pocock's skills for planning and reviews."],
        ["Built with", "Android, Kotlin, Credential Manager and a WebView; tested with Playwright; written together with Claude."],
      ],
    },
    imprint: {
      title: "Imprint",
      intro: "Information about the provider of Ante, as required for online services in Hungary and the EU.",
      sections: [
        ["Provider", `Ante is made and run by ${OWNER}, a private individual.`],
        ["Address", ADDRESS],
        ["Contact", `Email: ${EMAIL}<br>Phone: ${PHONE}`],
        ["Responsible for content", OWNER],
        ["Business details", TAX_NUMBER ? `Tax number: ${TAX_NUMBER}. ${REGISTRATION}` : "Ante is free, and nothing in it is for sale. Ko-fi donations are voluntary gifts to the developer. If that changes, the registration and tax number will be shown here first."],
        ["Consumer complaints", `Write to ${EMAIL} and you get an answer within 30 days. If we can't agree, you can turn to the conciliation board for the provider's seat, the Budapesti Békéltető Testület (Budapest Conciliation Board, 1016 Budapest, Krisztina krt. 99., 1st floor, room 111; bekeltet.bkik.hu), or to the board where you live; the procedure is free. You can also turn to the consumer protection authority. The provider cooperates with the conciliation board's procedure.`],
      ],
    },
    terms: {
      title: "Terms of Service",
      intro: `These terms apply when you use the Ante app and its web demo. Last updated ${UPDATED}. You accept them by tapping "I'm 18 or older and agree" when you first open Ante.`,
      sections: [
        ["1. What Ante is", "Ante is a screen-time tool. You set daily time limits for apps on your phone. When a limit is used up, Ante covers that app. The tables (roulette, blackjack, slots, poker and coin flip) let you stake minutes of that time budget."],
        ["2. No real money, no prizes", "Ante is not a gambling service. You cannot pay money into the tables, and you cannot win money, goods or anything else of value. Minutes won or lost only change the time limits you set yourself, and they reset every day. Every table returns a little less than it takes on average. That is a design choice so that playing costs minutes rather than adding them; it is not a promise that your screen time goes down."],
        ["3. Who can use it", "You need to be at least 18 years old, because the tables simulate casino games. If gambling-style games are a problem for you, or might become one, please don't use the tables. If gambling, even with time, starts to feel like a problem, talk to your doctor or a support service near you."],
        ["4. Your phone and its settings", "Blocking needs Android's accessibility permission, which you can turn on and off in Settings at any time. Ante never covers your phone app, your messages app or emergency calls, whatever your limits say. Ante can't guarantee that every app is blocked in every situation, for example web versions of apps or picture-in-picture video. Strict mode puts a 30-second wait in front of Settings, the Play Store and uninstalling. A timed Strict lock that you start yourself can't be switched off early in the app; it ends by itself at the time you chose. In the version from Google Play you can always uninstall Ante after the wait; versions installed outside Google Play keep the uninstall screen covered until the lock ends. It is friction you agreed to, not a guarantee: Android can always be started in safe mode. The website filter blocks sites by name and can't catch everything: browsers with their own Secure DNS, another VPN or Private DNS set to a provider name can go around it."],
        ["5. Your account and your data", "Signing in with Google is optional. It puts your name and email on this phone, and lets you back up your data to your own Google Drive and restore it on another phone. You can sign out, download your data or delete all of it at any time in Settings → Your data. Deleting waits until a Strict lock or Focus that you started has ended."],
        ["6. Ante Supporter (Ko-fi donations)", "Ante is free. You can donate any amount on Ko-fi (ko-fi.com), once or more often. A donation is a voluntary gift to the developer: Ko-fi and its payment providers handle the payment, refunds and receipts under their own terms. As a thank-you, a donation made with the same email as your Google sign-in in Ante makes you an Ante Supporter: you get the Supporter badge, a gold ring round your profile picture and the extra looks (themes, clock fonts, table felts and card backs). Supporter never unlocks blocking features, minutes or better odds, and everything needed to manage your screen time stays free. Supporter status is a thank-you, not a purchase; it stays as long as Ante's supporter check is running, and is checked again about once a week."],
        ["7. Use at your own risk", "Ante's features are provided \"as is\". To the extent the law allows, the provider is not liable for damage caused by using or not being able to use Ante, for example a missed message because an app was covered. Liability for intent and gross negligence, and for harm to life, body or health, is not excluded."],
        ["8. Changes", "These terms may change when the app changes. The date at the top shows the latest version. If a change matters to you, Ante shows it before it applies and asks you to accept the new terms. If you don't, you can stop using Ante and delete your data in Settings → Your data."],
        ["9. Law and contact", `Hungarian law applies. Questions: ${EMAIL}.`],
      ],
    },
    privacy: {
      title: "Privacy Policy",
      intro: `How Ante handles your data. Last updated ${UPDATED}. In short: everything stays on your phone, including the website filter. The only server is a small one that checks Ko-fi donations, and it never sees your email address.`,
      sections: [
        ["Who is responsible", `${OWNER}, ${ADDRESS}. Email: ${EMAIL}, phone: ${PHONE}.`],
        ["What stays on your phone", "Your limits, the time left and used per app, your daily history (about six months), your table results, your settings, your theme and, if you add one, your profile picture (a small copy made from the photo you pick). This is stored on your device. It only leaves it if you back it up to your own Google Drive (see below). Legal basis: providing the app you asked for (GDPR Art. 6(1)(b))."],
        ["App updates", "Ante checks the project's public GitHub page (github.com) for a newer version of its screens, at most every ten minutes while you use it, and downloads it if there is one. These requests carry no personal data, but GitHub, like any website, sees your IP address and keeps standard logs under its own privacy policy (docs.github.com/site-policy/privacy-policies). Legal basis: legitimate interest in keeping the app up to date and secure (GDPR Art. 6(1)(f)). Each update is signed, and Ante refuses anything that isn't."],
        ["Which app is in front", "With the accessibility permission on, Android tells Ante the name of the app that comes to the front, so Ante can cover apps that are over their limit. Ante does not read what is on your screen, what you type or your notifications. The app names are used on the phone and not stored beyond your usage totals. Which apps you use, and for how long, can say a lot about you (a dating, health or religious app, for example), which is why this history stays on your phone and, if you choose, in your own Drive."],
        ["Google sign-in (optional)", "If you sign in with Google, Google shows its own sign-in screen and gives Ante your name, email address and account picture. Ante downloads the picture once from Google's image server and saves a small copy, with your name and email, on your phone. Google processes this sign-in under its own privacy policy (policies.google.com/privacy). Ante does not keep the Google sign-in token. Legal basis: your consent (GDPR Art. 6(1)(a)), which you can withdraw by signing out."],
        ["The app list", "To let you pick apps, Ante reads the list of apps installed on your phone and their icons. This list stays on the phone."],
        ["Website filter (optional)", "If you turn on the website filter, Android asks you once to allow Ante's VPN. It carries only DNS lookups: the names of the sites that apps and browsers on your phone want to reach. Ante checks each name on the phone against lists that come with the app (adult sites, gambling sites and the sites you add). Blocked names get a \"no such site\" answer; all other lookups go on to your network's usual DNS server, as they would without Ante. Ante does not store, log or send which sites you visit, and no other traffic goes through it. Legal basis: providing the feature you turned on (GDPR Art. 6(1)(b))."],
        ["Web demo", "The web demo runs in your browser with sample data and stores its state in your browser's local storage. Wherever it is hosted, the website host may keep standard server logs, such as IP addresses, under its own privacy policy."],
        ["Google Drive backup (optional)", "If you turn on backup or tap Back up, Ante asks Google for access to a private app folder in your own Google Drive (the drive.appdata permission: Ante can't see any of your other files). It saves one file there with your limits, schedules, history, table results and settings. The file goes straight from your phone to Google and never passes through a server of Ante's. Legal basis: your consent (GDPR Art. 6(1)(a)). Delete my data removes it, and you can remove Ante's access in your Google account under Security → Third-party connections."],
        ["Ko-fi donations and the Supporter check (optional)", "If you donate on Ko-fi, Ko-fi sends Ante's small supporter server (run on Cloudflare Workers) a notice of the donation. The server keeps only a one-way fingerprint (SHA-256) of the email address you used, the date of your first and latest donation, how many you made and their total. It does not keep your name, your email address, your message or any payment details. When you tap \"I donated, check\" (and about once a week after that), Ante sends the same fingerprint of your Google sign-in email to the server, which only answers yes or no. Legal basis: legitimate interest in thanking supporters (GDPR Art. 6(1)(f)). To have your entry removed, write to the email address above."],
        ["Ko-fi", "The Ko-fi link opens ko-fi.com in your browser. Anything you do there is handled by Ko-fi under its own privacy policy (ko-fi.com/home/privacy)."],
        ["Transfers outside the EU", "Google (sign-in, Drive backup), GitHub (updates) and Cloudflare (the supporter check) are US companies. Data that reaches them is transferred under the EU–US Data Privacy Framework, which all three are certified under, and their standard contractual clauses."],
        ["How long", "On-device data stays until you delete it in Settings → Your data, uninstall Ante or clear its data in Android settings. A Drive backup stays until you delete it. Daily history is limited to about six months. Signing out deletes your name and email right away."],
        ["Your rights", `Under the GDPR you have the right to access, correct and delete your data, to restrict or object to processing, to data portability and to withdraw consent. You can do most of this yourself in Settings → Your data: Download my data (access and portability) and Delete my data (erasure). For anything else write to ${EMAIL}.`],
        ["Complaints", "You can complain to the Hungarian data protection authority: Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH), Falk Miksa utca 9–11, 1055 Budapest, naih.hu."],
        ["Children", "Ante is for adults (18 and over), because the tables simulate casino games."],
        ["Changes", "If this policy changes, the date at the top changes, and important changes are shown in the app."],
      ],
    },
  };

  // Raise when the Terms change in a way users must accept again (shown once in the app).
  const TERMS_VERSION = 3;
  window.AnteLegal = { DOCS, OWNER, EMAIL, PHONE, ADDRESS, UPDATED, TERMS_VERSION, TAX_NUMBER, REGISTRATION, LANG: {} };
  if (typeof module !== "undefined") module.exports = window.AnteLegal;
})();
