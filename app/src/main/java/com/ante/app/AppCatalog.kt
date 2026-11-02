package com.ante.app

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/** Lists apps that have a launcher icon, with small PNG icons for the web UI. */
object AppCatalog {
    private const val ICON_PX = 96
    private val iconCache = HashMap<String, String>()

    fun launchableApps(context: Context): JSONArray {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        @Suppress("DEPRECATION")
        val activities = pm.queryIntentActivities(intent, 0)
        val seen = HashSet<String>()
        val rows = activities.mapNotNull { info ->
            val pkg = info.activityInfo?.packageName ?: return@mapNotNull null
            if (Exempt.isExempt(context, pkg) || !seen.add(pkg)) return@mapNotNull null
            val label = info.loadLabel(pm)?.toString()?.take(60) ?: pkg
            Triple(pkg, label, info)
        }.sortedBy { it.second.lowercase() }

        val out = JSONArray()
        for ((pkg, label, info) in rows) {
            val cached = synchronized(iconCache) { iconCache[pkg] } ?: ""
            out.put(JSONObject().put("pkg", pkg).put("label", label).put("icon", cached).put("cat", categoryOf(pkg, info.activityInfo?.applicationInfo)))
        }
        return out
    }

    /* Categories for category limits: Android's own tag where the app sets one, plus the
       well-known apps that don't. "" when it's none of these. */
    private val KNOWN = mapOf(
        "social" to setOf("com.instagram.android", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.facebook.katana", "com.facebook.lite",
            "com.twitter.android", "com.reddit.frontpage", "com.snapchat.android", "com.instagram.barcelona", "com.pinterest", "com.linkedin.android",
            "com.bereal.ft", "com.tumblr", "org.joinmastodon.android", "xyz.blueskyweb.app", "com.discord", "com.vkontakte.android"),
        "video" to setOf("com.google.android.youtube", "com.netflix.mediaclient", "tv.twitch.android.app", "com.disney.disneyplus", "com.amazon.avod.thirdpartyclient",
            "com.hbo.hbonow", "com.wbd.stream", "com.google.android.apps.youtube.kids", "com.zhiliaoapp.musically.go", "com.kick.mobile", "com.vimeo.android.videoapp"),
        "news" to setOf("com.google.android.apps.magazines", "flipboard.app", "com.bbc.news", "com.cnn.mobile.android.phone", "com.nytimes.android"),
        "shopping" to setOf("com.amazon.mShop.android.shopping", "com.einnovation.temu", "com.zzkko", "com.alibaba.aliexpresshd", "com.ebay.mobile", "com.shein.android"),
    )

    @Suppress("DEPRECATION") // FLAG_IS_GAME: older games set only this
    fun categoryOf(pkg: String, ai: android.content.pm.ApplicationInfo?): String {
        KNOWN.entries.firstOrNull { pkg in it.value }?.let { return it.key }
        if (ai == null) return ""
        return when (ai.category) {
            android.content.pm.ApplicationInfo.CATEGORY_GAME -> "games"
            android.content.pm.ApplicationInfo.CATEGORY_SOCIAL -> "social"
            android.content.pm.ApplicationInfo.CATEGORY_VIDEO -> "video"
            android.content.pm.ApplicationInfo.CATEGORY_NEWS -> "news"
            else -> if ((ai.flags and android.content.pm.ApplicationInfo.FLAG_IS_GAME) != 0) "games" else ""
        }
    }

    fun labelFor(context: Context, pkg: String): String = try {
        val pm = context.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString().take(60)
    } catch (e: Exception) {
        pkg
    }

    fun iconFor(context: Context, pkg: String): String {
        synchronized(iconCache) { iconCache[pkg] }?.let { return it }
        return try {
            encode(context.packageManager.getApplicationIcon(pkg)).also { synchronized(iconCache) { iconCache[pkg] = it } }
        } catch (e: Exception) {
            ""
        }
    }

    private fun encode(d: Drawable): String {
        val bmp = Bitmap.createBitmap(ICON_PX, ICON_PX, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        d.setBounds(0, 0, ICON_PX, ICON_PX)
        d.draw(c)
        val bytes = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 100, bytes)
        bmp.recycle()
        return "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
    }
}
