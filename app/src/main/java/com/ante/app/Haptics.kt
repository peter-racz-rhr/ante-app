package com.ante.app

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Vibration for the UI, played on the vibrator directly. View.performHapticFeedback is skipped
 * entirely on phones where "touch feedback" is switched off (the default on many Xiaomi and
 * Samsung phones), so Ante's own Vibration switch is the only thing that decides.
 */
object Haptics {
    private const val MIN_GAP_MS = 35L // roulette and reel ticks come fast; don't blur them together
    @Volatile private var lastAt = 0L

    private fun vibrator(c: Context): Vibrator? {
        val v = if (Build.VERSION.SDK_INT >= 31) {
            (c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            c.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
        return v?.takeIf { it.hasVibrator() }
    }

    /** Plays [kind] ("tap", "tick", "win", "loss"). Returns false when the phone has no vibrator. */
    fun play(c: Context, kind: String): Boolean {
        val v = vibrator(c) ?: return false
        val now = SystemClock.uptimeMillis()
        if (kind == "tick" && now - lastAt < MIN_GAP_MS) return true
        lastAt = now
        val amp = v.hasAmplitudeControl()
        val effect = when (kind) {
            "tick" -> VibrationEffect.createOneShot(if (amp) 10 else 14, if (amp) 90 else VibrationEffect.DEFAULT_AMPLITUDE)
            "win" -> waveform(longArrayOf(0, 28, 70, 32, 70, 60), intArrayOf(0, 170, 0, 210, 0, 255), amp)
            "loss" -> waveform(longArrayOf(0, 70, 90, 140), intArrayOf(0, 220, 0, 110), amp)
            else -> VibrationEffect.createOneShot(if (amp) 16 else 20, if (amp) 150 else VibrationEffect.DEFAULT_AMPLITUDE)
        }
        return try {
            v.vibrate(effect)
            true
        } catch (e: Exception) {
            false
        }
    }

    /** A rhythm; without amplitude control the quiet steps are dropped and the rest play at full strength. */
    private fun waveform(timings: LongArray, amps: IntArray, amp: Boolean): VibrationEffect =
        if (amp) VibrationEffect.createWaveform(timings, amps, -1)
        else VibrationEffect.createWaveform(timings, -1) // off/on/off/on… timings, default strength
}
