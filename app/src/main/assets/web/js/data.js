/* Your data: backup to your own Google Drive, restore on a new phone, download everything, and
   delete everything. Native side: Drive.kt, Backup.kt and the bridge (GDPR Art. 15, 17 and 20). */
(function () {
  "use strict";
  const App = window.App, A = App.A, esc = App.esc, ui = App.ui;
  const RESTORABLE = ["theme", "accent", "clock", "name", "sound", "haptics", "lang", "tables", "felt", "back", "seenIntro"];
  let busy = null; // "backup" | "restore" | "delete" while waiting for Google

  /* The page's settings live in this browser's storage; hand a copy to the phone for backups. */
  const sync = () => { try { if (A.savePrefs) A.savePrefs(JSON.stringify(App.P.get())); } catch (e) { /* older app */ } };
  const set = App.P.set;
  App.P.set = patch => { const r = set(patch); sync(); return r; };
  sync();

  const supported = () => !!A.backupStatus;
  const status = () => { try { return A.backupStatus ? A.backupStatus() : { auto: false, lastAt: 0, signedIn: false }; } catch (e) { return { auto: false, lastAt: 0 }; } };
  const ago = ms => {
    if (!ms) return "Never backed up";
    const min = Math.round((Date.now() - ms) / 60000);
    if (min < 2) return "Backed up just now";
    if (min < 60) return `Backed up ${min} min ago`;
    const h = Math.round(min / 60);
    return h < 24 ? `Backed up ${h} h ago` : `Backed up ${Math.round(h / 24)} d ago`;
  };

  /** The "Your data" group in Settings. */
  App.dataGroup = (group, item) => {
    if (!supported()) return "";
    const s = status();
    return group("Your data", `
      ${item({ icon: "google", tone: "#ffffff", title: "Google Drive backup", sub: esc(busy === "backup" ? "Backing up…" : ago(s.lastAt)), trail: `<button class="btn-sm" data-a="driveBackup" ${busy ? "disabled" : ""}>Back up</button>` })}
      ${item({ icon: "clock", tone: "#60a5fa", title: "Back up automatically", sub: "Twice a day at most, when you close Ante", trail: App.toggle("driveAuto", s.auto, "Back up automatically") })}
      ${item({ icon: "back", tone: "#34d399", title: "Restore from Google Drive", sub: busy === "restore" ? "Restoring…" : "Bring your limits, history and settings to this phone", action: "driveRestore" })}
      ${item({ icon: "doc", tone: "#a78bfa", title: "Download my data", sub: "Everything Ante stores, as a file you can share", action: "dataExport" })}
      ${item({ icon: "trash", tone: "var(--loss)", title: "Delete my data", sub: "Limits, history, account and settings", action: "dataDelete" })}`,
      "The backup is a private file in your own Google Drive that only Ante can open. Ante has no server.");
  };

  App.sheetViews = App.sheetViews || {};
  App.sheetViews.deleteData = (sh, sheet, head) => {
    const m = App.modes(), locked = m.strict || m.focus;
    return sheet("", `${head("Delete my data", "del-h")}
      ${locked ? `<p class="pc-state on">${App.ICON.lock}<span>${m.strict ? "Strict mode is on." : "Focus is on."} Deleting would end it early, so it works again when it ends.</span></p>` : ""}
      <p class="muted">This deletes everything Ante keeps on this phone: your limits, screen-time history, table results, schedules, name, photo, Google sign-in and settings. It can't be undone.</p>
      <label class="del-drive">${App.toggle("delDrive", sh.drive, "Also delete the Google Drive backup")}<span>Also delete the Google Drive backup</span></label>
      <p class="fine">Ante Supporter stays with your Google account and comes back with Restore purchase.</p>
      <div class="btn-row"><button class="btn quiet" data-a="closeSheet">Cancel</button><button class="btn danger" data-a="dataDeleteNow" ${locked ? "disabled" : ""}>Delete</button></div>`, "del-h");
  };

  /** Answers from the phone (or the demo) about Drive and deleting. */
  window.anteDrive = raw => {
    let r; try { r = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { return; }
    busy = null;
    if (r.op === "deleted") {
      try { Object.keys(localStorage).filter(k => k.startsWith("ante-")).forEach(k => localStorage.removeItem(k)); } catch (e) { /* storage blocked */ }
      location.reload(); return;
    }
    if (r.ok && r.op === "backup") App.toast("Backed up to your Google Drive.");
    else if (r.ok && r.op === "restore") {
      const p = r.prefs || {}, patch = {};
      RESTORABLE.forEach(k => { if (k in p) patch[k] = p[k]; });
      if (Object.keys(patch).length) { App.P.set(patch); if (patch.lang && App.setLang) App.setLang(patch.lang); }
      App.toast("Restored from your Google Drive.");
      App.haptic("win");
    } else if (r.error === "none") App.toast("No Ante backup on this Google account yet.");
    else if (r.error === "cancelled") App.toast("Google Drive access wasn't given.");
    else if (r.error === "auth") App.toast("Sign in with Google first, then try again.");
    else App.toast("Couldn't reach Google Drive. Check the connection and try again.");
    App.refresh(); App.render();
  };

  Object.assign(App.act, {
    driveBackup() { if (busy) return; busy = "backup"; App.render(); A.backupNow(); },
    driveAuto() { const on = !status().auto; A.setAutoBackup(on); if (on && !status().lastAt) App.act.driveBackup(); else App.render(); },
    driveRestore() { if (busy) return; busy = "restore"; App.render(); A.restoreBackup(); },
    dataExport() { if (!A.exportData || !A.exportData()) App.toast("Install the new app version (0.7.0) to download your data."); },
    dataDelete() { ui.sheet = { type: "deleteData", drive: true }; App.SFX.play("tap"); App.paintOverlay(); },
    delDrive() { const sh = ui.sheet; if (!sh || sh.type !== "deleteData") return; sh.drive = !sh.drive; App.paintOverlay(); },
    dataDeleteNow() {
      const sh = ui.sheet; if (!sh || sh.type !== "deleteData") return;
      if (!A.deleteAllData(!!sh.drive)) { App.toast("Strict mode or Focus is on. Delete works again when it ends."); return; }
      busy = "delete";
    },
  });
})();
