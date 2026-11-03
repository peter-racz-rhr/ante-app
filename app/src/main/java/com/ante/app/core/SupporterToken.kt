package com.ante.app.core

import java.security.KeyFactory
import java.security.MessageDigest
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

/**
 * Proof that someone is an Ante Supporter: an ECDSA P-256 signature, made with Péter's private key,
 * over "ante-supporter:v1:" + the SHA-256 of their lower-cased email. The supporter server signs
 * it after a Ko-fi donation, and scripts/supporter-code.mjs makes the same token by hand. The app
 * only holds the public key, so nobody can make a token, and a token only works for its own email.
 */
object SupporterToken {
    private const val PREFIX = "ante-supporter:v1:"
    private const val RAW_SIG = 64 // r and s, 32 bytes each (WebCrypto's format)

    /** SHA-256 of the trimmed, lower-cased email, as hex. */
    fun fingerprint(email: String): String =
        MessageDigest.getInstance("SHA-256").digest(email.trim().lowercase().toByteArray()).joinToString("") { "%02x".format(it) }

    fun publicKey(spkiBase64: String): PublicKey? = try {
        KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(Base64.getDecoder().decode(spkiBase64.trim())))
    } catch (e: Exception) { null }

    /** True when [token] (base64url, raw r‖s) is a valid signature for [email]. */
    fun verify(key: PublicKey?, email: String, token: String): Boolean {
        if (key == null || email.isBlank()) return false
        val raw = try { Base64.getUrlDecoder().decode(clean(token)) } catch (e: Exception) { return false }
        if (raw.size != RAW_SIG) return false
        return try {
            Signature.getInstance("SHA256withECDSA").run {
                initVerify(key)
                update((PREFIX + fingerprint(email)).toByteArray())
                verify(der(raw))
            }
        } catch (e: Exception) { false }
    }

    /** What people paste: spaces, line breaks and the "ANTE-" in front are ignored. */
    fun clean(token: String): String = token.filterNot { it.isWhitespace() }.removePrefix("ANTE-")

    /** r‖s (64 bytes) → the DER SEQUENCE { INTEGER r, INTEGER s } that Java's verifier wants. */
    fun der(raw: ByteArray): ByteArray {
        fun int(b: ByteArray): ByteArray {
            var v = b.dropWhile { it == 0.toByte() }.toByteArray()
            if (v.isEmpty()) v = byteArrayOf(0)
            if (v[0].toInt() and 0x80 != 0) v = byteArrayOf(0) + v
            return byteArrayOf(0x02, v.size.toByte()) + v
        }
        val body = int(raw.copyOfRange(0, 32)) + int(raw.copyOfRange(32, 64))
        return byteArrayOf(0x30, body.size.toByte()) + body
    }
}
