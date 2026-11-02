package com.ante.app.core

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId

/** The website filter: the domain list format, the DNS packets and the lock. */
class WebFilterTest {
    private val day = 24L * 60 * 60 * 1000
    private val budapest = ZoneId.of("Europe/Budapest")

    @Test fun hashMatchesTheBuildScript() {
        // Same numbers as scripts/build-blocklist.js prints for these names.
        assertEquals(0xcbf29ce484L, DomainSet.hash40(""))
        assertEquals(DomainSet.hash40("example.com"), DomainSet.hash40("example.com"))
        assertTrue(DomainSet.hash40("example.com") in 0 until (1L shl 40))
    }

    @Test fun encodeDecodeRoundTrip() {
        val names = listOf("pornhub.com", "www.xvideos.com", "Example.ORG.", "bad name", "a.b")
        val bytes = DomainSet.encode(names)
        val set = DomainSet.decode(bytes)!!
        assertEquals(4, set.size)
        assertTrue(set.containsExact("pornhub.com"))
        assertTrue(set.containsExact("xvideos.com"))
        assertTrue(set.containsExact("example.org"))
        assertFalse(set.containsExact("google.com"))
        assertTrue(set.matches("cdn.static.pornhub.com"))
        assertFalse(set.matches("notpornhub.org"))
    }

    @Test fun decodeRefusesBrokenFiles() {
        val good = DomainSet.encode(listOf("a.com", "b.com"))
        assertNull(DomainSet.decode(ByteArray(0)))
        assertNull(DomainSet.decode("NOTALIST".toByteArray()))
        assertNull(DomainSet.decode(good.copyOf(good.size - 1)))
        assertNull(DomainSet.decode(good + byteArrayOf(1)))
    }

    @Test fun normalizeAndInput() {
        assertEquals("reddit.com", Domains.fromInput("https://www.Reddit.com/r/all?x=1"))
        assertEquals("example.co.uk", Domains.fromInput("example.co.uk."))
        assertEquals("site.com", Domains.fromInput("user@site.com:8080/path"))
        assertNull(Domains.fromInput("localhost"))
        assertNull(Domains.fromInput("bad_domain..com"))
        assertNull(Domains.fromInput("-x.com"))
        assertEquals(listOf("a.b.c.com", "b.c.com", "c.com"), Domains.parents("a.b.c.com").toList())
    }

    @Test fun keywordRuleLeavesOrdinarySitesAlone() {
        assertTrue(Domains.adultWord("freeporn.example"))
        assertTrue(Domains.adultWord("onlyfans.com"))
        for (ok in listOf("google.com", "youtube.com", "reddit.com", "instagram.com", "ansporn.de", "pornic.fr", "wikipedia.org", "x.com", "discord.com", "essex.ac.uk"))
            assertFalse(ok, Domains.adultWord(ok))
    }

    @Test fun filterDecides() {
        val core = WebFilterCore(DomainSet.of(listOf("adultsite.com")), DomainSet.of(listOf("casino.example")))
        val r = WebRules(on = true, adult = true, gambling = false, custom = listOf("reddit.com"))
        assertTrue(core.blocked("www.adultsite.com.", r))
        assertTrue(core.blocked("old.reddit.com", r))
        assertFalse(core.blocked("casino.example", r))
        assertTrue(core.blocked("casino.example", r.copy(gambling = true)))
        assertFalse(core.blocked("google.com", r))
        assertFalse(core.blocked("adultsite.com", r.copy(on = false)))
        assertFalse(core.blocked("adultsite.com", r.copy(adult = false)))
    }

    @Test fun lockKeepsTheFilterOn() {
        val now = 1_000 * day
        val r = WebRules(on = true, adult = true).lock(now, now + 7 * day)!!
        assertTrue(r.isLocked(now))
        assertNull(r.change(r.copy(on = false), now, strict = false))
        assertNull(r.change(r.copy(adult = false), now, strict = false))
        assertNotNull(r.change(r.copy(gambling = true, custom = listOf("x.com")), now, strict = false))
        val later = r.change(r.copy(custom = listOf("x.com")), now, false)!!
        assertNull(later.change(later.copy(custom = emptyList()), now, false)) // removing a site loosens
        assertNotNull(r.change(r.copy(on = false), now + 7 * day, strict = false)) // over
        assertNull(r.lock(now, now + 40 * day)) // too long
        assertNull(r.lock(now, now - 1))
        assertEquals(now + 7 * day, r.lock(now, now + day)!!.lockUntilMs) // only gets longer
        // The lock can't be cleared through change().
        assertEquals(r.lockUntilMs, r.change(r.copy(lockUntilMs = 0, gambling = true), now, false)!!.lockUntilMs)
    }

    @Test fun strictFreezesLoosening() {
        val r = WebRules(on = true)
        assertNull(r.change(r.copy(on = false), 0, strict = true))
        assertNotNull(r.change(r.copy(on = false), 0, strict = false))
        assertNotNull(WebRules().change(r, 0, strict = true)) // turning on is fine
    }

    @Test fun noNutNovember() {
        val nov2 = java.time.ZonedDateTime.of(2026, 11, 2, 15, 0, 0, 0, budapest).toInstant().toEpochMilli()
        val dec1 = java.time.ZonedDateTime.of(2026, 12, 1, 0, 0, 0, 0, budapest).toInstant().toEpochMilli()
        assertEquals(dec1, WebRules.novemberEnd(nov2, budapest))
        assertNull(WebRules.novemberEnd(dec1, budapest))
        val r = WebRules().lock(nov2, dec1, nnn = true)!!
        assertTrue(r.on && r.adult)
        assertFalse(r.nnnDone(nov2))
        assertTrue(r.nnnDone(dec1))
    }

    private fun query(name: String, id: Int = 0x1234): ByteArray {
        val dns = java.io.ByteArrayOutputStream()
        dns.write(byteArrayOf((id ushr 8).toByte(), id.toByte(), 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 1))
        for (l in name.split('.')) { dns.write(l.length); dns.write(l.toByteArray()) }
        dns.write(0); dns.write(byteArrayOf(0, 1, 0, 1))
        dns.write(byteArrayOf(0, 0, 41, 0x10, 0, 0, 0, 0, 0, 0, 0)) // an EDNS record after the question
        return dns.toByteArray()
    }

    private fun ipUdp(payload: ByteArray, dstPort: Int = 53): ByteArray {
        val q = DnsPacket.Query(byteArrayOf(10, 111, 222.toByte(), 2), byteArrayOf(10, 111, 222.toByte(), 1), dstPort, 40000, payload, "")
        return DnsPacket.reply(q, payload) // from 10.111.222.1:40000 to 10.111.222.2:dstPort
    }

    @Test fun parsesADnsQuestion() {
        val pkt = ipUdp(query("WWW.Example.com"))
        val q = DnsPacket.parse(pkt, pkt.size)!!
        assertEquals("www.example.com", q.name)
        assertEquals(40000, q.srcPort)
        assertArrayEquals(byteArrayOf(10, 111, 222.toByte(), 1), q.src)
        assertNull(DnsPacket.parse(pkt, 10))
        val other = ipUdp(query("example.com"), dstPort = 443)
        assertNull(DnsPacket.parse(other, other.size))
    }

    @Test fun nxdomainAnswer() {
        val dns = query("blocked.example")
        val nx = DnsPacket.nxdomain(dns)!!
        assertEquals(0x12, nx[0].toInt()); assertEquals(0x34, nx[1].toInt())
        assertEquals(0x81, nx[2].toInt() and 0xff) // answer, recursion desired kept
        assertEquals(0x83, nx[3].toInt() and 0xff) // NXDOMAIN
        assertEquals(1, nx[5].toInt()); assertEquals(0, nx[11].toInt()) // no extra records
        assertEquals("blocked.example", DnsPacket.questionName(nx.copyOf().also { it[2] = 1 }))
        assertEquals(dns.size - 11, nx.size) // the EDNS record is dropped
        assertNull(DnsPacket.nxdomain(byteArrayOf(1, 2, 3)))
    }

    @Test fun replyChecksumsAreValid() {
        val pkt = ipUdp(query("example.com"))
        assertEquals(0, DnsPacket.checksum(pkt, 0, 20, 0)) // a valid header sums to zero
        var pseudo = 0L
        for (k in 12 until 20 step 2) pseudo += ((pkt[k].toInt() and 0xff) shl 8) or (pkt[k + 1].toInt() and 0xff)
        pseudo += 17 + (pkt.size - 20)
        assertEquals(0, DnsPacket.checksum(pkt, 20, pkt.size - 20, pseudo))
    }

    @Test fun malformedPacketsNeverThrow() {
        val rnd = java.util.Random(7)
        repeat(20_000) {
            val b = ByteArray(rnd.nextInt(80)); rnd.nextBytes(b)
            if (b.isNotEmpty()) b[0] = 0x45
            DnsPacket.parse(b, b.size)
            DnsPacket.nxdomain(b)
            DomainSet.decode(b)
        }
    }
}

/** The real lists in the app (built by scripts/build-blocklist.js). */
class BlocklistAssetTest {
    private fun asset(name: String): ByteArray? {
        val roots = listOfNotNull(System.getenv("ANTE_ASSETS"), "src/main/assets", "app/src/main/assets")
        return roots.map { java.io.File(it, "blocklist/$name") }.firstOrNull { it.isFile }?.readBytes()
    }

    @Test fun adultListBlocksTheBigSitesAndNothingOrdinary() {
        val bytes = asset("adult.bin"); org.junit.Assume.assumeNotNull(bytes)
        val adult = DomainSet.decode(bytes!!)!!
        assertTrue(adult.size > 500_000)
        val core = WebFilterCore(adult, DomainSet.EMPTY)
        val r = WebRules(on = true, adult = true)
        for (bad in listOf("pornhub.com", "www.xvideos.com", "xhamster.com", "xnxx.com", "onlyfans.com", "chaturbate.com", "cdn.pornhub.com"))
            assertTrue(bad, core.blocked(bad, r))
        for (ok in listOf("google.com", "www.google.com", "youtube.com", "reddit.com", "x.com", "instagram.com", "imgur.com", "tumblr.com",
                "discord.com", "wikipedia.org", "github.com", "netflix.com", "spotify.com", "amazon.com", "bbc.co.uk", "index.hu", "spiegel.de", "ko-fi.com"))
            assertFalse(ok, core.blocked(ok, r))
    }

    @Test fun gamblingListLoads() {
        val bytes = asset("gambling.bin"); org.junit.Assume.assumeNotNull(bytes)
        val g = DomainSet.decode(bytes!!)!!
        assertTrue(g.size > 1_000)
        assertFalse(g.matches("google.com"))
    }
}
