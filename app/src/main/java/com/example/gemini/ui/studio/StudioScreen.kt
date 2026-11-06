package com.example.gemini.ui.studio

import android.annotation.SuppressLint
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.SmartDisplay
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.gemini.data.studio.StudioServerManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Studio screen ke UI states. */
private sealed interface StudioState {
    data object Loading : StudioState
    data class Ready(val url: String) : StudioState
    data class Error(val message: String, val tail: List<String>) : StudioState
}

/** Page load ke baad WebView ka Chrome version + DOM status nikaalne wala probe (phone par). */
private const val DOM_PROBE_JS =
    "(function(){try{" +
        "var m=navigator.userAgent.match(/Chrome\\/(\\d+)/);" +
        "var b=document.body;" +
        "return JSON.stringify({" +
        "chrome:m?m[1]:\"?\"," +
        "ready:document.readyState," +
        "kids:b?b.children.length:-1," +
        "textLen:b?b.innerText.replace(/\\s+/g,\"\").length:-1});" +
        "}catch(e){return JSON.stringify({probeErr:String(e&&e.message||e)})}})()"

/**
 * Creator Studio screen — local Node server (127.0.0.1) par chalne wala
 * pura Studio web app ek WebView me. Server spawn + health check sab
 * background (IO) par hota hai; UI sirf teen states dikhata hai:
 * Loading / Ready (WebView) / Error (message + log tail + Retry).
 */
@Composable
fun StudioScreen(
    isVisible: Boolean,
    onClose: () -> Unit
) {
    val context = LocalContext.current

    var state by remember { mutableStateOf<StudioState>(StudioState.Loading) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var webview by remember { mutableStateOf<WebView?>(null) }

    // Renderer-crash recovery: phone par WebView ka render process crash ho jaye to
    // naya WebView banake khud recover karo (2 baar GPU mode, phir software mode).
    var webViewEpoch by remember { mutableIntStateOf(0) }
    var crashRecoveries by remember { mutableIntStateOf(0) }

    // Black-screen debugging: WebView ke JS console errors + load failures yahan capture
    // hote hain — top bar ke "JS Log" chip se phone par hi dikh jaate hain.
    var jsLog by remember { mutableStateOf<List<String>>(emptyList()) }
    var showJsLog by remember { mutableStateOf(false) }
    fun pushJsLog(line: String) {
        val stamped = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.US).format(java.util.Date()) + "  " + line
        jsLog = (jsLog + stamped).takeLast(30)
    }

    // Server ensure — sirf tab jab screen visible ho; har attempt naya coroutine (IO par)
    LaunchedEffect(isVisible, reloadKey) {
        if (!isVisible) return@LaunchedEffect
        state = StudioState.Loading
        val result = withContext(Dispatchers.IO) {
            runCatching { StudioServerManager.ensureServer(context) }
        }
        state = result.fold(
            onSuccess = { StudioState.Ready(StudioServerManager.serverUrl()) },
            onFailure = { StudioState.Error(it.message ?: "Unknown error", StudioServerManager.logTailSnapshot()) }
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // ── Top bar ─────────────────────────────────────────────────────────
        Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Outlined.SmartDisplay,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Creator Studio",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f)
                )
                if (jsLog.isNotEmpty()) {
                    TextButton(
                        onClick = { showJsLog = true },
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text(
                            "JS Log (${jsLog.size})",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
                when (val s = state) {
                    is StudioState.Ready -> Text(
                        text = "local:${StudioServerManager.serverPort()}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                    is StudioState.Loading -> CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp
                    )
                    is StudioState.Error -> {}
                }
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(onClick = {
                    if (state is StudioState.Ready) webview?.reload() else reloadKey++
                }) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Reload Studio")
                }
                IconButton(onClick = onClose) {
                    Icon(Icons.Outlined.Close, contentDescription = "Close Studio")
                }
            }
        }

        // ── Body ────────────────────────────────────────────────────────────
        when (val s = state) {
            is StudioState.Loading -> Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator()
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        "Studio server start ho raha hai…",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        "pehli baar me 10-30 second lag sakte hain",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                    )
                }
            }

            is StudioState.Ready -> key(webViewEpoch) {
                StudioWebView(
                    url = s.url,
                    reloadKey = reloadKey,
                    softwareRendering = crashRecoveries >= 2,
                    onWebViewReady = { webview = it },
                    onLog = { line -> pushJsLog(line) },
                    onRendererCrash = {
                        crashRecoveries++
                        if (crashRecoveries <= 2) {
                            webViewEpoch++
                        } else {
                            pushJsLog("!! recovery limit hit — software mode me bhi renderer crash. Upar refresh dabao")
                        }
                    }
                )
            }

            is StudioState.Error -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(18.dp)
            ) {
                Text(
                    "Studio start nahi hua",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(s.message, fontSize = 12.5.sp, fontFamily = FontFamily.Monospace)
                if (s.tail.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Server log (last lines):",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Surface(
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.6f),
                        shape = MaterialTheme.shapes.small,
                        modifier = Modifier.padding(top = 6.dp)
                    ) {
                        Text(
                            s.tail.takeLast(15).joinToString("\n"),
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { reloadKey++ }) {
                    Text("Retry")
                }
            }
        }
    }

    if (showJsLog) {
        AlertDialog(
            onDismissRequest = { showJsLog = false },
            title = { Text("WebView / JS log", fontSize = 14.sp) },
            text = {
                Text(
                    jsLog.joinToString("\n"),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.verticalScroll(rememberScrollState())
                )
            },
            confirmButton = {
                TextButton(onClick = { showJsLog = false }) { Text("Band karo") }
            },
            dismissButton = {
                TextButton(onClick = { jsLog = emptyList(); showJsLog = false }) { Text("Clear") }
            }
        )
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun StudioWebView(
    url: String,
    reloadKey: Int,
    softwareRendering: Boolean,
    onWebViewReady: (WebView) -> Unit,
    onLog: (String) -> Unit,
    onRendererCrash: () -> Unit
) {
    // DOM probe — load ke baad phone ke WebView ka Chrome version + DOM status JS Log me
    fun probeDom(wv: WebView?, tag: String) {
        if (wv == null) return
        runCatching {
            wv.evaluateJavascript(DOM_PROBE_JS) { r ->
                onLog("dom probe $tag: ${r?.trim()?.take(200) ?: "null (renderer dead?)"}")
            }
        }.onFailure { onLog("dom probe $tag FAILED: ${it.message}") }
    }

    AndroidView(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        factory = { ctx ->
            WebView(ctx).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.loadWithOverviewMode = true
                settings.useWideViewPort = true
                if (softwareRendering) {
                    // GPU pipeline fail hone par last-resort: software rendering
                    setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null)
                }
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    // renderer ko important priority — memory pressure me kill na ho
                    setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true)
                }
                webViewClient = object : WebViewClient() {
                    override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        onLog("page load start: $url")
                    }

                    override fun onPageFinished(view: WebView?, url: String?) {
                        onLog("page load done: $url")
                        probeDom(view, "done")
                        // hydration ke baad dobara probe — textLen badha to JS chal raha hai
                        view?.postDelayed({ probeDom(view, "+4s") }, 4000)
                    }

                    override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                        val u = request?.url?.toString().orEmpty()
                        // ab subresources (JS/CSS chunks) bhi log hote hain — pehle sirf main frame tha
                        if (u.startsWith("http")) {
                            onLog("load error: ${error?.description} — $u")
                        }
                    }

                    override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                        val u = request?.url?.toString().orEmpty()
                        if (u.startsWith("http")) {
                            onLog("HTTP ${errorResponse?.statusCode} — $u")
                        }
                    }

                    // Black screen ka main suspect: render process ka phone-side crash.
                    // Ab capture hota hai aur app khud naya WebView banake recover karti hai.
                    override fun onRenderProcessGone(view: WebView?, detail: android.webkit.RenderProcessGoneDetail?): Boolean {
                        onLog("!! RENDERER CRASHED (didCrash=${detail?.didCrash()}) — naya WebView banaya ja raha hai")
                        onRendererCrash()
                        view?.post {
                            val w = view ?: return@post
                            runCatching {
                                (w.parent as? android.view.ViewGroup)?.removeView(w)
                                w.destroy()
                            }
                        }
                        return true
                    }
                }
                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        val level = consoleMessage?.messageLevel()
                        if (level == ConsoleMessage.MessageLevel.ERROR || level == ConsoleMessage.MessageLevel.WARNING) {
                            val src = consoleMessage?.sourceId()?.substringAfterLast('/').orEmpty()
                            onLog("console ${level}: ${consoleMessage?.message()} ($src:${consoleMessage?.lineNumber()})")
                        }
                        return true
                    }
                }
                loadUrl(url)
                onWebViewReady(this)
            }
        },
        update = { wv ->
            // reloadKey badalne par fresh URL load (retry/refresh ke baad)
            if (wv.url.isNullOrEmpty() && reloadKey > 0) wv.loadUrl(url)
        },
        onRelease = { wv ->
            runCatching { wv.stopLoading() }
        }
    )
}
