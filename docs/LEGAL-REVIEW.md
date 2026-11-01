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
- **Digital Services Act:** there is no user content, so only the contact point (the imprint) applies.
- **European Accessibility Act:** microenterprises providing services are exempt; Ante still has screen-reader labels.
- **The EU online dispute platform** closed on 20 July 2025, so no ODR link is needed.

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
5. **Lawyer review** of the three texts, once.
