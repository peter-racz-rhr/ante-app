/* Languages. The UI is written in English; this layer translates what's on screen as it appears
   (renders, sheets, toasts, countdowns), using exact phrases first, then patterns for sentences
   with names and times in them. Each language is its own file (js/lang-*.js) registering in
   window.AnteLang. Legal texts stay in English. */
(function () {
  "use strict";
  const App = window.App, L = window.AnteLang || {};
  let pack = null; // the active language, or null for English

  function translate(s) {
    if (!pack) return s;
    if (pack.dict[s]) return pack.dict[s];
    for (const [re, fn] of pack.patterns) { const m = re.exec(s); if (m) { const r = fn(...m); if (r) return r; } }
    // Several sentences in one place (round results): translate each on its own.
    const parts = s.split(/(?<=[.!?])\s+(?=[A-Z0-9+])/);
    if (parts.length > 1) {
      const out = parts.map(translate);
      if (out.some((p, i) => p !== parts[i])) return out.join(" ");
    }
    return s;
  }

  /* ---------- applying it to the page ---------- */
  const ATTRS = ["aria-label", "placeholder", "title"];
  let lang = "en";
  const SKIP = "svg,style,script,.dotnum,.dotclock,.legal-body,.no-tr,input,textarea";
  function fixText(node) {
    const raw = node.nodeValue, t = raw.trim();
    if (!t || !/[A-Za-z]/.test(t) || (node.parentElement && node.parentElement.closest(SKIP))) return;
    const out = translate(t.replace(/\s+/g, " "));
    if (out !== t) node.nodeValue = raw.replace(t, out);
  }
  function fixEl(el) {
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const o = translate(v); if (o !== v) el.setAttribute(a, o); } }
  }
  function walk(root) {
    if (!pack || !root) return;
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest(".legal-body, .no-tr")) return;
    fixEl(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.nodeType === 3) fixText(n); else fixEl(n); }
  }
  const observer = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === "characterData") fixText(m.target);
      else if (m.type === "attributes") fixEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  });

  App.LANGS = Object.assign({ auto: "Phone language", en: "English" }, ...Object.entries(L).map(([id, p]) => ({ [id]: p.name })));
  App.lang = () => lang;
  /** Locale for dates and weekdays: the phone's own when it speaks the app's language, else the app's. */
  App.locale = () => { const nav = navigator.language || "en"; return nav.toLowerCase().startsWith(lang) ? nav : lang; };
  App.setLang = choice => {
    const pick = App.LANGS[choice] ? choice : "auto";
    const phone = (navigator.language || "en").toLowerCase().slice(0, 2);
    lang = pick === "auto" ? (L[phone] ? phone : "en") : pick;
    pack = L[lang] || null;
    document.documentElement.lang = lang;
    observer.disconnect();
    if (pack) {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      walk(document.body);
    }
  };
  App.langPicker = () => {
    const cur = App.P.get().lang || "auto";
    return `<div class="lang-grid" role="radiogroup" aria-label="Language">${Object.entries(App.LANGS).map(([id, name]) =>
      `<button role="radio" class="chip" data-a="lang" data-v="${id}" aria-pressed="${cur === id}" aria-checked="${cur === id}">${name}</button>`).join("")}</div>`;
  };
  App.act.lang = d => { if (!App.LANGS[d.v]) return; App.P.set({ lang: d.v }); App.setLang(d.v); App.render(); if (App.milestone) App.milestone("lang"); };
  App.t = translate; // for text set from code that the observer can't see (none so far)
  App.setLang(App.P.get().lang || "auto");
})();
