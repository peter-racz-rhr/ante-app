#!/usr/bin/env node
// Builds the website filter's domain lists (app/src/main/assets/blocklist/*.bin).
//   node scripts/build-blocklist.js            downloads the lists and writes the files
//   node scripts/build-blocklist.js --hash x   prints the 40-bit hash of a name (to check the Kotlin side)
// Format (read by core/DomainSet.kt): "ANTEBL1\n", varint count, then varint gaps between the
// sorted 40-bit FNV-1a hashes of each domain (lower case, no "www.").
// Sources (MIT licence): The Block List Project (github.com/blocklistproject/Lists) and
// Steven Black's hosts (github.com/StevenBlack/hosts).
"use strict";
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "../app/src/main/assets/blocklist");
const LISTS = {
  adult: [
    "https://raw.githubusercontent.com/blocklistproject/Lists/master/alt-version/porn-nl.txt",
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts",
  ],
  gambling: [
    "https://raw.githubusercontent.com/blocklistproject/Lists/master/alt-version/gambling-nl.txt",
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-only/hosts",
  ],
};
// Never blocked, whatever a list says: big general sites that also host adult corners.
const NEVER = new Set(["google.com", "youtube.com", "reddit.com", "x.com", "twitter.com", "instagram.com", "facebook.com", "imgur.com",
  "tumblr.com", "discord.com", "discord.gg", "telegram.org", "t.me", "whatsapp.com", "wikipedia.org", "github.com", "github.io",
  "cloudflare.com", "amazonaws.com", "googleusercontent.com", "gstatic.com", "akamaihd.net", "blogspot.com", "wordpress.com",
  "medium.com", "pinterest.com", "vimeo.com", "dailymotion.com", "twitch.tv", "patreon.com", "linktr.ee", "apple.com", "microsoft.com"]);

const MASK40 = (1n << 40n) - 1n;
function hash40(s) {
  let h = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s, "utf8")) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return (h >> 24n) & MASK40;
}
const LABEL = /^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/;
function normalize(raw) {
  let s = raw.trim().toLowerCase().replace(/\.+$/, "");
  if (s.startsWith("www.")) s = s.slice(4);
  if (!s || s.length > 253) return null;
  const labels = s.split(".");
  if (labels.length < 2 || labels.some(l => !LABEL.test(l))) return null;
  return s;
}
function names(text) {
  const out = [];
  for (let line of text.split("\n")) {
    line = line.replace(/#.*/, "").trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const host = parts.length > 1 && /^(0\.0\.0\.0|127\.0\.0\.1)$/.test(parts[0]) ? parts[1] : parts[0];
    const n = normalize(host);
    if (n && n !== "localhost" && !n.endsWith(".local")) out.push(n);
  }
  return out;
}
function encode(hashes) {
  const bytes = [...Buffer.from("ANTEBL1\n", "ascii")];
  const varint = v => { while (v >= 0x80n) { bytes.push(Number((v & 0x7fn) | 0x80n)); v >>= 7n; } bytes.push(Number(v)); };
  varint(BigInt(hashes.length));
  let last = 0n;
  for (const h of hashes) { varint(h - last); last = h; }
  return Buffer.from(bytes);
}

async function main() {
  const i = process.argv.indexOf("--hash");
  if (i > 0) { console.log("0x" + hash40(process.argv[i + 1] || "").toString(16)); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const info = {};
  for (const [id, urls] of Object.entries(LISTS)) {
    const set = new Set();
    for (const u of urls) {
      const r = await fetch(u);
      if (!r.ok) throw new Error(`${u}: ${r.status}`);
      const list = names(await r.text());
      if (list.length < 100) throw new Error(`${u}: only ${list.length} names`);
      list.forEach(n => { if (!NEVER.has(n)) set.add(n); });
      console.log(`${id}: ${list.length} from ${u}`);
    }
    const hashes = [...new Set([...set].map(hash40))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const buf = encode(hashes);
    fs.writeFileSync(path.join(OUT, `${id}.bin`), buf);
    info[id] = { domains: set.size, bytes: buf.length };
    console.log(`${id}: ${set.size} domains, ${(buf.length / 1e6).toFixed(2)} MB`);
  }
  fs.writeFileSync(path.join(OUT, "lists.json"), JSON.stringify({ built: new Date().toISOString().slice(0, 10), ...info,
    sources: "The Block List Project and Steven Black's hosts (MIT licence)" }, null, 2) + "\n");
}
main().catch(e => { console.error(e.message); process.exit(1); });
