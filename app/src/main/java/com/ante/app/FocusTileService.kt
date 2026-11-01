package com.ante.app

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * Quick Settings tile: tap to start a 25-minute Focus. While Focus runs the tile shows as on, and a
 * tap opens Ante instead (ending Focus early still needs the 30-second wait there).
 */
class FocusTileService : TileService() {
    override fun onStartListening() {
        super.onStartListening()
        Bank.init(this)
        paint()
    }

    override fun onClick() {
        super.onClick()
        Bank.init(this)
        val now = Bank.now()
        if (Bank.read { it.isFocus(now) }) { openAnte(); return }
        Bank.editAt { b, t -> b.startFocus(t, QUICK_FOCUS_MS) }
        AppWatcherService.instance?.scheduleExpiry()
        TimeWidget.refresh(this, force = true)
        paint()
    }

    private fun paint() {
        val tile = qsTile ?: return
        val now = Bank.now()
        val end = Bank.read { it.focusEndsAt(now) }
        tile.state = if (end > now) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
        if (Build.VERSION.SDK_INT >= 29) tile.subtitle = if (end > now) getString(R.string.tile_minutes_left, ((end - now) / 60_000L).coerceAtLeast(1).toInt()) else getString(R.string.tile_quick)
        tile.updateTile()
    }

    private fun openAnte() {
        val intent = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (Build.VERSION.SDK_INT >= 34) {
            startActivityAndCollapse(PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE))
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }

    companion object {
        private const val QUICK_FOCUS_MS = 25 * 60_000L
    }
}
