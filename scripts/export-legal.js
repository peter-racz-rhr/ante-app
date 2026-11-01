// Writes docs/legal/*.md (English) and docs/legal/hu|de/*.md from the in-app texts
// (assets/web/js/legal*.js), so the published pages and the app always match.
// Usage: node scripts/export-legal.js
global.window = {};
const L = require("../app/src/main/assets/web/js/legal.js");
require("../app/src/main/assets/web/js/legal-hu.js");
require("../app/src/main/assets/web/js/legal-de.js");
const fs = require("fs"), path = require("path");
const md = html => html.replace(/<br>/g, "  \n").replace(/<[^>]+>/g, "");
const NOTE = { en: "_Draft prepared from how the app works. Not legal advice: have it reviewed by a lawyer before publishing._",
  hu: "_Az alkalmazás működése alapján készült tervezet. Nem jogi tanács: közzététel előtt nézesse át ügyvéddel._",
  de: "_Entwurf auf Grundlage der Funktionsweise der App. Keine Rechtsberatung: vor der Veröffentlichung anwaltlich prüfen lassen._" };
for (const [lang, docs] of [["en", L.DOCS], ["hu", L.LANG.hu], ["de", L.LANG.de]]) {
  const dir = path.join(__dirname, "../docs/legal", lang === "en" ? "" : lang);
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, d] of Object.entries(docs)) {
    const body = [`# ${d.title}`, "", md(d.intro), "", ...d.sections.flatMap(([h, t]) => [`## ${h}`, "", md(t), ""]), "---", "", NOTE[lang], ""].join("\n");
    fs.writeFileSync(path.join(dir, `${id}.md`), body);
  }
  console.log("wrote", lang);
}
