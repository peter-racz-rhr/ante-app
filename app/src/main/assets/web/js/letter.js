/* A letter from Péter to every new Supporter: an envelope rises, the wax seal pops, the flap
   opens, the letter slides out and unfolds, and the handwriting appears line by line. It opens
   once on becoming a Supporter (supporter.js) and again from "My letter to you". */
(function () {
  "use strict";
  const App = window.App, esc = App.esc;
  const ic = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  App.ICON.mail = App.ICON.mail || ic('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>');
  App.ICON.key = App.ICON.key || ic('<circle cx="8" cy="15" r="3.5"/><path d="m10.5 12.5 8-8M16 7l2 2M14 9l1.5 1.5"/>');

  /* The letter in Péter's own words (EN), and the same in Hungarian and German. */
  const LETTER = {
    en: { hi: "Hi,", body: ["First of all, thank you soooo muuuuuch for supporting my small app! Your support means a lot to me.",
      "It shows me that it's worth making apps, because right now I'm a 16-year-old developer-ish guy in high school.",
      "I hope you enjoy using my app."], bye: "Best regards, and again a big thanks!!!", sign: "Peter", close: "Close" },
    hu: { hi: "Szia!", body: ["Először is nagyooon köszönööm, hogy támogatod a kis appomat! Nagyon sokat jelent nekem.",
      "Megmutatja, hogy megéri appokat csinálni, mert most egy 16 éves, fejlesztőféle srác vagyok a gimiben.",
      "Remélem, élvezed az appom használatát."], bye: "Üdv, és még egyszer hatalmas köszönet!!!", sign: "Peter", close: "Bezárás" },
    de: { hi: "Hi,", body: ["zuallererst vieeelen, vieeelen Dank, dass du meine kleine App unterstützt! Das bedeutet mir echt viel.",
      "Es zeigt mir, dass es sich lohnt, Apps zu machen, denn gerade bin ich ein 16-jähriger Entwickler-mäßiger Typ auf dem Gymnasium.",
      "Ich hoffe, du hast Spaß mit meiner App."], bye: "Viele Grüße und nochmal ein riesiges Dankeschön!!!", sign: "Peter", close: "Schließen" },
  };

  let open = null;
  /** Plays the letter; [after] runs once it's closed (the Supporter badge moment). */
  App.showLetter = after => {
    if (open) return;
    if (window.__anteNoLetter) { if (after) after(); return; } // automated tests turn it off
    const t = LETTER[App.lang && App.lang()] || LETTER.en;
    const lines = [t.hi, ...t.body, t.bye];
    const el = document.createElement("div");
    el.className = "ltr no-tr"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", t.hi + " " + t.sign);
    el.innerHTML = `<div class="ltr-stage">
        <div class="ltr-env" aria-hidden="true"><i class="ltr-back"></i><i class="ltr-flap"></i><i class="ltr-seal">${App.ICON.heart || ""}</i></div>
        <div class="ltr-paper">
          <div class="ltr-text">${lines.map((l, i) => `<p class="ltr-line${i === 0 ? " hi" : ""}" style="--i:${i}">${esc(l)}</p>`).join("")}
            <p class="ltr-line sign" style="--i:${lines.length}">${esc(t.sign)}</p></div>
          <span class="ltr-stamp" aria-hidden="true">${App.badgeSvg ? App.badgeSvg("supporter", 54) : ""}</span>
        </div>
        <div class="ltr-front" aria-hidden="true"></div>
      </div>
      <button class="btn primary ltr-close" data-ltr="close">${esc(t.close)}</button>`;
    document.body.appendChild(el);
    open = el;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = (cls, ms) => setTimeout(() => el.classList.add(cls), reduced ? 0 : ms);
    requestAnimationFrame(() => el.classList.add("in"));
    step("open", 900);   // seal pops, flap swings up
    step("out", 1550);   // the letter slides out
    step("read", 2350);  // the envelope drops away, the letter unfolds
    setTimeout(() => { if (App.SFX) App.SFX.play("win"); App.haptic("tap"); }, reduced ? 0 : 950);
    setTimeout(() => { const FX = window.AnteFX; if (FX && FX.burst) FX.burst(el.querySelector(".ltr-stage"), { power: 1.1, count: 40 }); }, reduced ? 0 : 2500);
    const close = () => {
      el.classList.add("bye");
      setTimeout(() => { el.remove(); open = null; if (after) after(); }, 300);
    };
    el.addEventListener("click", e => { if (e.target.closest('[data-ltr="close"]')) close(); });
  };
})();
