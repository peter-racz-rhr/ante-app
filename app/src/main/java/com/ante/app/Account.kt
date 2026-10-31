package com.ante.app

import android.content.Context
import org.json.JSONObject

/**
 * The signed-in Google account (name, email, picture), the user's own profile picture, and
 * whether onboarding is done.
 * Stored on the device. Ante has no server: the account is used to greet the user and is the
 * hook for a future backup/sync service.
 */
object Account {
    private const val PREFS = "ante-account"

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun toJson(c: Context): JSONObject {
        val p = prefs(c)
        val email = p.getString("email", null)
        return JSONObject()
            .put("signedIn", email != null)
            .put("name", p.getString("name", "") ?: "")
            .put("email", email ?: "")
            .put("onboarded", p.getBoolean("onboarded", false))
            .put("googleConfigured", GoogleAuth.webClientId(c) != null)
            .put("photo", p.getString("photo", null) ?: p.getString("googlePhoto", null) ?: "")
            .put("customPhoto", p.getString("photo", null) != null)
    }

    fun save(c: Context, id: String, name: String, email: String) {
        prefs(c).edit()
            .putString("id", id.take(255))
            .putString("name", name.take(80))
            .putString("email", email.take(254))
            .putLong("signedInAt", System.currentTimeMillis())
            .apply()
    }

    fun clear(c: Context) {
        prefs(c).edit().remove("id").remove("name").remove("email").remove("signedInAt").remove("googlePhoto").apply()
    }

    /** The user's own picture (data URL), or null to remove it. Wins over the Google photo. */
    fun setPhoto(c: Context, dataUrl: String?) {
        prefs(c).edit().apply { if (dataUrl == null) remove("photo") else putString("photo", dataUrl) }.apply()
    }

    /** The Google account picture, kept separately so removing your own photo falls back to it. */
    fun setGooglePhoto(c: Context, dataUrl: String?) {
        prefs(c).edit().apply { if (dataUrl == null) remove("googlePhoto") else putString("googlePhoto", dataUrl) }.apply()
    }

    fun setOnboarded(c: Context) {
        prefs(c).edit().putBoolean("onboarded", true).apply()
    }
}
