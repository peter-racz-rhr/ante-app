// Ante's supporter server: a Cloudflare Worker with one KV namespace.
//
//   POST /kofi        Ko-fi's webhook. Checks the verification token, then remembers the
//                     donor as a SHA-256 fingerprint of their email (never the email itself).
//   GET  /supporter?h=<64 hex>   Answers {supporter, since, token} for that fingerprint. The token
//                     is an ECDSA P-256 signature over "ante-supporter:v1:<fingerprint>"; the app
//                     checks it with the public key, so only this server (or Péter) can make one.
//
// Secrets and bindings (see README.md): KOFI_TOKEN (Ko-fi → Settings → API → Webhooks →
// Verification token), SIGNING_JWK (the private key from scripts/supporter-keys.mjs keygen) and
// the KV namespace SUPPORTERS.

const HEX64 = /^[0-9a-f]{64}$/;

async function fingerprint(email) {
  const data = new TextEncoder().encode(String(email).trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** The signed token the app checks (base64url of r‖s). */
async function token(env, h) {
  if (!env.SIGNING_JWK) return "";
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.SIGNING_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode("ante-supporter:v1:" + h)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/kofi") {
      // Ko-fi sends application/x-www-form-urlencoded with one field, "data", holding JSON.
      let data;
      try { data = JSON.parse((await request.formData()).get("data")); } catch (e) { return json({ ok: false }, 400); }
      if (!env.KOFI_TOKEN || data.verification_token !== env.KOFI_TOKEN) return json({ ok: false }, 401);
      if (!data.email) return json({ ok: true, skipped: "no email" }); // Ko-fi always sends one; be safe
      const key = await fingerprint(data.email);
      const old = JSON.parse((await env.SUPPORTERS.get(key)) || "null");
      const at = Date.parse(data.timestamp) || Date.now();
      const rec = {
        since: old ? old.since : at,
        last: at,
        count: (old ? old.count : 0) + 1,
        total: Math.round(((old ? old.total : 0) + Number(data.amount || 0)) * 100) / 100,
        currency: data.currency || (old && old.currency) || "",
      };
      await env.SUPPORTERS.put(key, JSON.stringify(rec));
      return json({ ok: true });
    }

    if (request.method === "GET" && url.pathname === "/supporter") {
      const h = (url.searchParams.get("h") || "").toLowerCase();
      if (!HEX64.test(h)) return json({ supporter: false, error: "bad fingerprint" }, 400);
      const rec = JSON.parse((await env.SUPPORTERS.get(h)) || "null");
      return json(rec ? { supporter: true, since: rec.since, token: await token(env, h) } : { supporter: false });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
