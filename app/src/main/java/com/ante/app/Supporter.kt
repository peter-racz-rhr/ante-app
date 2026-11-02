package com.ante.app

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.MessageDigest

/**
 * Ante Supporter: anyone who donated on Ko-fi with the email of their Google sign-in.
 *
 * Ko-fi tells Ante's small supporter server (server/kofi-supporters, a Cloudflare Worker) about
 * each donation; the server keeps only a SHA-256 fingerprint of the donor's email. Ante asks it
 * "is this fingerprint a supporter?" and stores the yes on the phone. The email itself never
 * leaves the phone. The server address is res/values/supporter.xml → supporter_server.
 */
object Supporter {
    private const val PREFS = "ante_supporter"
    private const val TIMEOUT_MS = 10_000
    private const val RECHECK_MS = 7L * 24 * 60 * 60 * 1000

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun server(c: Context) = c.getString(R.string.supporter_server).trim().trimEnd('/')
    fun kofiUrl(c: Context) = c.getString(R.string.kofi_url).trim()

    fun isSupporter(c: Context) = prefs(c).getBoolean("supporter", false)

    fun status(c: Context): JSONObject = JSONObject()
        .put("supporter", isSupporter(c))
        .put("since", prefs(c).getLong("since", 0))
        .put("checkedAt", prefs(c).getLong("checkedAt", 0))
        .put("configured", server(c).startsWith("https://"))
        .put("kofi", kofiUrl(c))
        .put("email", Account.toJson(c).optString("email", ""))

    /** SHA-256 of the trimmed, lower-cased email, as hex: the only thing the server ever sees. */
    fun fingerprint(email: String): String =
        MessageDigest.getInstance("SHA-256").digest(email.trim().lowercase().toByteArray()).joinToString("") { "%02x".format(it) }

    /**
     * Asks the supporter server about the signed-in email (off the main thread). Answers
     * {ok, supporter, since} or {ok: false, error: "signin" | "setup" | "network"}.
     */
    fun check(c: Context, done: (JSONObject) -> Unit) {
        val email = Account.toJson(c).optString("email", "")
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
                val body = try { conn.inputStream.bufferedReader().use { it.readText() } } finally { conn.disconnect() }
                val r = JSONObject(body)
                val yes = r.optBoolean("supporter", false)
                prefs(c).edit().putBoolean("supporter", yes).putLong("since", r.optLong("since", 0)).putLong("checkedAt", System.currentTimeMillis()).apply()
                out.put("ok", true).put("supporter", yes).put("since", r.optLong("since", 0))
            } catch (e: Exception) {
                out.put("ok", false).put("error", "network")
            }
            done(out)
        }, "ante-supporter").start()
    }

    /** Re-checks about once a week when signed in, so a new donation shows up by itself. */
    fun checkIfDue(c: Context) {
        if (System.currentTimeMillis() - prefs(c).getLong("checkedAt", 0) < RECHECK_MS) return
        if (Account.toJson(c).optString("email", "").isEmpty() || !server(c).startsWith("https://")) return
        check(c) { }
    }

    /** Signing out or deleting your data forgets the supporter status. */
    fun forget(c: Context) { prefs(c).edit().clear().apply() }
}
