package com.example.gemini.ui.studio

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewAssetLoader

/* ================================================================
   CREATOR STUDIO — STATIC ENGINE (Achiva model)
   ----------------------------------------------------------------
   Studio ka poora web app APK ke assets/studio/ me bundled hai
   (Next.js static export). Koi Node server nahi, koi localhost
   nahi, koi boot wait nahi — WebViewAssetLoader virtual https se
   instant load. Saara data page ke IndexedDB me rehta hai (app
   update ke baad bhi preserve rehta hai).

   Agent (MCP studio_mcp) isi WebView ko StudioWebBridge se
   control karta hai — 18 studio_* tools.
   ================================================================ */

private const val STUDIO_URL = "https://appassets.androidplatform.net/assets/studio/index.html"

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun StudioScreen() {
    val context = LocalContext.current
    val screenBg = MaterialTheme.colorScheme.background

    var canGoBack by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var mainFrameError by remember { mutableStateOf(false) }

    val assetLoader = remember {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()
    }

    val webView = remember {
        WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            settings.javaScriptEnabled = true
            // Studio ka saara data IndexedDB + localStorage me — domStorage zaroori
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            // Studio dark-themed hai — pehle frame se hi kaala, white flash nahi
            setBackgroundColor(android.graphics.Color.parseColor("#0F0F0F"))
            CookieManager.getInstance().setAcceptCookie(true)
            // Studio Agent Bridge: MCP (studio_mcp) isi WebView ko control karta hai
            addJavascriptInterface(StudioWebBridge.jsHooks, "StudioBridge")
            StudioWebBridge.attach(this)

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    // Static assets APK ke andar bundled assets/studio/ se serve hote hain
                    return try {
                        assetLoader.shouldInterceptRequest(request.url)
                    } catch (_: Exception) {
                        null
                    }
                }

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    // sab navigations WebView ke andar hi
                    return false
                }

                override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
                    isLoading = true
                }

                override fun onPageFinished(view: WebView, url: String?) {
                    isLoading = false
                }

                override fun doUpdateVisitedHistory(
                    view: WebView,
                    url: String?,
                    isReload: Boolean
                ) {
                    canGoBack = view.canGoBack()
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError
                ) {
                    if (request.isForMainFrame) mainFrameError = true
                }
            }
            loadUrl(STUDIO_URL)
        }
    }

    // Andar ki web history ho to pehle web back, warna MainActivity ka
    // BackHandler (CHAT par wapas) chalta hai.
    BackHandler(enabled = canGoBack) {
        webView.goBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(screenBg)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            AndroidView(
                factory = { webView },
                modifier = Modifier.fillMaxSize()
            )

            if (isLoading && !mainFrameError) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                )
            }

            if (mainFrameError) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(screenBg),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Text(
                            text = "Creator Studio load nahi ho paya",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Dobara try karein — agar problem bane to app ko restart karein.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(20.dp))
                        Button(onClick = {
                            mainFrameError = false
                            isLoading = true
                            webView.reload()
                        }) {
                            Text("Dobara try karein")
                        }
                    }
                }
            }
        }
    }
}
