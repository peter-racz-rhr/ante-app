package com.ante.app.core

/**
 * A big set of domains (the adult-site list has about a million) kept small: each domain is a
 * 40-bit FNV-1a hash, sorted, stored as varint gaps (scripts/build-blocklist.js writes the file).
 * About 3 MB on disk and 8 MB in memory. Two different domains share a hash about once in a
 * million lookups, which only means a rare extra block, never a missed one.
 */
class DomainSet private constructor(private val hashes: LongArray) {
    val size: Int get() = hashes.size

    /** Exactly this name (already normalised). */
    fun containsExact(name: String): Boolean = hashes.isNotEmpty() && hashes.binarySearch(hash40(name)) >= 0

    /** The name or any parent domain of it ("a.b.example.com" matches "example.com"). */
    fun matches(name: String): Boolean = Domains.parents(name).any { containsExact(it) }

    companion object {
        val EMPTY = DomainSet(LongArray(0))
        private val MAGIC = "ANTEBL1\n".toByteArray(Charsets.US_ASCII)
        private const val MAX_ENTRIES = 5_000_000
        private val FNV_OFFSET = 0xcbf29ce484222325uL.toLong()
        private const val FNV_PRIME = 0x100000001b3L

        /** FNV-1a (64 bit) of the UTF-8 bytes, top 40 bits. */
        fun hash40(s: String): Long {
            var h = FNV_OFFSET
            for (b in s.toByteArray(Charsets.UTF_8)) { h = h xor (b.toLong() and 0xff); h *= FNV_PRIME }
            return h ushr 24
        }

        fun of(names: Collection<String>): DomainSet =
            DomainSet(names.mapNotNull { Domains.normalize(it) }.map { hash40(it) }.distinct().sorted().toLongArray())

        /** Reads the file format; anything malformed gives null (the filter then uses the keyword rule only). */
        fun decode(bytes: ByteArray): DomainSet? {
            if (bytes.size < MAGIC.size || !bytes.copyOfRange(0, MAGIC.size).contentEquals(MAGIC)) return null
            var i = MAGIC.size
            fun varint(): Long {
                var out = 0L; var shift = 0
                while (true) {
                    if (i >= bytes.size || shift > 56) throw IllegalArgumentException("truncated")
                    val b = bytes[i++].toInt() and 0xff
                    out = out or ((b and 0x7f).toLong() shl shift)
                    if (b and 0x80 == 0) return out
                    shift += 7
                }
            }
            return try {
                val n = varint()
                if (n < 0 || n > MAX_ENTRIES) return null
                val out = LongArray(n.toInt())
                var last = 0L
                for (k in 0 until n.toInt()) { last += varint(); out[k] = last }
                if (i != bytes.size) null else DomainSet(out)
            } catch (e: IllegalArgumentException) { null }
        }

        /** The file format (used by tests; the build script writes the same bytes). */
        fun encode(names: Collection<String>): ByteArray {
            val sorted = names.mapNotNull { Domains.normalize(it) }.map { hash40(it) }.distinct().sorted()
            val out = java.io.ByteArrayOutputStream()
            out.write(MAGIC)
            fun varint(v: Long) { var x = v; while (x >= 0x80) { out.write(((x and 0x7f) or 0x80).toInt()); x = x ushr 7 }; out.write(x.toInt()) }
            varint(sorted.size.toLong())
            var last = 0L
            for (h in sorted) { varint(h - last); last = h }
            return out.toByteArray()
        }
    }
}

/** Domain names: cleaning what people type, parents, and the keyword rule for adult sites. */
object Domains {
    private val LABEL = Regex("^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$")
    const val MAX_CUSTOM = 200

    /** Lower case, no trailing dot, no "www."; null when it isn't a valid host name. */
    fun normalize(raw: String): String? {
        var s = raw.trim().lowercase().trimEnd('.')
        if (s.startsWith("www.")) s = s.removePrefix("www.")
        if (s.isEmpty() || s.length > 253) return null
        val labels = s.split('.')
        if (labels.size < 2 || labels.any { !LABEL.matches(it) }) return null
        return s
    }

    /** What someone typed ("https://www.Reddit.com/r/x", "reddit.com") as a domain, or null. */
    fun fromInput(raw: String): String? {
        var s = raw.trim()
        s = s.substringAfter("://", s)
        s = s.substringBefore('/').substringBefore('?').substringBefore('#').substringAfterLast('@').substringBefore(':')
        return normalize(s)
    }

    /** "a.b.example.com" → a.b.example.com, b.example.com, example.com (never the bare TLD). */
    fun parents(name: String): Sequence<String> = sequence {
        var s = name
        while (s.count { it == '.' } >= 1) {
            yield(s)
            s = s.substringAfter('.')
        }
    }

    /** Words that only show up in adult-site names. Kept short so ordinary sites never match. */
    val ADULT_WORDS = listOf(
        "porn", "hentai", "xvideos", "xnxx", "xhamster", "redtube", "youporn", "brazzers", "chaturbate",
        "onlyfans", "stripchat", "camsoda", "bongacams", "livejasmin", "rule34", "nhentai", "spankbang",
        "fapello", "erome", "motherless", "xxx",
    )

    /** Ordinary words and places that contain one of the above ("Ansporn" is German, Pornic a French town). */
    private val NOT_ADULT = listOf("ansporn", "sporn", "pornic")

    fun adultWord(name: String): Boolean = ADULT_WORDS.any { name.contains(it) } && NOT_ADULT.none { name.contains(it) }
}
