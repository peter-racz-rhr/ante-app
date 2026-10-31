package com.ante.app

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.provider.MediaStore
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebView

/** Ante's own screen: today's limits, the app picker and the tables. */
class MainActivity : Activity() {
    private var web: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Bank.init(this)
        web = WebHost.attach(this, mode = "main")
        GoogleAuth.onPhoto = { runOnUiThread { accountChanged(null) } }
    }

    /** Android's photo picker (no storage permission needed), or the file picker on older phones. */
    fun pickPhoto() {
        val pick = if (Build.VERSION.SDK_INT >= 33) {
            Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*")
        } else {
            Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE)
        }
        try {
            @Suppress("DEPRECATION")
            startActivityForResult(pick, REQ_PHOTO)
        } catch (e: Exception) {
            accountChanged("This phone has no app for picking photos.")
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQ_PHOTO) return
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) return
        val app = applicationContext
        Thread({
            val photo = Photo.fromUri(app, uri)
            if (photo != null) Account.setPhoto(app, photo)
            runOnUiThread { accountChanged(if (photo == null) "Couldn't read that picture. Try another one." else null) }
        }, "ante-photo").start()
    }

    /** Tells the page the account changed; [error] is shown as a message when set. */
    private fun accountChanged(error: String?) {
        val arg = if (error == null) "null" else org.json.JSONObject.quote(error)
        web?.evaluateJavascript("window.anteAccountChanged && window.anteAccountChanged($arg)", null)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // Dialogs, the keyboard and the Google sheet can bring the bars back; hide them again.
        if (hasFocus) WebHost.immersive(this)
    }

    override fun onResume() {
        super.onResume()
        // Coming back from Settings or from a limited app: show fresh numbers and permission state.
        WebHost.refresh(web)
        // Look for a newer UI; the page decides when to switch (never in the middle of a round).
        Ota.checkAsync(this) { v -> web?.evaluateJavascript("window.anteUpdateReady && window.anteUpdateReady($v)", null) }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val w = web
        if (w == null) {
            @Suppress("DEPRECATION")
            super.onBackPressed()
            return
        }
        // Let the page close a sheet or leave a table first; finish only when it has nothing to close.
        w.evaluateJavascript("window.anteBack ? window.anteBack() : false") { handled ->
            if (handled != "true") finish()
        }
    }

    override fun onDestroy() {
        GoogleAuth.onPhoto = null
        web?.let { (it.parent as? ViewGroup)?.removeView(it); it.destroy() }
        web = null
        super.onDestroy()
    }

    companion object {
        private const val REQ_PHOTO = 41
    }
}
