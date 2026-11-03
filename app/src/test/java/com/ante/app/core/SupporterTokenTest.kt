package com.ante.app.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Supporter codes: made by scripts/supporter-keys.mjs (WebCrypto), checked here (Java). */
class SupporterTokenTest {
    // The app's public key (res/values/supporter.xml) and a code the script made for Test.User@Gmail.com.
    private val pub = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEHSM6RZB728p4OoLFkLbbL0sIMSMkw26bbXvcZj3ChL2TDfKtQSwBJRqvIrQ18GMEGUvGON+BeZ89RSGyZRhIYw=="
    private val code = "ANTE--WG91yZsrln2BjUp6sKvfIFshx4JnhN4FsLlvoVY76Ur3vAoyTV-I0f63PHlPLWC19Kfp90FXQkOXAiSWKhUSw"
    private val key = SupporterToken.publicKey(pub)

    @Test fun aCodeWorksForItsEmail() {
        assertNotNull(key)
        assertTrue(SupporterToken.verify(key, "test.user@gmail.com", code))
        assertTrue(SupporterToken.verify(key, "  Test.User@Gmail.com ", " " + code.chunked(20).joinToString("\n") + " "))
    }

    @Test fun aCodeDoesNothingForAnotherEmail() {
        assertFalse(SupporterToken.verify(key, "friend@gmail.com", code))
        assertFalse(SupporterToken.verify(key, "", code))
    }

    @Test fun changedOrMadeUpCodesFail() {
        val body = code.removePrefix("ANTE-")
        val flipped = (if (body[10] == 'A') 'B' else 'A').let { body.substring(0, 10) + it + body.substring(11) }
        assertFalse(SupporterToken.verify(key, "test.user@gmail.com", flipped))
        assertFalse(SupporterToken.verify(key, "test.user@gmail.com", "ANTE-hello"))
        assertFalse(SupporterToken.verify(key, "test.user@gmail.com", ""))
        assertFalse(SupporterToken.verify(SupporterToken.publicKey("not a key"), "test.user@gmail.com", code))
    }

    @Test fun fingerprintIgnoresCaseAndSpaces() {
        assertEquals(SupporterToken.fingerprint("a@b.com"), SupporterToken.fingerprint(" A@B.com "))
        assertEquals(64, SupporterToken.fingerprint("a@b.com").length)
    }

    @Test fun derKeepsIntegersPositive() {
        val raw = ByteArray(64) { if (it == 0 || it == 32) 0x80.toByte() else 1 }
        val d = SupporterToken.der(raw)
        assertEquals(0x30, d[0].toInt()); assertEquals(0x02, d[2].toInt()); assertEquals(33, d[3].toInt()); assertEquals(0, d[4].toInt())
    }
}
