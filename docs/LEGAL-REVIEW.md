# Legal check (EU and Hungary), 1 November 2026

What Ante does to follow the rules, and what is still up to you. This is a careful developer's
check, not legal advice: have a lawyer read the Terms, Privacy Policy and Imprint once before launch.

## Fixed in the app

| Rule | What was missing | Now |
|---|---|---|
| GDPR Art. 17 (right to erasure), Google Play account-deletion policy | No way to delete your data in the app | Settings → Your data → **Delete my data** (phone and Drive backup). A public page explains deletion without the app: `docs/legal/delete-data.md` |
| GDPR Art. 15 and 20 (access, portability) | Only "write an email" | **Download my data** shares everything as a JSON file |
| GDPR Art. 13 (information) | Nothing about backups or transfers outside the EU | Privacy Policy: Drive backup (what, where, legal basis, how to remove), US transfers under the EU–US Data Privacy Framework, legal basis for the core data |
| Consumer Rights Directive 2011/83/EU Art. 16(m), Hungarian Govt. Decree 45/2014 | Buying digital content without the withdrawal notice | The Supporter sheet says you lose the 14-day withdrawal right once the looks unlock; the Terms explain it and keep your warranty rights (Directive 2019/770) |
| Hungarian Consumer Protection Act (Fgytv.) 17/A and 29 § | Imprint said the provider is "not willing" to take part in conciliation, which a trader selling to consumers may not refuse | Complaints within 30 days, the conciliation boards and the consumer authority; the provider cooperates |
| E-commerce Act (Ekertv.) 4 § | Imprint said "non-commercial, no tax number", no longer true once Supporter is sold | Business details now point to the tax number and registration (constants `TAX_NUMBER` and `REGISTRATION` in `js/legal.js`) |
| Honest description | Terms called Strict mode "friction, not a lock you can't undo" | Describes the timed lock as it works now |

## Already fine

- **No gambling licence needed:** you can't pay money into the tables or win anything of value
  (Hungarian Gambling Act, Szjtv. 1 §: a game needs a stake and a prize of value). The Supporter
  purchase never changes odds or gives minutes, and the daily spin is free.
- **Consent age:** the Terms require 16+, which matches Hungary's GDPR consent age. With simulated
  gambling, choose 18+ as the target audience in the Play Console.
- **ePrivacy (cookies and storage):** Ante only stores what the app needs to work, so no consent banner is needed.
- **Accessibility permission:** a clear disclosure is shown before Settings opens (Google Play's prominent-disclosure rule).
- **Digital Services Act:** Ante isn't a hosting service or an online platform (users publish nothing to others), so the DSA's contact-point duties don't strictly apply; the Imprint's contact details do no harm. As a seller on Google Play you still declare trader status (DSA Art. 30), and Google shows your contact details on the listing.
- **European Accessibility Act:** microenterprises providing services are exempt; Ante still has screen-reader labels.
- **The EU online dispute platform** closed on 20 July 2025, so no ODR link is needed.

## Second review (another agent's evaluation, 1 November 2026): what changed

| Point | Done |
|---|---|
| Play's Accessibility rule forbids blocking uninstall | Release (Play) builds open the uninstaller after the 30-second wait; only Android Studio (debug) builds keep the hard lock (`HARD_STRICT`) |
| PEGI 18 for simulated gambling | 18+ everywhere: Terms, Privacy, onboarding ("I'm 18 or older and agree"), Play target audience |
| Phone and emergency apps could be blocked | Never covered or listable: the default dialer and SMS app, the phone and emergency apps, Ante itself (`Exempt.kt`); said in the Terms |
| Legal texts only in English | Terms, Privacy Policy, Imprint and Credits in Hungarian and German (`js/legal-hu.js`, `js/legal-de.js`, exported to `docs/legal/hu`, `docs/legal/de`) |
| Withdrawal waiver on a durable medium | A purchase confirmation (product, price, date, immediate delivery, loss of withdrawal right) appears after buying and can be saved or shared; it stays under Settings → Support Ante → Receipt |
| Name the conciliation board | Budapesti Békéltető Testület, 1016 Budapest, Krisztina krt. 99., 1st floor, room 111, bekeltet.bkik.hu |
| Accepting the Terms | A clear button in onboarding; the version and date are stored on the phone |
| Changing the Terms | Material changes are shown in the app and must be accepted again (`TERMS_VERSION` in `js/legal.js`); otherwise you can delete your data |
| Marketing claim | "playing reduces your screen time" is now described as a design choice, not a promise |
| Privacy details | Legal basis for the update check (legitimate interest), no named web host, a note that app-usage history can be sensitive |
| Postcode | Not changed: fixed to **1183 Budapest**, Kálti Márk u. 2/B. |

## Up to you before Ante Supporter goes on sale

1. **Register as a sole trader** (egyéni vállalkozó, through Ügyfélkapu+) or another form that lets
   you sell digital goods. Then put the tax number in `TAX_NUMBER` in `app/src/main/assets/web/js/legal.js`.
2. **Declare the Google Play payouts** as income. Google collects the VAT from EU buyers; an
   accountant can tell you about your own VAT status (alanyi adómentesség up to the yearly limit).
3. **Publish the privacy policy and the delete-data page** at public URLs (GitHub Pages works) and
   paste them into the Play Console (App content → Privacy policy; Data safety → Data deletion).
4. **Data safety form:** mark name, email, photo, app activity and purchase history as *collected*
   (the Drive backup leaves the phone), *not shared*, *optional* except app activity, purposes
   "App functionality" and "Account management", encrypted in transit, deletable in the app.
5. **Trader details on Google Play** are public in the EU (name, address, phone): decide which address to show.
6. **Ko-fi tips are income too**, even though they unlock nothing.
7. **Keep the over-the-air updates to visual changes**; anything that changes how Ante behaves goes through a Play update.
8. **Lawyer review** of the texts in all three languages, once; then remove the "Draft… not legal advice" lines.
