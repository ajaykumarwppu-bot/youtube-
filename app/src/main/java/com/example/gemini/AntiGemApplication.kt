package com.example.gemini

import android.app.Application
import com.example.gemini.data.adb.AdbConnectManager
import com.example.gemini.data.updater.PluginUpdateCheckWorker
import com.example.gemini.data.updater.UpdateCheckWorker

class AntiGemApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        UpdateCheckWorker.schedule(this)
        PluginUpdateCheckWorker.schedule(this)
        // Reconnects adb when Wireless debugging turns back on (it gets a new port every time)
        AdbConnectManager.init(this)
        // Telemetry completely disabled — ye independent Creator Studio build hai,
        // koi bhi analytics/telemetry kisi ko send nahi hota.
    }
}
