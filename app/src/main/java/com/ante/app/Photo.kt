package com.ante.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Profile pictures: whatever the user picks (or their Google photo) becomes a small square JPEG
 * stored as a data URL, so the page can show it without file or network access.
 */
object Photo {
    private const val SIZE = 256
    private const val MAX_INPUT = 25L * 1024 * 1024
    private const val MAX_REMOTE = 3L * 1024 * 1024

    /** Reads a picked image (content:// from the photo picker). Null if it can't be read as an image. */
    fun fromUri(c: Context, uri: Uri): String? = try {
        val bytes = c.contentResolver.openInputStream(uri)?.use { readCapped(it, MAX_INPUT) } ?: return null
        fromBytes(bytes)
    } catch (e: Exception) {
        null
    }

    /** Downloads the Google account photo (HTTPS only, small). Runs on a background thread. */
    fun fromGoogle(url: String): String? = try {
        // Ask Google for a picture about our size instead of the default 96 px.
        val sized = url.replace(Regex("=s\\d+(-c)?$"), "=s${SIZE}-c")
        val u = URL(sized)
        require(u.protocol == "https")
        val conn = u.openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000; conn.readTimeout = 10_000
        try {
            if (conn.responseCode != 200) null
            else conn.inputStream.use { fromBytes(readCapped(it, MAX_REMOTE)) }
        } finally {
            conn.disconnect()
        }
    } catch (e: Exception) {
        null
    }

    fun fromBytes(bytes: ByteArray): String? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= SIZE) sample *= 2
        val raw = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return null
        val upright = rotate(raw, orientation(bytes))
        val side = minOf(upright.width, upright.height)
        val square = Bitmap.createBitmap(upright, (upright.width - side) / 2, (upright.height - side) / 2, side, side)
        val scaled = Bitmap.createScaledBitmap(square, SIZE, SIZE, true)
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 86, out)
        return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    private fun orientation(bytes: ByteArray): Int = try {
        ExifInterface(bytes.inputStream()).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
    }

    private fun rotate(b: Bitmap, o: Int): Bitmap {
        val m = Matrix()
        when (o) {
            ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
            else -> return b
        }
        return Bitmap.createBitmap(b, 0, 0, b.width, b.height, m, true)
    }

    private fun readCapped(input: java.io.InputStream, max: Long): ByteArray {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(16 * 1024)
        while (true) {
            val n = input.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
            if (out.size() > max) throw IllegalStateException("too large")
        }
        return out.toByteArray()
    }
}
