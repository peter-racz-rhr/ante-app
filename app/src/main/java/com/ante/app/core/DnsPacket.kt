package com.ante.app.core

/**
 * The few bits of IPv4, UDP and DNS the website filter needs. Android hands the filter raw IPv4
 * packets for its private DNS address; each one is a DNS question. Blocked names get an
 * NXDOMAIN ("no such site") answer, everything else is forwarded to the phone's real DNS server.
 */
object DnsPacket {
    const val DNS_PORT = 53
    private const val UDP = 17
    private const val IP_HEADER = 20
    private const val UDP_HEADER = 8
    private const val DNS_HEADER = 12

    /** One DNS question as it arrived: addresses, ports, the DNS message and the name asked for. */
    class Query(val src: ByteArray, val dst: ByteArray, val srcPort: Int, val dstPort: Int, val dns: ByteArray, val name: String)

    private fun u16(b: ByteArray, i: Int) = ((b[i].toInt() and 0xff) shl 8) or (b[i + 1].toInt() and 0xff)

    /** Parses an IPv4/UDP packet sent to port 53; null for anything else. */
    fun parse(pkt: ByteArray, len: Int): Query? {
        if (len < IP_HEADER + UDP_HEADER + DNS_HEADER || len > pkt.size) return null
        if ((pkt[0].toInt() ushr 4) != 4) return null
        val ihl = (pkt[0].toInt() and 0x0f) * 4
        if (ihl < IP_HEADER || pkt[9].toInt() != UDP) return null
        val total = minOf(u16(pkt, 2), len)
        val flags = u16(pkt, 6)
        if (flags and 0x3fff != 0) return null // fragments: not a plain DNS question
        val u = ihl
        if (total < u + UDP_HEADER + DNS_HEADER) return null
        val dstPort = u16(pkt, u + 2)
        if (dstPort != DNS_PORT) return null
        val udpLen = u16(pkt, u + 4)
        val end = minOf(total, u + udpLen)
        if (end < u + UDP_HEADER + DNS_HEADER) return null
        val dns = pkt.copyOfRange(u + UDP_HEADER, end)
        val name = questionName(dns) ?: return null
        return Query(pkt.copyOfRange(12, 16), pkt.copyOfRange(16, 20), u16(pkt, u), dstPort, dns, name)
    }

    /** The name in the first question (lower case, no trailing dot), or null if malformed. */
    fun questionName(dns: ByteArray): String? = question(dns)?.first

    /** (name, offset just after the question) for the first question. */
    private fun question(dns: ByteArray): Pair<String, Int>? {
        if (dns.size < DNS_HEADER || u16(dns, 4) < 1) return null
        if (dns[2].toInt() and 0x80 != 0) return null // an answer, not a question
        val sb = StringBuilder()
        var i = DNS_HEADER
        while (true) {
            if (i >= dns.size) return null
            val n = dns[i].toInt() and 0xff
            if (n == 0) { i++; break }
            if (n and 0xc0 != 0 || n > 63 || i + 1 + n > dns.size) return null // no compression in questions
            if (sb.isNotEmpty()) sb.append('.')
            for (k in 1..n) sb.append((dns[i + k].toInt() and 0xff).toChar())
            i += 1 + n
            if (sb.length > 253) return null
        }
        if (i + 4 > dns.size) return null // type and class
        return sb.toString().lowercase() to (i + 4)
    }

    /** "No such site" for the question in [dns]: same id and question, no answers. */
    fun nxdomain(dns: ByteArray): ByteArray? {
        val end = question(dns)?.second ?: return null
        val out = dns.copyOfRange(0, end)
        out[2] = ((dns[2].toInt() and 0x79) or 0x80).toByte() // QR = 1, keep opcode and RD, AA = 0, TC = 0
        out[3] = 0x83.toByte() // RA = 1, RCODE = 3 (NXDOMAIN)
        out[4] = 0; out[5] = 1 // one question
        for (k in 6 until 12) out[k] = 0 // no answers, authority or extra records
        return out
    }

    /** An IPv4/UDP packet carrying [payload] back from [q]'s destination to its source. */
    fun reply(q: Query, payload: ByteArray): ByteArray {
        val total = IP_HEADER + UDP_HEADER + payload.size
        val p = ByteArray(total)
        p[0] = 0x45; p[2] = (total ushr 8).toByte(); p[3] = total.toByte()
        p[6] = 0x40 // don't fragment
        p[8] = 64; p[9] = UDP.toByte()
        System.arraycopy(q.dst, 0, p, 12, 4); System.arraycopy(q.src, 0, p, 16, 4)
        val ck = checksum(p, 0, IP_HEADER, 0)
        p[10] = (ck ushr 8).toByte(); p[11] = ck.toByte()
        val u = IP_HEADER
        p[u] = (q.dstPort ushr 8).toByte(); p[u + 1] = q.dstPort.toByte()
        p[u + 2] = (q.srcPort ushr 8).toByte(); p[u + 3] = q.srcPort.toByte()
        val udpLen = UDP_HEADER + payload.size
        p[u + 4] = (udpLen ushr 8).toByte(); p[u + 5] = udpLen.toByte()
        System.arraycopy(payload, 0, p, u + UDP_HEADER, payload.size)
        // UDP checksum over the pseudo header (addresses, protocol, length) and the datagram.
        var pseudo = 0L
        for (k in 12 until 20 step 2) pseudo += u16(p, k)
        pseudo += UDP + udpLen
        var uc = checksum(p, u, udpLen, pseudo)
        if (uc == 0) uc = 0xffff
        p[u + 6] = (uc ushr 8).toByte(); p[u + 7] = uc.toByte()
        return p
    }

    /** The Internet checksum (ones' complement sum of 16-bit words) of [len] bytes from [off]. */
    fun checksum(b: ByteArray, off: Int, len: Int, start: Long): Int {
        var sum = start
        var i = off
        while (i + 1 < off + len) { sum += u16(b, i); i += 2 }
        if (i < off + len) sum += (b[i].toInt() and 0xff) shl 8
        while (sum ushr 16 != 0L) sum = (sum and 0xffff) + (sum ushr 16)
        return (sum.inv() and 0xffff).toInt()
    }
}
