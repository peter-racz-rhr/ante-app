# Ante supporter server (Ko-fi → Supporter badge)

A tiny Cloudflare Worker (free plan is plenty). Ko-fi calls it after every donation; the app
asks it whether the signed-in email belongs to a donor. It stores **only a SHA-256 fingerprint**
of each donor's email, the first and last donation time, how many and the total.

## Set it up (about 10 minutes, once)

1. Make a free account at <https://dash.cloudflare.com/sign-up>.
2. On your computer, in this folder:
   ```
   npx wrangler login
   npx wrangler kv namespace create SUPPORTERS
   ```
   Paste the `id` it prints into `wrangler.toml`.
3. Ko-fi → **Settings → API** (More → API on the website) → **Webhooks**. Copy the
   **Verification token**, then:
   ```
   npx wrangler secret put KOFI_TOKEN
   ```
   and paste the token.
   Then the signing key, so the app can trust the answer (the file Claude gave you,
   `supporter-private.jwk`, or one you make with `node scripts/supporter-keys.mjs keygen`):
   ```
   npx wrangler secret put SIGNING_JWK
   ```
   and paste the whole content of the file. Keep the file somewhere safe and never commit it:
   whoever has it can make Supporter codes.
4. Deploy:
   ```
   npx wrangler deploy
   ```
   It prints your address, like `https://ante-supporters.<you>.workers.dev`.
5. On the same Ko-fi page, set the **Webhook URL** to that address plus `/kofi`, e.g.
   `https://ante-supporters.<you>.workers.dev/kofi`, and press **Send test**. (The test uses a
   made-up email, so it adds one harmless fingerprint.)
6. In the app: put the address (without `/kofi`) in `app/src/main/res/values/supporter.xml` →
   `supporter_server`, and your Ko-fi page in `kofi_url`. Build and install.

## How a donor gets the badge

They donate on Ko-fi **with the same email as their Google sign-in in Ante**. In Ante: Profile →
Support Ante → How it works → **I donated, check** (or Settings → Support Ante → **Check**).
Ante also re-checks by itself about once a week.

Someone who used a different email can sign in to Ante with that Google account, or ask you:
you can add them by hand in the Cloudflare dashboard (Workers → KV → SUPPORTERS → add entry,
key = the SHA-256 of their lower-cased email, value = `{"since":1730000000000,"count":1,"total":0}`).

## Supporter codes by hand

If someone donated with an email that isn't their Google sign-in, ask which Google email they use
in Ante and make a code for it:
```
ANTE_SUPPORTER_KEY=/path/to/supporter-private.jwk node scripts/supporter-keys.mjs code their@gmail.com
```
Send them the `ANTE-…` code. In Ante: Settings → Support Ante → Have a Supporter code? A code only
works for the email it was made for, so it can't be shared around.

## Why it can't be faked

The app trusts nothing but a signature made with the private key: the server's answer and the
hand-made codes are both checked on the phone against the public key in
`app/src/main/res/values/supporter.xml`. An old app version, a fake server or a copied answer
doesn't make anyone a Supporter.
