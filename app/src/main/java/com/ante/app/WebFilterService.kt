package com.ante.app

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import com.ante.app.core.DnsPacket
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors

/**
 * The website filter: a local VPN that only carries DNS. Android sends the phone's DNS questions
 * to a private address inside it (10.111.222.2); nothing else goes through it, so normal traffic
 * is untouched and nothing leaves the phone through Ante. Blocked names get "no such site";
 * every other question goes to the phone's usual DNS server and the answer comes straight back.
 */
class WebFilterService : VpnService() {
    private var tun: ParcelFileDescriptor? = null
    private var reader: Thread? = null
    private val pool = Executors.newFixedThreadPool(FORWARDERS)

    override fun onCreate() {
        super.onCreate()
        Bank.init(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { shutdown(); stopSelf(); return START_NOT_STICKY }
        WebFilter.load(this)
        if (!WebFilter.rules.on) { shutdown(); stopSelf(); return START_NOT_STICKY }
        if (tun == null) establish()
        return START_STICKY
    }

    private fun establish() {
        val b = Builder().setSession("Ante website filter")
            .addAddress(TUN_ADDR, 32)
            .addDnsServer(DNS_ADDR)
            .addRoute(DNS_ADDR, 32)
            .setBlocking(true)
        if (Build.VERSION.SDK_INT >= 29) b.setMetered(false)
        try { b.addDisallowedApplication(packageName) } catch (e: Exception) { /* our own lookups go direct */ }
        val fd = try { b.establish() } catch (e: Exception) { null } ?: run { stopSelf(); return }
        tun = fd
        running = true
        WebFilter.core(this) // load the lists before the first question
        val input = FileInputStream(fd.fileDescriptor)
        val output = FileOutputStream(fd.fileDescriptor)
        reader = Thread({ loop(input, output) }, "ante-web-filter").also { it.start() }
    }

    private fun loop(input: FileInputStream, output: FileOutputStream) {
        val buf = ByteArray(MAX_PACKET)
        while (!Thread.currentThread().isInterrupted) {
            val n = try { input.read(buf) } catch (e: Exception) { break }
            if (n <= 0) { if (n < 0) break else continue }
            val q = DnsPacket.parse(buf, n) ?: continue
            if (WebFilter.blocked(this, q.name)) {
                val nx = DnsPacket.nxdomain(q.dns) ?: continue
                write(output, DnsPacket.reply(q, nx))
            } else {
                try { pool.execute { forward(q, output) } } catch (e: Exception) { /* shutting down */ }
            }
        }
    }

    private fun forward(q: DnsPacket.Query, output: FileOutputStream) {
        try {
            DatagramSocket().use { s ->
                protect(s)
                s.soTimeout = UPSTREAM_TIMEOUT_MS
                val up = upstream()
                s.send(DatagramPacket(q.dns, q.dns.size, up, DnsPacket.DNS_PORT))
                val ans = ByteArray(MAX_PACKET)
                val p = DatagramPacket(ans, ans.size)
                s.receive(p)
                write(output, DnsPacket.reply(q, ans.copyOf(p.length)))
            }
        } catch (e: Exception) { /* no answer: the app asks again */ }
    }

    @Synchronized private fun write(out: FileOutputStream, pkt: ByteArray) {
        try { out.write(pkt) } catch (e: Exception) { /* tunnel closed */ }
    }

    /** The DNS server of the network underneath (Wi-Fi or mobile), else a public one. */
    @Suppress("DEPRECATION")
    private fun upstream(): InetAddress {
        val cm = getSystemService(ConnectivityManager::class.java)
        try {
            for (n in cm.allNetworks) {
                val caps = cm.getNetworkCapabilities(n) ?: continue
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue
                val dns = cm.getLinkProperties(n)?.dnsServers?.firstOrNull { !it.hostAddress.orEmpty().startsWith("10.111.222.") }
                if (dns != null) return dns
            }
        } catch (e: Exception) { /* fall back */ }
        return InetAddress.getByName(FALLBACK_DNS)
    }

    override fun onRevoke() {
        // Another VPN took over, or the user disconnected it. The watcher brings it back if needed.
        shutdown()
        super.onRevoke()
    }

    override fun onDestroy() {
        shutdown()
        pool.shutdownNow()
        super.onDestroy()
    }

    private fun shutdown() {
        running = false
        reader?.interrupt(); reader = null
        try { tun?.close() } catch (e: Exception) { /* already closed */ }
        tun = null
    }

    companion object {
        private const val ACTION_STOP = "com.ante.app.web.STOP"
        private const val TUN_ADDR = "10.111.222.1"
        private const val DNS_ADDR = "10.111.222.2"
        private const val FALLBACK_DNS = "1.1.1.1"
        private const val MAX_PACKET = 4096
        private const val FORWARDERS = 4
        private const val UPSTREAM_TIMEOUT_MS = 5000
        @Volatile var running = false; private set

        fun start(c: Context) {
            try { c.startService(Intent(c, WebFilterService::class.java)) } catch (e: Exception) { /* background start not allowed now: next resume */ }
        }

        fun stop(c: Context) {
            if (!running) return
            try { c.startService(Intent(c, WebFilterService::class.java).setAction(ACTION_STOP)) } catch (e: Exception) { /* not running */ }
        }
    }
}
