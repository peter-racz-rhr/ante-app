package com.ante.app

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import com.ante.app.core.SupporterToken

/**
 * Ante Supporter: anyone who donated on Ko-fi with the email of their Google sign-in.
 *
 * Being a Supporter needs proof: a token signed with Péter's private key for that email
 * ([SupporterToken]). The supporter server (server/kofi-supporters, a Cloudflare Worker) hands it
 * out after a Ko-fi donation; Péter can also make one by hand (scripts/supporter-keys.mjs code)
 * and send it as a code. The app only has the public key (res/values/supporter.xml), so it can't
 * be fooled by an old app version, a fake server or someone else's code. The email itself never
 * leaves the phone, only its SHA-256 fingerprint.
 */
object Supporter {
    private const val PREFS = "ante_supporter"
    private const val TIMEOUT_MS = 10_000
    private const val RECHECK_MS = 7L * 24 * 60 * 60 * 1000

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun server(c: Context) = c.getString(R.string.supporter_server).trim().trimEnd('/')
    private fun key(c: Context) = SupporterToken.publicKey(c.getString(R.string.supporter_public_key))
    private fun email(c: Context) = Account.toJson(c).optString("email", "")
    fun kofiUrl(c: Context) = c.getString(R.string.kofi_url).trim()

    /** A Supporter only while a valid token for the signed-in email is stored. */
    fun isSupporter(c: Context): Boolean = SupporterToken.verify(key(c), email(c), prefs(c).getString("token", "") ?: "")

    fun status(c: Context): JSONObject = JSONObject()
        .put("supporter", isSupporter(c))
        .put("verified", isSupporter(c))
        .put("since", prefs(c).getLong("since", 0))
        .put("checkedAt", prefs(c).getLong("checkedAt", 0))
        .put("configured", server(c).startsWith("https://"))
        .put("kofi", kofiUrl(c))
        .put("email", email(c))

    fun fingerprint(email: String): String = SupporterToken.fingerprint(email)

    /** Stores [token] when it is valid for the signed-in email; false otherwise. */
    private fun keep(c: Context, token: String, since: Long): Boolean {
        val t = SupporterToken.clean(token)
        if (!SupporterToken.verify(key(c), email(c), t)) return false
        prefs(c).edit().putString("token", t).putLong("since", if (since > 0) since else System.currentTimeMillis()).apply()
        return true
    }

    /** A code Péter sent by hand. {ok, supporter} or {ok: false, error: "signin" | "code"}. */
    fun redeem(c: Context, code: String): JSONObject {
        if (email(c).isEmpty()) return JSONObject().put("ok", false).put("error", "signin")
        return if (keep(c, code, 0)) JSONObject().put("ok", true).put("supporter", true).put("via", "code")
        else JSONObject().put("ok", false).put("error", "code")
    }

    /**
     * Asks the supporter server about the signed-in email (off the main thread). Answers
     * {ok, supporter, since} or {ok: false, error: "signin" | "setup" | "network"}.
     */
    fun check(c: Context, done: (JSONObject) -> Unit) {
        val email = email(c)
        val base = server(c)
        if (email.isEmpty()) { done(JSONObject().put("ok", false).put("error", "signin")); return }
        if (!base.startsWith("https://")) { done(JSONObject().put("ok", false).put("error", "setup")); return }
        Thread({
            val out = JSONObject()
            try {
                val url = URL("$base/supporter?h=" + URLEncoder.encode(fingerprint(email), "UTF-8"))
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = TIMEOUT_MS; conn.readTimeout = TIMEOUT_MS
                conn.setRequestProperty("User-Agent", "Ante")
                val body = try { conn.inputStream.bufferedReader().use { it.readText().take(4096) } } finally { conn.disconnect() }
                val r = JSONObject(body)
                // Only a signed answer counts; a plain "supporter": true from anywhere is ignored.
                val yes = r.optBoolean("supporter", false) && keep(c, r.optString("token", ""), r.optLong("since", 0))
                prefs(c).edit().putLong("checkedAt", System.currentTimeMillis()).apply()
                out.put("ok", true).put("supporter", yes || isSupporter(c)).put("since", prefs(c).getLong("since", 0))
            } catch (e: Exception) {
                out.put("ok", false).put("error", "network")
            }
            done(out)
        }, "ante-supporter").start()
    }

    /** Re-checks about once a week when signed in and not yet a Supporter. */
    fun checkIfDue(c: Context) {
        if (isSupporter(c) || System.currentTimeMillis() - prefs(c).getLong("checkedAt", 0) < RECHECK_MS) return
        if (email(c).isEmpty() || !server(c).startsWith("https://")) return
        check(c) { }
    }

    /** Signing out or deleting your data forgets the supporter status. */
    fun forget(c: Context) { prefs(c).edit().clear().apply() }
}
