/* Focus schedules (work hours, sleep), the daily free spin, the "no tables" switch and the
   weekly recap. The rules live natively (Schedule.kt, TimeBank.kt, Dealer.kt); this is the UI. */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;

  /* ---------- the "no tables" switch ---------- */
  App.tablesOn = () => App.P.get().tables !== false;

  /* ---------- schedules ---------- */
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
  const ALL = 127, WEEKDAYS = 31, WEEKENDS = 96;
  const PRESETS = {
    work: { label: "Work", days: WEEKDAYS, startMin: 9 * 60, endMin: 17 * 60 },
    sleep: { label: "Sleep", days: ALL, startMin: 22 * 60, endMin: 7 * 60 },
  };
  const hm = m => `${App.pad(Math.floor(m / 60))}:${App.pad(m % 60)}`;
  const daysText = d => d === ALL ? "Every day" : d === WEEKDAYS ? "Weekdays" : d === WEEKENDS ? "Weekends" : DAY_NAMES.filter((_, i) => d & (1 << i)).join(", ");
  const spanText = sc => `${hm(sc.startMin)}–${hm(sc.endMin)}${sc.endMin <= sc.startMin ? " (overnight)" : ""}`;
  const schedules = () => App.S.schedules || [];
  const supported = () => !!A.setSchedule && App.S.canEditSchedules !== undefined;

  /** One line for the Focus card: what's scheduled. */
  App.scheduleLine = () => {
    const on = schedules().filter(s => s.on);
    if (!on.length) return "";
    return on.length === 1 ? `${on[0].label} · ${daysText(on[0].days).toLowerCase()} ${spanText(on[0])}` : `${on.length} schedules on`;
  };
  App.scheduleButton = () => supported()
    ? `<button class="link fc-sched" data-a="schedules">${App.ICON.clock}<span>${esc(App.scheduleLine() || "Schedule Focus for work or sleep")}</span>${App.ICON.chev}</button>` : "";

  App.sheetViews = App.sheetViews || {};
  App.sheetViews.schedules = (sh, sheet, head) => {
    const locked = App.S.canEditSchedules === false, list = schedules();
    const rows = list.map(sc => `<div class="sched-row${sc.on ? "" : " off"}">
        <button class="sched-main" data-a="schedEdit" data-id="${sc.id}" ${locked ? "disabled" : ""}>
          <span class="sched-time dotnum">${hm(sc.startMin)}<i>–</i>${hm(sc.endMin)}</span>
          <span class="sched-meta"><b>${esc(sc.label || "Focus")}</b><span>${esc(daysText(sc.days))}</span></span></button>
        ${App.toggle("schedToggle", sc.on, sc.label || "Focus").replace('data-a="schedToggle"', `data-a="schedToggle" data-id="${sc.id}" ${locked ? "disabled" : ""}`)}</div>`).join("");
    const presets = Object.entries(PRESETS).filter(([, p]) => !list.some(s => s.label === p.label))
      .map(([k, p]) => `<button class="chip" data-a="schedPreset" data-v="${k}">${k === "work" ? App.ICON.clock : App.ICON.moon}${esc(p.label)} · ${esc(spanText(p))}</button>`).join("");
    return sheet("", `${head("Schedules", "sched-h")}
      <p class="muted">Focus turns itself on at these times. Every limited app stays covered until the window ends.</p>
      ${list.length ? `<div class="sched-list">${rows}</div>` : ""}
      ${presets ? `<div class="sched-presets">${presets}</div>` : ""}
      ${locked ? `<p class="muted ex-warn">${App.ICON.lock}<span>Schedules can't be changed while one is running or Strict mode is on. You can still add new ones.</span></p>` : ""}
      <div class="btn-row"><button class="btn quiet" data-a="closeSheet">Done</button><button class="btn primary" data-a="schedNew" ${list.length >= 8 ? "disabled" : ""}>Add schedule</button></div>`, "sched-h");
  };

  const hourCol = (id, v, aria) => ({ id, aria, values: Array.from({ length: 24 }, (_, k) => k), label: n => App.pad(n), value: Math.floor(v / 60) });
  const minCol = (id, v, aria) => ({ id, aria, values: Array.from({ length: 12 }, (_, k) => k * 5), label: n => App.pad(n), value: v % 60 - (v % 5) });
  App.sheetViews.schedEdit = (sh, sheet, head) => {
    const d = sh.draft, isNew = !d.id;
    const days = DAY_LETTERS.map((l, i) => `<button class="day${d.days & (1 << i) ? " on" : ""}" data-a="schedDay" data-v="${i}" aria-pressed="${!!(d.days & (1 << i))}" aria-label="${DAY_NAMES[i]}">${l}</button>`).join("");
    return sheet("", `${head(isNew ? "New schedule" : "Edit schedule", "sedit-h")}
      <input class="search sched-name" id="sched-name" maxlength="24" placeholder="Name, like Work or Sleep" value="${esc(d.label)}" autocomplete="off">
      <div class="days" role="group" aria-label="Days">${days}</div>
      <div class="sched-wheels">
        <div class="sched-w"><span class="eyebrow">From</span>${App.wheels([hourCol("sh", d.startMin, "Start hour"), minCol("sm", d.startMin, "Start minute")], { small: true })}</div>
        <div class="sched-w"><span class="eyebrow">To</span>${App.wheels([hourCol("eh", d.endMin, "End hour"), minCol("em", d.endMin, "End minute")], { small: true })}</div>
      </div>
      <p class="ex-ends" id="sched-sum">${esc(summary(d))}</p>
      <div class="btn-row">${isNew ? `<button class="btn quiet" data-a="schedules">Back</button>` : `<button class="btn quiet danger" data-a="schedDelete">Delete</button>`}
        <button class="btn primary" data-a="schedSave">Save</button></div>`, "sedit-h");
  };
  function summary(d) {
    if (!d.days) return "Pick at least one day.";
    if (d.startMin === d.endMin) return "Start and end can't be the same time.";
    const len = (d.endMin - d.startMin + 1440) % 1440;
    return `${daysText(d.days)}, ${spanText(d)} · ${Math.floor(len / 60)} h${len % 60 ? ` ${len % 60} min` : ""}`;
  }
  App.wheelHandlers = App.wheelHandlers || {};
  App.wheelHandlers.schedEdit = (id, v) => {
    const sh = ui.sheet; if (!sh || sh.type !== "schedEdit") return;
    const d = sh.draft;
    if (id === "sh") d.startMin = v * 60 + d.startMin % 60;
    if (id === "sm") d.startMin = Math.floor(d.startMin / 60) * 60 + v;
    if (id === "eh") d.endMin = v * 60 + d.endMin % 60;
    if (id === "em") d.endMin = Math.floor(d.endMin / 60) * 60 + v;
    const el = document.getElementById("sched-sum"); if (el) el.textContent = summary(d);
  };
  const keepName = () => { const n = document.getElementById("sched-name"); if (n && ui.sheet && ui.sheet.draft) ui.sheet.draft.label = n.value; };
  const openEdit = draft => { ui.sheet = { type: "schedEdit", draft }; App.haptic("tap"); App.paintOverlay(); };
  const reopenList = () => { App.refresh(); ui.sheet = { type: "schedules" }; App.render(); };

  /* ---------- daily free spin ---------- */
  const PRIZES = [60, 120, 180, 300, 600, 900];
  const prizeText = s => `${s / 60} min`;
  App.freeSpinCard = () => {
    const S = App.S;
    if (S.freeSpin === undefined || !S.limits.length || !A.freeSpin) return "";
    const pkg = ui.stakePkg, app = App.labelOf(pkg);
    const chips = Array.from({ length: 36 }, (_, k) => `<span class="sp-chip p${k % PRIZES.length}"><span class="dotnum">${PRIZES[k % PRIZES.length] / 60}</span>min</span>`).join("");
    if (!S.freeSpin) {
      const used = S.freeSpinDay === S.day;
      return `<section class="panel spin-card idle" aria-labelledby="spin-h"><div class="panel-head"><div><h2 class="h3" id="spin-h">Daily spin</h2>
        <p class="muted">${used ? "Used today. Stay within your limits for another one tomorrow." : "Stay within your limits today to earn a free spin tomorrow."}</p></div></div></section>`;
    }
    return `<section class="panel spin-card" aria-labelledby="spin-h"><div class="panel-head"><div><h2 class="h3" id="spin-h">Daily spin</h2>
      <p class="muted">You kept to your limits yesterday. Free minutes for <b>${esc(app)}</b>.</p></div>
      <button class="btn-sm" data-a="freeSpin">Spin</button></div>
      <div class="sp-strip" aria-hidden="true"><div class="sp-track" id="sp-track">${chips}</div><i class="sp-mark"></i></div></section>`;
  };
  async function spin() {
    const btn = document.querySelector('[data-a="freeSpin"]'); if (!btn || btn.disabled) return;
    btn.disabled = true;
    const r = A.freeSpin(ui.stakePkg);
    if (!r || !r.ok) { App.toast(r && r.error === "used" ? "Today's spin is used." : "No spin right now."); App.refresh(); App.render(); return; }
    const track = document.getElementById("sp-track"), strip = track && track.parentElement;
    if (track && strip) {
      const chip = track.children[0], w = chip.getBoundingClientRect().width + 8;
      const target = PRIZES.length * 4 + r.index; // land on the prize in the fifth lap
      const x = target * w + w / 2 - strip.clientWidth / 2;
      let last = 0;
      const t0 = performance.now(), dur = 2600, tick = () => {
        const t = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - t, 4), pos = e * x;
        track.style.transform = `translateX(${-pos}px)`;
        const n = Math.floor((pos + strip.clientWidth / 2) / w); if (n !== last) { last = n; App.haptic("tick"); }
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      await new Promise(res => setTimeout(res, dur + 150));
      track.children[target].classList.add("hit");
    }
    App.haptic("win"); App.SFX.play(r.prizeSec >= 600 ? "bigWin" : "win");
    App.toast(`+${prizeText(r.prizeSec)} of ${App.labelOf(ui.stakePkg)}`);
    setTimeout(() => { App.refresh(); App.render(); }, 900);
  }

  /* ---------- weekly recap: a card made to be screenshotted ---------- */
  App.sheetViews.recap = (sh, sheet, head) => {
    const S = App.S, budget = S.limits.reduce((a, l) => a + l.limitSec, 0);
    const days = (S.history || []).slice(0, 7);
    const back = days.reduce((a, d) => a + Math.max(0, budget - (d.usedSec || 0)), 0);
    const used = days.reduce((a, d) => a + (d.usedSec || 0), 0);
    const kept = days.filter(d => budget && d.usedSec <= budget).length;
    const best = days.slice().sort((a, b) => a.usedSec - b.usedSec)[0];
    const net = days.reduce((a, d) => a + (d.wonSec || 0) - (d.lostSec || 0), 0);
    const byApp = {};
    days.forEach(d => Object.entries(d.byApp || {}).forEach(([k, v]) => { byApp[k] = (byApp[k] || 0) + v; }));
    const top = Object.entries(byApp).sort((a, b) => b[1] - a[1])[0];
    // Hours as h:mm (the dot fonts draw a decimal point too much like a plus).
    const h = s => { s = Math.round(s / 60); return s >= 600 ? String(Math.round(s / 60)) : `${Math.floor(s / 60)}:${App.pad(s % 60)}`; };
    const dayName = d => new Date(d + "T12:00:00").toLocaleDateString(App.locale(), { weekday: "long" });
    return sheet("", `${head("Your week", "recap-h")}
      <div class="recap" id="recap">
        <p class="eyebrow">${App.ICON.logo}<span>Ante · last 7 days</span></p>
        <p class="recap-big"><span class="dotnum">${h(back)}</span><span>h</span></p>
        <p class="recap-sub">given back to your real life</p>
        <div class="recap-grid">
          <div><span class="dotnum">${kept}/${days.length || 7}</span><span>days within limits</span></div>
          <div><span class="dotnum">${h(used)} h</span><span>in limited apps</span></div>
          <div><span>Best day</span><b>${best ? esc(dayName(best.day)) : "–"}</b></div>
          <div><span>Most used</span><b>${top ? esc(App.labelOf(top[0])) : "–"}</b></div>
          ${App.tablesOn() ? `<div class="wide"><span>At the tables</span><b>${net >= 0 ? "+" : "−"}${esc(App.fmt(Math.abs(net)))}</b></div>` : ""}
        </div>
      </div>
      <p class="muted center">Take a screenshot to share it.</p>
      <button class="btn primary" data-a="closeSheet">Done</button>`, "recap-h");
  };

  Object.assign(App.act, {
    schedules() { if (!supported()) { App.toast("Install the new app version (0.6.0) for schedules."); return; } App.refresh(); ui.sheet = { type: "schedules" }; App.SFX.play("tap"); App.paintOverlay(); },
    schedPreset(d) { const p = PRESETS[d.v]; if (p) openEdit(Object.assign({ id: 0, on: true }, p)); },
    schedNew() { openEdit({ id: 0, label: "", days: WEEKDAYS, startMin: 9 * 60, endMin: 17 * 60, on: true }); },
    schedEdit(d) { const sc = schedules().find(s => s.id === Number(d.id)); if (sc) openEdit(Object.assign({}, sc)); },
    schedDay(d) {
      keepName();
      const sh = ui.sheet; if (!sh || sh.type !== "schedEdit") return;
      sh.draft.days ^= 1 << Number(d.v);
      const b = App.$overlay.querySelector(`[data-a="schedDay"][data-v="${d.v}"]`), on = !!(sh.draft.days & (1 << Number(d.v)));
      if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }
      const el = document.getElementById("sched-sum"); if (el) el.textContent = summary(sh.draft);
      App.haptic("tap");
    },
    schedSave() {
      keepName();
      const sh = ui.sheet; if (!sh || sh.type !== "schedEdit") return;
      const d = sh.draft;
      if (!d.days || d.startMin === d.endMin) { App.toast(summary(d)); return; }
      if (!d.label.trim()) d.label = "Focus";
      if (!A.setSchedule(d)) { App.toast("That schedule can't be changed right now."); return; }
      App.haptic("win"); reopenList();
    },
    schedDelete() {
      const sh = ui.sheet; if (!sh || sh.type !== "schedEdit") return;
      if (!A.removeSchedule(sh.draft.id)) { App.toast("That schedule can't be removed right now."); return; }
      reopenList();
    },
    schedToggle(d) {
      const sc = schedules().find(s => s.id === Number(d.id)); if (!sc) return;
      if (!A.setSchedule(Object.assign({}, sc, { on: !sc.on }))) { App.toast("Schedules are locked while one runs or Strict mode is on."); return; }
      App.haptic("tap"); reopenList();
    },
    freeSpin: spin,
    recap() { ui.sheet = { type: "recap" }; App.SFX.play("tap"); App.paintOverlay(); },
    tablesOn() {
      const on = !App.tablesOn();
      App.P.set({ tables: on });
      App.toast(on ? "The tables are back." : "Tables hidden. Ante is a plain blocker now.");
      App.render();
    },
  });
})();
