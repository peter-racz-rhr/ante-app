package com.ante.app

import android.content.Context
import android.provider.Telephony
import android.telecom.TelecomManager

/**
 * Apps Ante never covers, whatever limits say: the phone app, the messages app, emergency apps and
 * Ante itself. Someone must always be able to call or text for help.
 */
object Exempt {
    private val ALWAYS = setOf(
        "com.android.phone", "com.android.server.telecom", "com.android.emergency",
        "com.google.android.dialer", "com.samsung.android.dialer", "com.android.dialer",
        "com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms",
        "com.google.android.apps.safetyhub", "com.android.cellbroadcastreceiver", "com.google.android.cellbroadcastreceiver",
    )
    @Volatile private var cache: Set<String>? = null
    @Volatile private var cachedAt = 0L

    fun packages(context: Context): Set<String> {
        val now = System.currentTimeMillis()
        cache?.let { if (now - cachedAt < 60_000) return it }
        val c = context.applicationContext
        val dialer = try { (c.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)?.defaultDialerPackage } catch (e: Exception) { null }
        val sms = try { Telephony.Sms.getDefaultSmsPackage(c) } catch (e: Exception) { null }
        val set = ALWAYS + listOfNotNull(dialer, sms, c.packageName)
        cache = set; cachedAt = now
        return set
    }

    fun isExempt(context: Context, pkg: String) = pkg in packages(context)
}
