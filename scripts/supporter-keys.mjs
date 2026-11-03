#!/usr/bin/env node
// Supporter keys and codes (ECDSA P-256). The private key signs, the app only verifies.
//   node scripts/supporter-keys.mjs keygen           → supporter-private.jwk (keep it secret, never commit)
//                                                       and prints the public key for res/values/supporter.xml
//   node scripts/supporter-keys.mjs code someone@gmail.com   → a Supporter code for that Google email
//   node scripts/supporter-keys.mjs public            → prints the public key again
// The same private key goes to the supporter server: npx wrangler secret put SIGNING_JWK (paste the file).
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.ANTE_SUPPORTER_KEY || path.join(ROOT, "supporter-private.jwk");
const ALG = { name: "ECDSA", namedCurve: "P-256" };
const b64url = b => Buffer.from(b).toString("base64url");

async function publicSpki(jwk) {
  const pub = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true };
  const k = await crypto.subtle.importKey("jwk", pub, ALG, true, ["verify"]);
  return Buffer.from(await crypto.subtle.exportKey("spki", k)).toString("base64");
}
export async function sign(jwk, email) {
  const k = await crypto.subtle.importKey("jwk", jwk, ALG, false, ["sign"]);
  const h = Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from(email.trim().toLowerCase()))).toString("hex");
  return b64url(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, Buffer.from("ante-supporter:v1:" + h)));
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "keygen") {
  if (fs.existsSync(KEY)) { console.error(`${KEY} already exists; delete it first if you really want a new key (old codes stop working).`); process.exit(1); }
  const kp = await crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  fs.writeFileSync(KEY, JSON.stringify(jwk), { mode: 0o600 });
  console.log(`Private key: ${KEY} (secret)\nPublic key for supporter.xml:\n${await publicSpki(jwk)}`);
} else if (cmd === "public") {
  console.log(await publicSpki(JSON.parse(fs.readFileSync(KEY, "utf8"))));
} else if (cmd === "code" && arg && arg.includes("@")) {
  console.log("ANTE-" + await sign(JSON.parse(fs.readFileSync(KEY, "utf8")), arg));
} else if (cmd) {
  console.error("Usage: keygen | public | code someone@gmail.com"); process.exit(1);
}
