package com.ante.app

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.ante.app.core.Codec
import com.ante.app.core.Schedule
import com.ante.app.core.TimeBank
import org.json.JSONArray
import org.json.JSONObject

/**
 * The JavaScript interface exposed to the bundled web UI as `window.AnteNative`.
 * Every argument is validated here: the web layer is never trusted with the time budget.
 */
class AnteBridge(
    private val activity: Activity,
    private val webView: WebView,
    private val mode: String,
    private val blockedPkg: () -> String?,
    private val blockNote: () -> String?,
) {
    private val ctx get() = activity.applicationContext

    @JavascriptInterface
    fun state(): String {
        // Tidy away a Focus or Strict lock whose time is up before showing the state.
        val now = Bank.now()
        if (Bank.read { b -> (b.state.focusUntilMs in 1..now) || (b.state.strictUntilMs in 1..now) }) {
            Bank.editAt { b, t -> b.expireModes(t) }
        }
        val json = Bank.read { Codec.toJson(it.state) }
        json.put("now", now)
        json.put("strictActive", Bank.read { it.isStrict(now) })
        json.put("focusActive", Bank.read { it.isFocus(now) })
        json.put("focusEndsAt", Bank.read { it.focusEndsAt(now) })
        json.put("scheduleActive", Bank.read { it.scheduledFocusEnd(now) != null })
        json.put("canEditSchedules", Bank.read { it.canEditSchedules(now) })
        json.put("freeSpin", Bank.read { it.freeSpinAvailable() })
        json.put("accessibility", isWatcherEnabled())
        // Health checks shown on Today: is the watcher really running, can the clock be trusted,
        // and is Android allowed to kill Ante to save battery.
        json.put("watching", AppWatcherService.instance != null)
        json.put("autoTime", Bank.autoTimeOn())
        json.put("batteryOk", isIgnoringBatteryOptimizations())
        json.put("lastEventAt", AppWatcherService.lastEventAt)
        return json.toString()
    }

    @JavascriptInterface
    fun context(): String {
        val pkg = blockedPkg()
        val o = JSONObject().put("mode", mode).put("platform", "android").put("hardStrict", BuildConfig.HARD_STRICT)
        if (pkg != null) {
            o.put("pkg", pkg)
            o.put("label", AppCatalog.labelFor(ctx, pkg))
            o.put("icon", AppCatalog.iconFor(ctx, pkg))
        }
        blockNote()?.let { o.put("note", it) }
        return o.toString()
    }

    /** Opens one of a fixed set of outside links (Ko-fi, the contact email) in the right app. */
    @JavascriptInterface
    fun openLink(url: String): Boolean {
        if (url !in OUTSIDE_LINKS && url != Supporter.kofiUrl(ctx)) return false
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) {
                // No browser or mail app: let the page show the address instead.
                webView.evaluateJavascript("window.anteLinkFailed && window.anteLinkFailed(" + JSONObject.quote(url) + ")", null)
            }
        }
        return true
    }

    /** Paints the window and WebView behind the page in the theme's background (#RRGGBB only). */
    @JavascriptInterface
    fun setBackground(hex: String) {
        if (!HEX_COLOR.matches(hex)) return
        val color = android.graphics.Color.parseColor(hex)
        activity.runOnUiThread {
            webView.setBackgroundColor(color)
            (webView.parent as? android.view.View)?.setBackgroundColor(color)
            activity.window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(color))
        }
    }

    /* ---- Over-the-air UI updates ---- */

    /** The page has drawn: this UI version starts fine. */
    @JavascriptInterface
    fun ready() = Ota.confirm(ctx)

    /** Versions for the profile screen: the native API level and the UI bundle (0 = built in). */
    @JavascriptInterface
    fun versions(): String = JSONObject()
        .put("app", try { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName } catch (e: Exception) { "" })
        .put("native", Ota.NATIVE_API)
        .put("web", Ota.activeVersion(ctx))
        .toString()

    /** Switches to a newly downloaded UI now. Only Ante's own screen does this; the block screen waits. */
    @JavascriptInterface
    fun applyUpdate(): Boolean {
        if (activity !is MainActivity) return false
        activity.runOnUiThread { WebHost.load(activity, webView) }
        return true
    }

    /* ---- Account and onboarding ---- */

    /** Installs from before onboarding existed (limits already set) count as onboarded. */
    @JavascriptInterface
    fun account(): String {
        val json = Account.toJson(ctx)
        if (!json.optBoolean("onboarded") && Bank.read { it.state.limits.isNotEmpty() }) {
            Account.setOnboarded(ctx)
            json.put("onboarded", true)
        }
        return json.toString()
    }

    /** Opens Google's sign-in sheet. The result arrives in the page as window.anteAuth(result). */
    @JavascriptInterface
    fun signInWithGoogle() {
        activity.runOnUiThread {
            GoogleAuth.signIn(activity) { result ->
                webView.evaluateJavascript("window.anteAuth && window.anteAuth(" + JSONObject.quote(result.toString()) + ")", null)
            }
        }
    }

    /** Clears the account right away (the page reads it back immediately), then Google's saved choice. */
    @JavascriptInterface
    fun signOut() {
        Account.clear(ctx)
        Supporter.forget(ctx) // the supporter status belongs to the email
        activity.runOnUiThread { GoogleAuth.forgetGoogleChoice(activity) }
    }

    @JavascriptInterface
    fun finishOnboarding() = Account.setOnboarded(ctx)

    /** Opens Android's photo picker. The result arrives as window.anteAccountChanged(). Ante's own screen only. */
    @JavascriptInterface
    fun pickPhoto(): Boolean {
        val main = activity as? MainActivity ?: return false
        main.runOnUiThread { main.pickPhoto() }
        return true
    }

    /** Removes the user's own picture (the Google one, if any, shows again). */
    @JavascriptInterface
    fun removePhoto() = Account.setPhoto(ctx, null)

    /** Installed apps without icons (fast); the page fetches icons one by one with [icon]. */
    @JavascriptInterface
    fun apps(): String = AppCatalog.launchableApps(ctx).toString()

    @JavascriptInterface
    fun icon(pkg: String): String = if (validPkg(pkg)) AppCatalog.iconFor(ctx, pkg) else ""

    @JavascriptInterface
    fun setLimit(pkg: String, label: String, limitSec: Int): Boolean {
        if (!validPkg(pkg) || Exempt.isExempt(ctx, pkg)) return false
        Bank.edit { it.setLimit(pkg, label.take(60).ifBlank { pkg }, limitSec) }
        return true
    }

    /** A category with one shared budget: [key] like "cat:social", [members] a JSON list of packages. */
    @JavascriptInterface
    fun setGroup(key: String, label: String, members: String, limitSec: Int): Boolean {
        val list = try { org.json.JSONArray(members).let { a -> (0 until minOf(a.length(), 80)).map { a.optString(it, "") } } } catch (e: Exception) { return false }
        val apps = list.filter { validPkg(it) && !Exempt.isExempt(ctx, it) }
        return Bank.editAt { b, now -> b.setGroup(key, label.take(40).ifBlank { "Category" }, apps, limitSec, now) }
    }

    @JavascriptInterface
    fun removeLimit(pkg: String): Boolean {
        if (!validPkg(pkg) && !com.ante.app.core.TimeBank.isGroupKey(pkg)) return false
        val now = Bank.now()
        if (!Bank.read { it.canRemoveLimits(now) }) return false
        Bank.editAt { b, now -> b.removeLimit(pkg, now) }
        return true
    }

    /* ---- The tables. Since 0.6.0 every round is dealt natively ([com.ante.app.core.Dealer]); the
       old bet/settle pair, where the page named its own payout, is switched off. ---- */

    @JavascriptInterface
    fun bet(pkg: String, stakeSec: Int): Boolean = false

    @JavascriptInterface
    fun settle(pkg: String, game: String, stakeSec: Int, returnSec: Int): Int = TimeBank.INVALID_SETTLE

    /** One-shot games: "coin" (args {pick: "H"|"T"}), "roulette" ({bets: [...]}, [stakeSec] per bet), "slots". */
    @JavascriptInterface
    fun play(pkg: String, game: String, stakeSec: Int, args: String): String {
        if (!validPkg(pkg)) return BAD
        val a = try { JSONObject(args) } catch (e: Exception) { JSONObject() }
        return Bank.editAt { b, now ->
            when (game) {
                "coin" -> Bank.dealer.coin(b, pkg, stakeSec, a.optString("pick", ""), now)
                "roulette" -> {
                    val arr = a.optJSONArray("bets")
                    val bets = if (arr == null) emptyList() else (0 until minOf(arr.length(), 64)).map { arr.optString(it, "") }
                    Bank.dealer.roulette(b, pkg, stakeSec, bets, now)
                }
                "slots" -> Bank.dealer.slots(b, pkg, stakeSec, now)
                "plinko" -> Bank.dealer.plinko(b, pkg, stakeSec, now)
                "crash" -> Bank.dealer.crash(b, pkg, stakeSec, a.optDouble("target", 0.0), now)
                "dice" -> Bank.dealer.dice(b, pkg, stakeSec, a.optInt("under", 0), now)
                "baccarat" -> Bank.dealer.baccarat(b, pkg, stakeSec, a.optString("bet", ""), now)
                "keno" -> {
                    val arr = a.optJSONArray("picks")
                    val picks = if (arr == null) emptyList() else (0 until minOf(arr.length(), 10)).map { arr.optInt(it, 0) }
                    Bank.dealer.keno(b, pkg, stakeSec, picks, now)
                }
                else -> JSONObject(BAD)
            }
        }.toString()
    }

    @JavascriptInterface
    fun bjDeal(pkg: String, stakeSec: Int): String =
        if (!validPkg(pkg)) BAD else Bank.editAt { b, now -> Bank.dealer.bjDeal(b, pkg, stakeSec, now) }.toString()

    @JavascriptInterface
    fun bjHit(): String = Bank.editAt { b, now -> Bank.dealer.bjHit(b, now) }.toString()

    @JavascriptInterface
    fun bjDouble(): String = Bank.editAt { b, now -> Bank.dealer.bjDouble(b, now) }.toString()

    @JavascriptInterface
    fun bjStand(): String = Bank.editAt { b, now -> Bank.dealer.bjStand(b, now) }.toString()

    @JavascriptInterface
    fun pkDeal(pkg: String, stakeSec: Int): String =
        if (!validPkg(pkg)) BAD else Bank.editAt { b, _ -> Bank.dealer.pkDeal(b, pkg, stakeSec) }.toString()

    /** [held]: one bit per card kept, bit 0 for the first card. */
    @JavascriptInterface
    fun pkDraw(held: Int): String = Bank.editAt { b, now -> Bank.dealer.pkDraw(b, held, now) }.toString()

    /** The daily free spin: once a day, after a day within the limits. The prize goes to [pkg]. */
    @JavascriptInterface
    fun freeSpin(pkg: String): String =
        if (!validPkg(pkg)) BAD else Bank.editAt { b, now -> Bank.dealer.freeSpin(b, pkg, now) }.toString()

    /* ---- Ante Supporter: Ko-fi donors (see Supporter.kt) ---- */

    /** {supporter, since, checkedAt, configured, kofi, email}. */
    @JavascriptInterface
    fun supporter(): String = Supporter.status(ctx).toString()

    /** Asks the supporter server now; the answer arrives as window.anteSupporter(result). */
    @JavascriptInterface
    fun checkSupporter() {
        Supporter.check(ctx) { r -> activity.runOnUiThread { webView.evaluateJavascript("window.anteSupporter && window.anteSupporter(" + JSONObject.quote(r.toString()) + ")", null) } }
    }

    /* ---- Website filter (see WebFilter.kt and WebFilterService.kt) ---- */

    /** {available, on, adult, gambling, custom, lockUntil, nnnUntil, nnnDone, november, running, consented, strict}. */
    @JavascriptInterface
    fun webFilter(): String = WebFilter.status(ctx).toString()

    /** New settings; false when refused (turning something off while locked or in Strict mode). */
    @JavascriptInterface
    fun setWebFilter(on: Boolean, adult: Boolean, gambling: Boolean, customJson: String): Boolean {
        val custom = try { JSONArray(customJson).let { a -> List(minOf(a.length(), 400)) { a.optString(it).take(300) } } } catch (e: Exception) { return false }
        return WebFilter.set(ctx, on, adult, gambling, custom)
    }

    /** Locks the adult filter: 1, 7 or 30 days, or 0 for No Nut November (until 1 December). */
    @JavascriptInterface
    fun webFilterLock(days: Int): Boolean = WebFilter.lock(ctx, days)

    /** Asks Android for the VPN permission once; the result arrives as window.anteWeb(status). */
    @JavascriptInterface
    fun webFilterConsent(): Boolean {
        val main = activity as? MainActivity ?: return false
        main.runOnUiThread { main.askVpnConsent() }
        return true
    }

    /* ---- Your data: Google Drive backup, download, delete (GDPR Art. 15, 17, 20) ---- */

    private fun say(fn: String, o: JSONObject) {
        activity.runOnUiThread { webView.evaluateJavascript("window.$fn && window.$fn(" + JSONObject.quote(o.toString()) + ")", null) }
    }
    private fun prefsCopy(): String = ctx.getSharedPreferences(UI_PREFS, android.content.Context.MODE_PRIVATE).getString("prefs", "{}") ?: "{}"
    private fun backupFile(): String = Bank.editAt { b, now -> com.ante.app.core.Backup.export(b.state, prefsCopy(), now) }

    /** The page's own settings (theme, name, language…), kept natively so backups include them. */
    @JavascriptInterface
    fun savePrefs(json: String) {
        if (json.length > 8_000) return
        ctx.getSharedPreferences(UI_PREFS, android.content.Context.MODE_PRIVATE).edit().putString("prefs", json).apply()
    }

    /** {auto, lastAt, signedIn}. */
    @JavascriptInterface
    fun backupStatus(): String = JSONObject().put("auto", Drive.autoOn(ctx)).put("lastAt", Drive.lastBackupAt(ctx))
        .put("signedIn", Account.toJson(ctx).optBoolean("signedIn")).toString()

    @JavascriptInterface
    fun setAutoBackup(on: Boolean) = Drive.setAuto(ctx, on)

    /** Backs up now; the answer arrives as window.anteDrive({ok, op: "backup"}). */
    @JavascriptInterface
    fun backupNow() {
        activity.runOnUiThread {
            Drive.withToken(activity, interactive = true, ok = { token ->
                Thread({
                    val o = JSONObject().put("op", "backup")
                    try { Drive.upload(ctx, token, backupFile()); o.put("ok", true).put("lastAt", Drive.lastBackupAt(ctx)) } catch (e: Exception) { o.put("ok", false).put("error", "network") }
                    say("anteDrive", o)
                }, "ante-backup").start()
            }, fail = { e -> say("anteDrive", JSONObject().put("op", "backup").put("ok", false).put("error", e)) })
        }
    }

    /**
     * Restores the Drive backup into this phone (see Backup.merge: it never gives back used time or
     * ends a lock). Answers window.anteDrive({ok, op: "restore", prefs, savedAtMs} or {error: "none"}).
     */
    @JavascriptInterface
    fun restoreBackup() {
        activity.runOnUiThread {
            Drive.withToken(activity, interactive = true, ok = { token ->
                Thread({
                    val o = JSONObject().put("op", "restore")
                    try {
                        val parsed = com.ante.app.core.Backup.parse(Drive.download(token))
                        if (parsed == null) o.put("ok", false).put("error", "none")
                        else {
                            Bank.editAt { b, now -> b.replaceState(com.ante.app.core.Backup.merge(b.state, parsed.bank, now)) }
                            AppWatcherService.instance?.scheduleExpiry()
                            o.put("ok", true).put("prefs", parsed.prefs).put("savedAtMs", parsed.savedAtMs)
                        }
                    } catch (e: Exception) { o.put("ok", false).put("error", "network") }
                    say("anteDrive", o)
                }, "ante-restore").start()
            }, fail = { e -> say("anteDrive", JSONObject().put("op", "restore").put("ok", false).put("error", e)) })
        }
    }

    /** Opens Android's share sheet with [text] (a purchase receipt, for example). */
    @JavascriptInterface
    fun shareText(subject: String, text: String): Boolean {
        if (text.length > 20_000) return false
        activity.runOnUiThread {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, subject.take(120)).putExtra(Intent.EXTRA_TEXT, text)
            try { activity.startActivity(Intent.createChooser(send, subject.take(120))) } catch (e: Exception) { /* no app to share with */ }
        }
        return true
    }

    /** Opens Android's share sheet with everything Ante stores about you, as JSON (GDPR Art. 15 and 20). */
    @JavascriptInterface
    fun exportData(): Boolean {
        val account = Account.toJson(ctx).apply { remove("photo") }
        val text = JSONObject(backupFile()).put("account", account).toString(2)
        activity.runOnUiThread {
            val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, "Ante data export").putExtra(Intent.EXTRA_TEXT, text)
            try { activity.startActivity(Intent.createChooser(send, "Ante data")) } catch (e: Exception) { /* no app to share with */ }
        }
        return true
    }

    /**
     * Deletes everything Ante stores (GDPR Art. 17): limits, history, schedules, account, photo,
     * settings and, when [alsoDrive], the Drive backup. Refused while Strict mode or Focus runs,
     * since that would end the lock the user chose; it works again when the lock ends.
     */
    @JavascriptInterface
    fun deleteAllData(alsoDrive: Boolean): Boolean {
        val now = Bank.now()
        if (Bank.read { it.isStrict(now) || it.isFocus(now) } || !WebFilter.canForget(ctx)) return false
        val wipe = {
            Bank.editAt { b, t -> b.wipe(java.time.Instant.ofEpochMilli(t).atZone(java.time.ZoneId.systemDefault()).toLocalDate().toString()) }
            Account.clear(ctx); Account.setPhoto(ctx, null)
            ctx.getSharedPreferences("ante-account", android.content.Context.MODE_PRIVATE).edit().clear().apply()
            ctx.getSharedPreferences(UI_PREFS, android.content.Context.MODE_PRIVATE).edit().clear().apply()
            Drive.forget(ctx)
            Supporter.forget(ctx)
            WebFilter.forget(ctx)
            say("anteDrive", JSONObject().put("op", "deleted").put("ok", true))
        }
        if (!alsoDrive) { wipe(); return true }
        activity.runOnUiThread {
            Drive.withToken(activity, interactive = false, ok = { token ->
                Thread({ try { Drive.delete(token) } catch (e: Exception) { /* deleted locally anyway */ }; wipe() }, "ante-delete").start()
            }, fail = { wipe() })
        }
        return true
    }

    /* ---- Focus schedules ---- */

    /** Adds ([id] 0) or changes a schedule. Returns its id, or 0 when refused. */
    @JavascriptInterface
    fun setSchedule(id: Int, label: String, days: Int, startMin: Int, endMin: Int, on: Boolean): Int {
        val res = Bank.editAt { b, now ->
            val sid = if (id <= 0) b.nextScheduleId() else id
            if (b.setSchedule(Schedule(sid, label, days, startMin, endMin, on), now)) sid else 0
        }
        AppWatcherService.instance?.scheduleExpiry()
        return res
    }

    @JavascriptInterface
    fun removeSchedule(id: Int): Boolean {
        val ok = Bank.editAt { b, now -> b.removeSchedule(id, now) }
        AppWatcherService.instance?.scheduleExpiry()
        return ok
    }

    /** Reserves time and opens the app. */
    @JavascriptInterface
    fun open(pkg: String, seconds: Int): Boolean {
        if (!validPkg(pkg)) return false
        val launch = ctx.packageManager.getLaunchIntentForPackage(pkg) ?: return false
        val ok = Bank.editAt { b, now -> b.startSession(pkg, seconds, now) }
        if (!ok) return false
        AppWatcherService.instance?.scheduleExpiry()
        activity.runOnUiThread {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                activity.startActivity(launch)
                if (activity is BlockActivity) activity.finish()
            } catch (e: Exception) {
                // App vanished between the check and the launch: give the reserved time back.
                Bank.editAt { b, now -> b.endSession(now) }
                webView.evaluateJavascript("window.anteRefresh && window.anteRefresh()", null)
            }
        }
        return true
    }

    /** Leaves the block screen for the home screen. */
    @JavascriptInterface
    fun closeBlock() {
        activity.runOnUiThread {
            val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(home)
            if (activity is BlockActivity) activity.finish()
        }
    }

    @JavascriptInterface
    fun openAnte() {
        activity.runOnUiThread {
            activity.startActivity(Intent(activity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            if (activity is BlockActivity) activity.finish()
        }
    }

    /* ---- Strict mode. Leaving it, or opening Settings while it is on, needs a 30 s wait that
       the native side times, so the page can't skip it. ---- */

    @JavascriptInterface
    fun startWait() { waitStartedAt = Bank.now() }

    /** Milliseconds until the wait is over; -1 when no wait is running (used, expired or never started). */
    @JavascriptInterface
    fun waitLeftMs(): Long {
        if (waitStartedAt == 0L || Bank.now() - waitStartedAt > WAIT_VALID_MS) return -1
        return (waitStartedAt + WAIT_MS - Bank.now()).coerceAtLeast(0)
    }

    private fun waitDone(): Boolean {
        val since = Bank.now() - waitStartedAt
        return waitStartedAt > 0 && since in WAIT_MS..WAIT_VALID_MS
    }

    @JavascriptInterface
    fun setStrict(on: Boolean): Boolean {
        // A timed lock has no early way out.
        val now = Bank.now()
        if (!on && !Bank.read { it.canLeaveStrict(now) }) return false
        if (!on && Bank.read { it.state.strict } && !waitDone()) return false
        Bank.edit { it.setStrict(on) }
        waitStartedAt = 0
        return true
    }

    /** Strict mode for a set number of days (1 to 31). It switches itself off at the end. */
    @JavascriptInterface
    fun startStrict(days: Int): Boolean {
        if (days !in STRICT_DAYS) return false
        return Bank.editAt { b, now -> b.startStrict(now, days * DAY_MS) }
    }

    /** Focus for [minutes] (5 to 720): every limited app stays covered, whatever time it has left. */
    @JavascriptInterface
    fun startFocus(minutes: Int): Boolean {
        if (minutes !in 5..720) return false
        val ok = Bank.editAt { b, now -> b.startFocus(now, minutes * 60_000L) }
        AppWatcherService.instance?.scheduleExpiry()
        return ok
    }

    /** Ends Focus early: after the 30-second wait, and never while Strict mode is on. */
    @JavascriptInterface
    fun endFocus(): Boolean {
        val now = Bank.now()
        if (!waitDone() || Bank.read { it.isStrict(now) }) return false
        Bank.editAt { b, t -> b.endFocus(t) }
        waitStartedAt = 0
        return true
    }

    /** From a strict-mode block screen: open Settings for two minutes after the wait. */
    @JavascriptInterface
    fun openGuarded(pkg: String): Boolean {
        if (!validPkg(pkg) || !waitDone()) return false
        Bank.editAt { b, now -> b.grantSettingsPass(now) }
        waitStartedAt = 0
        val launch = ctx.packageManager.getLaunchIntentForPackage(pkg)
        activity.runOnUiThread {
            if (launch != null) activity.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            if (activity is BlockActivity) activity.finish()
        }
        return true
    }

    /** Settings shortcuts from Ante. In strict mode they need the wait too, then open a pass. */
    private fun openSettings(intent: Intent): Boolean {
        if (Bank.read { it.state.strict }) {
            if (!waitDone()) return false
            Bank.editAt { b, now -> b.grantSettingsPass(now) }
            waitStartedAt = 0
        }
        activity.runOnUiThread {
            try { activity.startActivity(intent) } catch (e: Exception) { activity.startActivity(Intent(Settings.ACTION_SETTINGS)) }
        }
        return true
    }

    @JavascriptInterface
    fun openAccessibilitySettings(): Boolean = openSettings(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))

    /** App info page, where Android 13+ hides "Allow restricted settings" for sideloaded apps. */
    @JavascriptInterface
    fun openAppInfo(): Boolean =
        openSettings(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", ctx.packageName, null)))

    /** Asks Android to stop putting Ante to sleep, which on some phones also stops the watcher. */
    @JavascriptInterface
    fun openBatterySettings(): Boolean =
        openSettings(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + ctx.packageName)))

    @JavascriptInterface
    fun openDateSettings(): Boolean = openSettings(Intent(Settings.ACTION_DATE_SETTINGS))

    @JavascriptInterface
    fun haptic(kind: String) {
        val k = if (kind in HAPTIC_KINDS) kind else "tap"
        if (Haptics.play(ctx, k)) return
        // No vibrator service: fall back to the view's haptics, which some tablets still have.
        val constant = when (k) {
            "win" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.LONG_PRESS
            "loss" -> if (Build.VERSION.SDK_INT >= 30) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
            "tick" -> HapticFeedbackConstants.CLOCK_TICK
            else -> HapticFeedbackConstants.KEYBOARD_TAP
        }
        webView.post { webView.performHapticFeedback(constant, HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING) }
    }

    private fun isIgnoringBatteryOptimizations(): Boolean {
        val pm = ctx.getSystemService(android.content.Context.POWER_SERVICE) as? android.os.PowerManager ?: return true
        return pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    private fun isWatcherEnabled(): Boolean {
        val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(ctx, AppWatcherService::class.java)
        return enabled.split(':').any { ComponentName.unflattenFromString(it) == me }
    }

    private fun validPkg(pkg: String?): Boolean = isValidPackage(pkg)

    companion object {
        private val HAPTIC_KINDS = setOf("tap", "tick", "win", "loss")
        private val HEX_COLOR = Regex("^#[0-9a-fA-F]{6}$")
        private val STRICT_DAYS = 1..31
        private const val UI_PREFS = "ante-ui"
        private const val BAD = "{\"ok\":false,\"error\":\"bet\"}"
        private const val DAY_MS = 24 * 60 * 60_000L
        private val OUTSIDE_LINKS = setOf("https://ko-fi.com/peteracz", "mailto:peter.racz.rhr@gmail.com")
        private const val WAIT_MS = 30_000L
        private const val WAIT_VALID_MS = 10 * 60_000L

        /** Shared by every page, so the wait can't be restarted from a second screen. */
        @Volatile
        private var waitStartedAt = 0L

        private val PKG = Regex("^[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)*$")

        fun isValidPackage(pkg: String?): Boolean = pkg != null && pkg.length in 1..255 && PKG.matches(pkg)
    }
}
