package com.ante.app

import android.content.Context
import android.net.VpnService
import com.ante.app.core.DomainSet
import com.ante.app.core.WebFilterCore
import com.ante.app.core.WebRules
import org.json.JSONArray
import org.json.JSONObject
import java.time.ZoneId

/**
 * The website filter's settings (on the phone only) and the lists. [WebFilterService] answers
 * DNS through it. Rules and the lock live in [WebRules], which is tested on the JVM.
 */
object WebFilter {
    private const val PREFS = "ante_web"
    private const val DAY_MS = 24L * 60 * 60 * 1000
    val LOCK_DAYS = setOf(1, 7, 30)

    @Volatile private var core: WebFilterCore? = null
    @Volatile var rules: WebRules = WebRules(); private set

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(c: Context): WebRules {
        val p = prefs(c)
        val custom = try { JSONArray(p.getString("custom", "[]")).let { a -> List(a.length()) { a.optString(it) } } } catch (e: Exception) { emptyList() }
        rules = WebRules(
            on = p.getBoolean("on", false), adult = p.getBoolean("adult", true), gambling = p.getBoolean("gambling", false),
            custom = WebRules.cleanList(custom), lockUntilMs = p.getLong("lockUntil", 0), nnnUntilMs = p.getLong("nnnUntil", 0),
        )
        return rules
    }

    private fun save(c: Context, r: WebRules) {
        prefs(c).edit().putBoolean("on", r.on).putBoolean("adult", r.adult).putBoolean("gambling", r.gambling)
            .putString("custom", JSONArray(r.custom).toString()).putLong("lockUntil", r.lockUntilMs).putLong("nnnUntil", r.nnnUntilMs).apply()
        rules = r
    }

    /** Loads the lists once (about 3 MB from the APK), off the main thread. */
    fun core(c: Context): WebFilterCore {
        core?.let { return it }
        synchronized(this) {
            core?.let { return it }
            fun list(name: String) = try { c.assets.open("blocklist/$name").use { DomainSet.decode(it.readBytes()) } } catch (e: Exception) { null } ?: DomainSet.EMPTY
            return WebFilterCore(list("adult.bin"), list("gambling.bin")).also { core = it }
        }
    }

    fun blocked(c: Context, name: String) = core(c).blocked(name, rules)

    /** Android has said yes to Ante's VPN (needed once). */
    fun consented(c: Context) = try { VpnService.prepare(c) == null } catch (e: Exception) { false }

    fun status(c: Context): JSONObject {
        val r = load(c); val now = Bank.now()
        return JSONObject().put("available", true).put("on", r.on).put("adult", r.adult).put("gambling", r.gambling)
            .put("custom", JSONArray(r.custom)).put("lockUntil", if (r.isLocked(now)) r.lockUntilMs else 0)
            .put("nnnUntil", r.nnnUntilMs).put("nnnDone", r.nnnDone(now))
            .put("november", WebRules.novemberEnd(now, ZoneId.systemDefault()) ?: 0)
            .put("running", WebFilterService.running).put("consented", consented(c))
            .put("strict", Bank.read { it.isStrict(now) })
    }

    /** Applies new settings from the page; false when refused (loosening while locked or in Strict). */
    fun set(c: Context, on: Boolean, adult: Boolean, gambling: Boolean, custom: List<String>): Boolean {
        val cur = load(c)
        val next = Bank.editAt { b, now -> cur.change(WebRules(on, adult, gambling, custom), now, b.isStrict(now)) } ?: return false
        save(c, next)
        apply(c)
        return true
    }

    /** Locks the adult filter for [days] days, or until 1 December when [days] is 0 and it's November. */
    fun lock(c: Context, days: Int): Boolean {
        val cur = load(c); val now = Bank.now()
        val next = if (days == 0) {
            val end = WebRules.novemberEnd(now, ZoneId.systemDefault()) ?: return false
            cur.lock(now, end, nnn = true)
        } else {
            if (days !in LOCK_DAYS) return false
            cur.lock(now, now + days * DAY_MS)
        } ?: return false
        save(c, next)
        apply(c)
        return true
    }

    /** Starts or stops the service to match the settings (needs the VPN consent to start). */
    fun apply(c: Context) {
        val r = rules
        if (r.on && consented(c)) WebFilterService.start(c) else if (!r.on) WebFilterService.stop(c)
    }

    /** Called by the watcher and on resume: brings the filter back if it should run but doesn't. */
    fun ensure(c: Context) {
        val r = load(c)
        if (r.on && !WebFilterService.running && consented(c)) WebFilterService.start(c)
    }

    /** Delete my data: everything goes, unless a lock is still running (then delete is refused earlier). */
    fun forget(c: Context) {
        prefs(c).edit().clear().apply()
        rules = WebRules()
        WebFilterService.stop(c)
    }

    fun canForget(c: Context) = !load(c).isLocked(Bank.now())
}
