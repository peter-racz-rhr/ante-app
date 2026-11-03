/* Send feedback: a card on Profile and a sheet with stars, a topic and a message. It opens the email
   app with Péter's address and the message filled in (AnteBridge.sendFeedback), so people see
   exactly what is sent and press Send themselves. Nothing goes through a server. */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;
  const TOPICS = ["Idea", "Something's broken", "I love it", "Other"];
  const MAX = 2000;

  App.feedbackCard = () => `<section class="panel pcard fb-card" aria-labelledby="fb-h">
      <div class="panel-head"><div class="fc-h"><span class="sicon" style="--ic:#60a5fa" aria-hidden="true">${App.ICON.mail || App.ICON.heart}</span><h2 class="h3" id="fb-h">Send feedback</h2></div>
        <button class="btn-sm" data-a="feedback">Write</button></div>
      <p class="muted">Tell Péter what you like, what's broken or what you'd add. He reads every message.</p></section>`;

  App.sheetViews = App.sheetViews || {};
  App.sheetViews.feedback = (sh, sheet, head) => sheet("", `${head("Send feedback", "fb-sh")}
      <p class="muted">How do you like Ante so far?</p>
      <div class="fb-stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button class="fb-star${sh.stars >= n ? " on" : ""}" role="radio" aria-checked="${sh.stars === n}" data-a="fbStar" data-v="${n}" aria-label="${n} of 5">★</button>`).join("")}</div>
      <div class="fb-topics">${TOPICS.map(t => `<button class="chip" data-a="fbTopic" data-v="${esc(t)}" aria-pressed="${sh.topic === t}">${esc(t)}</button>`).join("")}</div>
      <textarea id="fb-text" class="fb-text" rows="6" maxlength="${MAX}" placeholder="Your message to Péter" aria-label="Your message">${esc(sh.text || "")}</textarea>
      <button class="fb-info" role="checkbox" aria-checked="${sh.info !== false}" data-a="fbInfo"><span class="tick" aria-hidden="true">${App.ICON.check}</span><span>Add the app version and phone model</span></button>
      <p class="fine">Your email app opens with this message to Péter. You see everything before you press Send.</p>
      <div class="btn-row"><button class="btn quiet" data-a="closeSheet">Cancel</button><button class="btn primary" data-a="fbSend">Send</button></div>`, "fb-sh");

  const keepText = () => { const el = document.getElementById("fb-text"); if (el && ui.sheet && ui.sheet.type === "feedback") ui.sheet.text = el.value.slice(0, MAX); };
  function compose(sh) {
    const lines = [];
    if (sh.stars) lines.push(`${"★".repeat(sh.stars)}${"☆".repeat(5 - sh.stars)} (${sh.stars}/5)`);
    if (sh.topic) lines.push(sh.topic);
    lines.push("", (sh.text || "").trim());
    if (sh.info !== false) {
      const v = (A.versions && A.versions()) || {};
      lines.push("", "—", `Ante ${v.app || "web demo"} · UI ${v.web || "built-in"} · ${App.lang ? App.lang() : "en"}`, navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, "$1"));
    }
    return lines.join("\n");
  }

  Object.assign(App.act, {
    feedback() { ui.sheet = { type: "feedback", stars: 0, topic: "", text: "", info: true }; App.SFX.play("tap"); App.paintOverlay(); },
    fbStar(d) { keepText(); ui.sheet.stars = Math.max(1, Math.min(5, parseInt(d.v, 10) || 0)); App.haptic("tap"); App.paintOverlay(); },
    fbTopic(d) { keepText(); ui.sheet.topic = ui.sheet.topic === d.v ? "" : d.v; App.chipFx && App.chipFx(); App.paintOverlay(); },
    fbInfo() { keepText(); ui.sheet.info = ui.sheet.info === false; App.paintOverlay(); },
    fbSend() {
      keepText();
      const sh = ui.sheet; if (!sh || sh.type !== "feedback") return;
      if (!(sh.text || "").trim() && !sh.stars) { App.toast("Write a few words or pick a rating first."); return; }
      const subject = `Ante feedback${sh.topic ? ": " + sh.topic : ""}`, body = compose(sh);
      const sent = A.sendFeedback ? A.sendFeedback(subject, body) : (A.shareText ? A.shareText(subject, "To: peter.racz.rhr@gmail.com\n\n" + body) : false);
      if (sent === false) { App.toast("Couldn't open an email app. Write to peter.racz.rhr@gmail.com"); return; }
      ui.sheet = null; App.paintOverlay();
      App.toast("Thank you! Your email app has the message ready.");
      App.haptic("win");
    },
  });
  // Typing doesn't re-render; keep what's typed when the sheet repaints.
  document.addEventListener("input", e => { if (e.target && e.target.id === "fb-text") keepText(); });
})();
