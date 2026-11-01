package com.ante.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.ante.app.core.Backup
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Backup and restore through the user's own Google Drive, in the hidden app folder only Ante can
 * read (scope drive.appdata). Ante has no server: the file goes straight from the phone to Drive.
 *
 * Every call reports back as JSON: {ok, op, savedAtMs?, error?}. Network work runs off the main thread.
 */
object Drive {
    private const val SCOPE = "https://www.googleapis.com/auth/drive.appdata"
    private const val API = "https://www.googleapis.com/drive/v3/files"
    private const val UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
    private const val PREFS = "ante-drive"
    private const val TIMEOUT_MS = 15_000
    private const val AUTO_EVERY_MS = 12 * 60 * 60 * 1000L
    const val REQ_AUTH = 42

    /** What to do once access is granted (the consent screen may come first). */
    private var pending: ((String) -> Unit)? = null
    private var pendingFail: ((String) -> Unit)? = null

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    fun autoOn(c: Context) = prefs(c).getBoolean("auto", false)
    fun lastBackupAt(c: Context) = prefs(c).getLong("lastAt", 0)
    fun setAuto(c: Context, on: Boolean) = prefs(c).edit().putBoolean("auto", on).apply()

    /** Gets an access token, showing Google's consent screen if needed ([interactive]). */
    fun withToken(activity: Activity, interactive: Boolean, ok: (String) -> Unit, fail: (String) -> Unit) {
        val request = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(SCOPE))).build()
        Identity.getAuthorizationClient(activity).authorize(request)
            .addOnSuccessListener { r: AuthorizationResult ->
                val token = r.accessToken
                when {
                    !r.hasResolution() && token != null -> ok(token)
                    r.hasResolution() && interactive -> {
                        pending = ok; pendingFail = fail
                        try {
                            activity.startIntentSenderForResult(r.pendingIntent!!.intentSender, REQ_AUTH, null, 0, 0, 0, null)
                        } catch (e: Exception) { pending = null; fail("auth") }
                    }
                    else -> fail("auth")
                }
            }
            .addOnFailureListener { fail("auth") }
    }

    /** Result of Google's consent screen (from MainActivity.onActivityResult). */
    fun onAuthResult(activity: Activity, data: Intent?) {
        val ok = pending; val fail = pendingFail
        pending = null; pendingFail = null
        try {
            val token = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(data).accessToken
            if (token != null) ok?.invoke(token) else fail?.invoke("cancelled")
        } catch (e: Exception) { fail?.invoke("cancelled") }
    }

    /** Uploads [content] as the backup file, replacing the previous one. */
    fun upload(c: Context, token: String, content: String) {
        val id = findFile(token)
        if (id == null) {
            val boundary = "ante" + System.nanoTime()
            val meta = JSONObject().put("name", Backup.FILE_NAME).put("parents", org.json.JSONArray().put("appDataFolder")).toString()
            val body = "--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$meta\r\n--$boundary\r\nContent-Type: application/json\r\n\r\n$content\r\n--$boundary--"
            request("POST", "$UPLOAD?uploadType=multipart", token, body, "multipart/related; boundary=$boundary")
        } else {
            request("POST", "$UPLOAD/$id?uploadType=media", token, content, "application/json", override = "PATCH")
        }
        prefs(c).edit().putLong("lastAt", System.currentTimeMillis()).apply()
    }

    /** The backup file's contents, or null when there is none. */
    fun download(token: String): String? {
        val id = findFile(token) ?: return null
        return request("GET", "$API/$id?alt=media", token)
    }

    /** Deletes the backup file (when the user deletes their data). */
    fun delete(token: String) {
        val id = findFile(token) ?: return
        request("DELETE", "$API/$id", token)
    }

    /** Backs up in the background at most every 12 hours, when automatic backup is on and access was granted before. */
    fun backupIfDue(activity: Activity, content: () -> String) {
        val c = activity.applicationContext
        if (!autoOn(c) || System.currentTimeMillis() - lastBackupAt(c) < AUTO_EVERY_MS) return
        withToken(activity, interactive = false, ok = { token ->
            Thread({ try { upload(c, token, content()) } catch (e: Exception) { /* next time */ } }, "ante-backup").start()
        }, fail = { })
    }

    /** Forgets this phone's backup settings. Drive access itself is removed in the Google account (Security → Third-party access). */
    fun forget(c: Context) { prefs(c).edit().clear().apply() }

    private fun findFile(token: String): String? {
        val q = URLEncoder.encode("name = '${Backup.FILE_NAME}'", "UTF-8")
        val res = request("GET", "$API?spaces=appDataFolder&q=$q&fields=files(id)&pageSize=1", token) ?: return null
        val files = JSONObject(res).optJSONArray("files") ?: return null
        return if (files.length() > 0) files.getJSONObject(0).optString("id").takeIf { it.isNotEmpty() } else null
    }

    private fun request(method: String, url: String, token: String, body: String? = null, type: String? = null, override: String? = null): String? {
        val conn = URL(url).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = method
            conn.connectTimeout = TIMEOUT_MS; conn.readTimeout = TIMEOUT_MS
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("User-Agent", "Ante")
            if (override != null) conn.setRequestProperty("X-HTTP-Method-Override", override)
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", type ?: "application/json")
                conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val code = conn.responseCode
            if (code == 404) return null
            if (code !in 200..299) throw java.io.IOException("Drive $code")
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }
}
