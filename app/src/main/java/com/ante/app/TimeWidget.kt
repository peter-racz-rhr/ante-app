package com.ante.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.RemoteViews
import com.ante.app.core.DotFont
import java.text.DateFormat
import java.util.Date

/**
 * Home-screen widget: the time left today across every limited app, drawn as a dot-matrix clock.
 * Refreshed when the time bank changes ([refresh], throttled) and every 30 minutes by Android.
 */
class TimeWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        Bank.init(context)
        ids.forEach { manager.updateAppWidget(it, views(context)) }
    }

    companion object {
        private const val THROTTLE_MS = 3_000L
        private const val LIT = 0xFFCDD6F4.toInt()
        private const val DIM = 0x22CDD6F4
        private var lastAt = 0L
        private var trailing = false
        private val handler by lazy { Handler(Looper.getMainLooper()) }

        /** Redraws every Ante widget, at most once every few seconds (a skipped change is drawn soon after). */
        fun refresh(context: Context, force: Boolean = false) {
            val now = SystemClock.elapsedRealtime()
            if (!force && now - lastAt < THROTTLE_MS) {
                if (!trailing) {
                    trailing = true
                    val app = context.applicationContext
                    handler.postDelayed({ trailing = false; refresh(app, force = true) }, THROTTLE_MS)
                }
                return
            }
            lastAt = now
            try {
                val manager = AppWidgetManager.getInstance(context) ?: return
                val ids = manager.getAppWidgetIds(ComponentName(context, TimeWidget::class.java))
                if (ids.isEmpty()) return
                val v = views(context)
                ids.forEach { manager.updateAppWidget(it, v) }
            } catch (e: Exception) {
                // A widget is never worth crashing over.
            }
        }

        private fun views(context: Context): RemoteViews {
            val now = Bank.now()
            val (left, focusEnd) = Bank.read { b -> b.state.limits.sumOf { it.leftSec.toLong() }.coerceAtMost(Int.MAX_VALUE.toLong()).toInt() to b.focusEndsAt(now) }
            val limited = Bank.read { it.state.limits.isNotEmpty() }
            val v = RemoteViews(context.packageName, R.layout.widget_time)
            v.setImageViewBitmap(R.id.widget_clock, draw(DotFont.clock(left)))
            val note = when {
                focusEnd > now -> context.getString(R.string.widget_focus_until, DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(focusEnd)))
                !limited -> context.getString(R.string.widget_no_limits)
                else -> context.getString(R.string.widget_left_today)
            }
            v.setTextViewText(R.id.widget_note, note)
            v.setContentDescription(R.id.widget_clock, context.getString(R.string.widget_clock_description, DotFont.clock(left)))
            val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            v.setOnClickPendingIntent(R.id.widget_root, open)
            return v
        }

        /** Draws [text] as round dots, with unlit dots faintly showing the grid like an LED panel. */
        private fun draw(text: String): Bitmap {
            val rows = DotFont.render(text)
            val cols = rows[0].size.coerceAtLeast(1)
            val cell = 14f; val r = cell * 0.4f
            val bmp = Bitmap.createBitmap((cols * cell).toInt(), (DotFont.ROWS * cell).toInt(), Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val on = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LIT }
            val off = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = DIM }
            rows.forEachIndexed { y, row ->
                row.forEachIndexed { x, lit -> c.drawCircle(x * cell + cell / 2, y * cell + cell / 2, r, if (lit) on else off) }
            }
            return bmp
        }
    }
}
