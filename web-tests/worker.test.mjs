// The Ko-fi supporter server: only verified webhooks count, emails are stored as fingerprints.
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../server/kofi-supporters/worker.js";

const kv = () => { const m = new Map(); return { get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); }, m }; };
const env = () => ({ KOFI_TOKEN: "secret-token", SUPPORTERS: kv() });
const hook = (data) => new Request("https://x.dev/kofi", { method: "POST", body: new URLSearchParams({ data: JSON.stringify(data) }) });
const fp = async e => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e.trim().toLowerCase())))].map(b => b.toString(16).padStart(2, "0")).join("");
const ask = async (e, h) => (await worker.fetch(new Request(`https://x.dev/supporter?h=${h}`), e)).json();

test("a verified donation makes that email a supporter", async () => {
  const e = env();
  const r = await worker.fetch(hook({ verification_token: "secret-token", email: "Peter@Example.com ", amount: "3.00", timestamp: "2026-11-02T10:00:00Z", currency: "EUR" }), e);
  assert.equal(r.status, 200);
  const yes = await ask(e, await fp("peter@example.com"));
  assert.equal(yes.supporter, true);
  assert.ok(yes.since > 0);
  assert.equal((await ask(e, await fp("someone@else.com"))).supporter, false);
  assert.ok(![...e.SUPPORTERS.m.values()].some(v => v.includes("@")), "no email is stored");
});

test("a webhook with the wrong token is refused", async () => {
  const e = env();
  const r = await worker.fetch(hook({ verification_token: "guess", email: "a@b.c" }), e);
  assert.equal(r.status, 401);
  assert.equal(e.SUPPORTERS.m.size, 0);
});

test("repeat donations add up; bad fingerprints are rejected", async () => {
  const e = env();
  for (const amount of ["3", "5"]) await worker.fetch(hook({ verification_token: "secret-token", email: "a@b.c", amount, timestamp: "2026-11-02T10:00:00Z" }), e);
  const rec = JSON.parse([...e.SUPPORTERS.m.values()][0]);
  assert.equal(rec.count, 2); assert.equal(rec.total, 8);
  const bad = await worker.fetch(new Request("https://x.dev/supporter?h=nothex"), e);
  assert.equal(bad.status, 400);
});

test("a supporter answer carries a token signed for that fingerprint only", async () => {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const e = Object.assign(env(), { SIGNING_JWK: JSON.stringify(await crypto.subtle.exportKey("jwk", kp.privateKey)) });
  await worker.fetch(hook({ verification_token: "secret-token", email: "fan@gmail.com", amount: "2", timestamp: "2026-11-03T10:00:00Z" }), e);
  const h = await fp("fan@gmail.com"), r = await ask(e, h);
  assert.equal(r.supporter, true);
  const sig = Uint8Array.from(Buffer.from(r.token, "base64url"));
  assert.equal(sig.length, 64);
  const ok = m => crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, kp.publicKey, sig, new TextEncoder().encode("ante-supporter:v1:" + m));
  assert.equal(await ok(h), true);
  assert.equal(await ok(await fp("other@gmail.com")), false);
  assert.equal((await ask(e, await fp("other@gmail.com"))).token, undefined, "no token for non-supporters");
});
