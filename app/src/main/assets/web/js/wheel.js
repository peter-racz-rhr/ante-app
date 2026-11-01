/* Scroll-wheel picker (like an alarm clock's), in Ante's clock font. Columns snap to a centred
   band; neighbours shrink, fade and tilt away; every step ticks. Used for Focus and Strict.
   App.wheels(cols) returns the markup; App.mountWheels(root, onChange) brings it to life. */
(function () {
  "use strict";
  const App = window.App;
  const esc = App.esc;
  const ITEM = 44, VISIBLE = 5; // px per row, rows in view

  /** cols: [{ id, values: [...], label: v => text, value, unit, aria }] */
  App.wheels = cols => `<div class="picker" style="--pk-h:${ITEM}px;--pk-n:${VISIBLE}">
    <span class="pk-band" aria-hidden="true"></span>
    ${cols.map(c => `<div class="pk-col">
      <div class="pk-list" data-wheel="${esc(c.id)}" role="listbox" tabindex="0" aria-label="${esc(c.aria)}">
        <div class="pk-pad" aria-hidden="true"></div>
        ${c.values.map(v => `<div class="pk-item dotnum" role="option" data-v="${v}" aria-selected="${v === c.value}">${esc(c.label(v))}</div>`).join("")}
        <div class="pk-pad" aria-hidden="true"></div>
      </div>
      ${c.unit ? `<span class="pk-unit" data-unit="${esc(c.id)}">${esc(c.unit)}</span>` : ""}</div>`).join("")}
  </div>`;

  /** Scrolls each column to its selected value and reports changes as onChange(id, value). */
  App.mountWheels = (root, onChange) => {
    (root || document).querySelectorAll(".pk-list").forEach(list => {
      if (list.__wheel) return;
      list.__wheel = true;
      const items = [...list.querySelectorAll(".pk-item")];
      let idx = Math.max(0, items.findIndex(i => i.getAttribute("aria-selected") === "true"));
      list.scrollTop = idx * ITEM;
      const paint = () => {
        const pos = list.scrollTop / ITEM;
        items.forEach((it, i) => {
          const d = Math.max(-2.5, Math.min(2.5, i - pos)), a = Math.abs(d);
          it.style.transform = `perspective(400px) rotateX(${(-d * 18).toFixed(1)}deg) scale(${(1 - a * 0.1).toFixed(3)})`;
          it.style.opacity = String(Math.max(0.15, 1 - a * 0.32).toFixed(2));
        });
      };
      let raf = 0;
      list.addEventListener("scroll", () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          paint();
          const n = Math.max(0, Math.min(items.length - 1, Math.round(list.scrollTop / ITEM)));
          if (n === idx) return;
          idx = n;
          items.forEach((it, i) => it.setAttribute("aria-selected", String(i === n)));
          App.haptic("tick");
          if (App.SFX) App.SFX.play("chip");
          onChange(list.dataset.wheel, Number(items[n].dataset.v));
        });
      }, { passive: true });
      // Tap a value to roll to it; arrow keys step one row.
      list.addEventListener("click", e => {
        const it = e.target.closest(".pk-item"); if (!it) return;
        list.scrollTo({ top: items.indexOf(it) * ITEM, behavior: "smooth" });
      });
      list.addEventListener("keydown", e => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        list.scrollTo({ top: (idx + (e.key === "ArrowDown" ? 1 : -1)) * ITEM, behavior: "smooth" });
      });
      paint();
    });
  };

  /** Rolls a column to a value from code (used when one column limits another). */
  App.setWheel = (root, id, value) => {
    const list = (root || document).querySelector(`.pk-list[data-wheel="${id}"]`); if (!list) return;
    const items = [...list.querySelectorAll(".pk-item")], i = items.findIndex(it => Number(it.dataset.v) === value);
    if (i >= 0) list.scrollTo({ top: i * ITEM, behavior: "smooth" });
  };
})();
