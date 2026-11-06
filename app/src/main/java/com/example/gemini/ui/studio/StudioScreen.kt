package com.example.gemini.ui.studio

import android.annotation.SuppressLint
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

            is StudioState.Ready -> StudioWebView(
                url = s.url,
                reloadKey = reloadKey,
                onWebViewReady = { webview = it }
            )

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
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun StudioWebView(
    url: String,
    reloadKey: Int,
    onWebViewReady: (WebView) -> Unit
) {
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
                webViewClient = object : WebViewClient() {
                    // Sab kuch loopback server se — koi external navigation nahi
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
