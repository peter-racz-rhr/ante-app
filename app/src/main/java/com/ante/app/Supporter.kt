package com.ante.app

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONObject

/**
 * Ante Supporter: one Google Play purchase that unlocks looks only (themes, clock fonts, table
 * skins, a badge), plus three one-off tips. Nothing that blocks or protects you is ever paid.
 *
 * There is no server, so the purchase is checked on the phone with Play's own records and kept in
 * private storage. That's enough for cosmetics. Debug builds unlock everything for testing.
 */
object Supporter {
    const val SUPPORTER = "ante_supporter"
    val TIPS = listOf("ante_tip_small", "ante_tip_medium", "ante_tip_large")
    private val ALL = listOf(SUPPORTER) + TIPS

    private const val PREFS = "ante_supporter"
    private const val KEY = "supporter"

    private var client: BillingClient? = null
    private var ready = false
    private val details = mutableMapOf<String, ProductDetails>()
    private var app: Context? = null

    /** Told about purchases as JSON: {ok, product, supporter, error}. Set by the page's bridge. */
    var onResult: ((String) -> Unit)? = null

    fun isSupporter(context: Context): Boolean =
        isDebug(context) || context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY, false)

    private fun isDebug(context: Context) = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    /** Connects to Google Play (once) and refreshes prices and owned purchases. */
    fun connect(context: Context) {
        val c = context.applicationContext
        app = c
        if (client?.isReady == true) { refresh(); return }
        val bc = BillingClient.newBuilder(c)
            .setListener { result, purchases -> onPurchases(result, purchases) }
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()
        client = bc
        bc.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                ready = result.responseCode == BillingClient.BillingResponseCode.OK
                if (ready) refresh()
            }
            override fun onBillingServiceDisconnected() { ready = false }
        })
    }

    private fun refresh() {
        val bc = client ?: return
        val products = ALL.map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
        }
        bc.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build()) { result, found ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                synchronized(details) { found.productDetailsList.forEach { details[it.productId] = it } }
            }
        }
        restore()
    }

    /** Re-reads what this Google account owns (after a reinstall or on a new phone). */
    fun restore() {
        val bc = client ?: return
        bc.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) return@queryPurchasesAsync
            val owns = purchases.any { SUPPORTER in it.products && it.purchaseState == Purchase.PurchaseState.PURCHASED }
            if (owns) setSupporter(true)
            purchases.forEach { handle(it, announce = false) }
        }
    }

    /** Status for the page: is billing available, is this phone a supporter, and the local prices. */
    fun status(context: Context): JSONObject {
        val prices = JSONObject()
        synchronized(details) { details.forEach { (id, d) -> d.oneTimePurchaseOfferDetails?.formattedPrice?.let { prices.put(id, it) } } }
        return JSONObject().put("available", ready && prices.length() > 0).put("supporter", isSupporter(context)).put("prices", prices)
    }

    /** Opens Google Play's purchase sheet for [productId]. False when billing isn't ready. */
    fun buy(activity: Activity, productId: String): Boolean {
        val bc = client ?: return false
        if (productId !in ALL || !ready) return false
        val d = synchronized(details) { details[productId] } ?: return false
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()))
            .build()
        return bc.launchBillingFlow(activity, params).responseCode == BillingClient.BillingResponseCode.OK
    }

    private fun onPurchases(result: BillingResult, purchases: List<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.forEach { handle(it, announce = true) }
            BillingClient.BillingResponseCode.USER_CANCELED -> say(JSONObject().put("ok", false).put("error", "cancelled"))
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> { restore(); say(JSONObject().put("ok", true).put("product", SUPPORTER).put("supporter", true)) }
            else -> say(JSONObject().put("ok", false).put("error", "failed"))
        }
    }

    /** Acknowledges the Supporter purchase (or Play refunds it after 3 days) and consumes tips so they can be bought again. */
    private fun handle(p: Purchase, announce: Boolean) {
        val bc = client ?: return
        if (p.purchaseState == Purchase.PurchaseState.PENDING) {
            if (announce) say(JSONObject().put("ok", false).put("error", "pending"))
            return
        }
        if (p.purchaseState != Purchase.PurchaseState.PURCHASED) return
        val product = p.products.firstOrNull() ?: return
        if (product == SUPPORTER) {
            setSupporter(true)
            if (!p.isAcknowledged) bc.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { }
        } else if (product in TIPS) {
            bc.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { _, _ -> }
        }
        if (announce) say(JSONObject().put("ok", true).put("product", product).put("supporter", app?.let { isSupporter(it) } ?: false))
    }

    private fun setSupporter(on: Boolean) {
        app?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)?.edit()?.putBoolean(KEY, on)?.apply()
    }

    private fun say(o: JSONObject) { onResult?.invoke(o.toString()) }
}
