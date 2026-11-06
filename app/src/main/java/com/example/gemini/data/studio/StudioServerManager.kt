package com.example.gemini.data.studio

import android.content.Context
import android.util.Log
import com.example.gemini.BuildConfig
import com.example.gemini.data.local.LocalEnvironmentManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

/**
 * Creator Studio local web server manager.
 *
 * BrowserExtensionManager ke proven node-spawn pattern par bana hai:
 *  - APK assets me bundled `creator-studio.zip` ko `$HOME/creator-studio/` me extract karta hai
 *  - Environment ka node binary se Next.js standalone server (`node server.js`) spawn karta hai
 *  - `GET /api/cs/health` poll karta hai — "ready:true" aaya to server ready
 *  - Har heavy kaam IO dispatcher par — Main thread kabhi block nahi hota (ANR-safe)
 *
 * Data safety: `~/creator-studio/data/` (STUDIO_DATA_DIR) me user ka saara Studio data
 * rehta hai. Re-extract ke waqt ye folder kabhi overwrite nahi hota — APK update par
 * build files badal jaate hain par videos/ideas/brain/settings intact rehte hain.
 */
object StudioServerManager {

    private const val TAG = "StudioServerManager"
    private const val STUDIO_DIR_NAME = "creator-studio"
    private const val ASSET_ZIP = "creator-studio.zip"
    private const val BUILD_MARKER = ".studio-build"
    private const val LOG_FILE = "creator-studio.log"

    fun serverPort(): Int = BuildConfig.STUDIO_PORT
    fun serverUrl(): String = "http://127.0.0.1:${serverPort()}"

    private val mutex = Mutex()
    private var process: Process? = null

    private val http = OkHttpClient.Builder()
        .connectTimeout(2, TimeUnit.SECONDS)
        .readTimeout(2, TimeUnit.SECONDS)
        .build()

    /** Last log lines — error screen par dikhate hain taaki phone-side debugging asaan ho. */
    private val logTail = ArrayDeque<String>()
    private const val LOG_TAIL_LIMIT = 40

    private fun studioDir(context: Context): File =
        File(LocalEnvironmentManager.getHomeDir(context), STUDIO_DIR_NAME)

    fun dataDir(context: Context): File = File(studioDir(context), "data")
    fun logFile(context: Context): File = File(LocalEnvironmentManager.getHomeDir(context), LOG_FILE)

    private fun appendLog(line: String) {
        synchronized(logTail) {
            logTail.addLast(line)
            while (logTail.size > LOG_TAIL_LIMIT) logTail.removeFirst()
        }
    }

    fun logTailSnapshot(): List<String> = synchronized(logTail) { logTail.toList() }

    /**
     * Server ready ho to turant return, warna assets extract + node spawn + health poll.
     * Sab kuch Dispatchers.IO par. Fail hone par IllegalStateException with readable message.
     */
    suspend fun ensureServer(context: Context) = withContext(Dispatchers.IO) { mutex.withLock {
        val appContext = context.applicationContext
        val dir = studioDir(appContext)

        // 1) Assets extract (sirf pehli baar ya naye build par)
        try {
            ensureExtracted(appContext)
        } catch (e: Exception) {
            Log.e(TAG, "asset extract failed", e)
            throw IllegalStateException("Studio build extract nahi hua: ${e.message}")
        }

        val serverJs = File(dir, "server.js")
        if (!serverJs.exists()) throw IllegalStateException("server.js missing at ${dir.absolutePath} — build assets corrupted")

        // 2) Already healthy? turant wapas
        if (runCatching { isHealthy() }.getOrDefault(false)) return@withLock

        // 3) Purana process (agar tha) band karo — stale node se port conflict na ho
        process?.let { stale ->
            if (stale.isAlive) {
                runCatching { stale.destroy() }
                runCatching { stale.waitFor(3, TimeUnit.SECONDS) }
            }
        }
        process = null
        killStaleNodeOnPort()

        // 4) Node binary — environment ka (Local Tools installer isse install karta hai)
        val node = File(LocalEnvironmentManager.getBinDir(appContext), "node")
        if (!node.canExecute()) {
            throw IllegalStateException(
                "Node.js nahi mila (${node.absolutePath}). " +
                    "Local tools install karo (Settings → Local Tools), uske baad Studio kholein."
            )
        }

        // 5) Spawn — wahi env jo extension host use karta hai (proven on-device)
        val command = mutableListOf(node.absolutePath, "server.js")
        val builder = ProcessBuilder(command)
            .directory(dir)
            .redirectErrorStream(true)
        builder.environment().putAll(
            mapOf(
                "HOME" to LocalEnvironmentManager.getHomeDir(appContext).absolutePath,
                "PREFIX" to LocalEnvironmentManager.getPrefixDir(appContext).absolutePath,
                "PATH" to "${LocalEnvironmentManager.getBinDir(appContext).absolutePath}:/system/bin",
                "TMPDIR" to LocalEnvironmentManager.getTmpDir(appContext).absolutePath,
                "PORT" to serverPort().toString(),
                "HOSTNAME" to "127.0.0.1",
                "NODE_ENV" to "production",
                "STUDIO_DATA_DIR" to dataDir(appContext).absolutePath,
                "NODE_OPTIONS" to "--max-old-space-size=512"
            )
        )

        val log = logFile(appContext)
        synchronized(logTail) { logTail.clear() }
        runCatching {
            log.writeText("[${java.util.Date()}] starting: ${command.joinToString(" ")} (cwd=${dir.absolutePath})\n")
        }

        val started = try {
            builder.start()
        } catch (e: Exception) {
            runCatching { log.appendText("failed to launch node: $e\n") }
            throw IllegalStateException("Studio server launch fail: ${e.message} (log: ${log.absolutePath})", e)
        }
        process = started

        // Output ko log file + tail me (background thread, Main se koi lena-dena nahi)
        Thread {
            runCatching {
                started.inputStream.bufferedReader().useLines { lines ->
                    lines.forEach { line ->
                        appendLog(line)
                        runCatching { log.appendText(line + "\n") }
                    }
                }
            }
            val code = runCatching { started.waitFor() }.getOrNull()
            Log.w(TAG, "Studio server exited with code $code")
            runCatching { log.appendText("[${java.util.Date()}] studio server exited with code $code\n") }
        }.start()

        // 6) Health poll — first boot par Next.js 10-30s le sakta hai, isliye 45s budget
        val deadline = System.currentTimeMillis() + 45_000
        while (System.currentTimeMillis() < deadline) {
            if (runCatching { isHealthy() }.getOrDefault(false)) return@withLock
            if (!started.isAlive) {
                delay(200) // reader thread ko last output lene ka mauka
                val tail = synchronized(logTail) { logTail.takeLast(10).joinToString("\n") }
                throw IllegalStateException(
                    "Studio server band ho gaya" +
                        (runCatching { " (code ${started.exitValue()})" }.getOrDefault("")) +
                        (if (tail.isNotBlank()) ":\n$tail" else "; no output") +
                        "\nFull log: ${log.absolutePath}"
                )
            }
            delay(200)
        }
        throw IllegalStateException(
            "Studio server time par ready nahi hua (${serverUrl()}).\n" +
                synchronized(logTail) { logTail.takeLast(10).joinToString("\n") }
        )
    } }

    /** Server band karo (lifecycle completeness ke liye). */
    fun stop() {
        runCatching {
            process?.let { if (it.isAlive) it.destroy() }
            process = null
        }
    }

    private fun isHealthy(): Boolean {
        val request = okhttp3.Request.Builder()
            .url("${serverUrl()}/api/cs/health")
            .header("Cache-Control", "no-cache")
            .build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return false
            val body = response.body?.string().orEmpty()
            return runCatching { org.json.JSONObject(body).optBoolean("ready") }.getOrDefault(false)
        }
    }

    /**
     * Assets extract — marker ke hisaab se sirf naye/changed build par.
     * `data/` folder agar pehle se hai to usay SKIP karta hai (user data protect).
     * Zip-slip guard: har entry ke path ko studioDir ke andar hi rakhta hai.
     */
    private fun ensureExtracted(context: Context) {
        val dir = studioDir(context)
        val assetManager = context.assets
        val assetSize = runCatching {
            assetManager.open(ASSET_ZIP).use { it.available() }
        }.getOrElse { throw IllegalStateException("$ASSET_ZIP asset nahi mila (build step missing?)") }

        val marker = File(dir, BUILD_MARKER)
        if (dir.exists() && marker.exists() && marker.readText().trim() == assetSize.toString()) {
            return // same build already extracted
        }

        dir.mkdirs()
        val dataDir = dataDir(context)
        val dataExists = dataDir.exists() && dataDir.isDirectory
        var count = 0

        assetManager.open(ASSET_ZIP).use { input ->
            ZipInputStream(input.buffered()).use { zip ->
                while (true) {
                    val entry: ZipEntry = zip.nextEntry ?: break
                    val out = safeTargetFile(dir, entry.name)
                    if (out == null) {
                        zip.closeEntry(); continue
                    }
                    if (entry.isDirectory) {
                        if (!(dataExists && isDataPath(entry.name))) out.mkdirs()
                        zip.closeEntry(); continue
                    }
                    // user data protect: purana data folder hai to data/** skip
                    if (dataExists && isDataPath(entry.name)) { zip.closeEntry(); continue }
                    out.parentFile?.mkdirs()
                    java.io.FileOutputStream(out).use { output -> zip.copyTo(output) }
                    count++
                    zip.closeEntry()
                }
            }
        }
        marker.writeText(assetSize.toString())
        Log.i(TAG, "studio assets extracted: $count files (dataPreserved=$dataExists)")
    }

    private fun isDataPath(entryName: String): Boolean {
        val n = entryName.trimStart('/')
        return n == "data" || n.startsWith("data/")
    }

    /** Zip-slip guard — entry ka path studioDir ke bahar jaye to null. */
    private fun safeTargetFile(baseDir: File, entryName: String): File? {
        val cleaned = entryName.replace('\\', '/').split('/').filter { it.isNotEmpty() && it != "." }
        if (cleaned.isEmpty()) return null
        var f = baseDir
        for (part in cleaned) {
            if (part == "..") return null // koi bhi ".." reject
            f = File(f, part)
        }
        val basePath = baseDir.canonicalPath + File.separator
        if (!f.canonicalPath.startsWith(basePath) && f.canonicalPath != baseDir.canonicalPath) return null
        return f
    }

    /** Purana node server.js process (agar kisi wajah se zinda hai) band karo — port free karne ke liye. */
    private fun killStaleNodeOnPort() {
        runCatching {
            val proc = ProcessBuilder("sh", "-c", "ps -A -o PID,ARGS 2>/dev/null | grep -F 'server.js' | grep -v grep || true")
                .redirectErrorStream(true)
                .start()
            val out = proc.inputStream.bufferedReader().readText()
            proc.waitFor(2, TimeUnit.SECONDS)
            out.lineSequence().mapNotNull { line ->
                line.trim().split(Regex("\\s+")).firstOrNull()?.toIntOrNull()
            }.forEach { pid ->
                runCatching { android.os.Process.killProcess(pid) }
            }
        }.onFailure { Log.w(TAG, "stale node cleanup skipped: ${it.message}") }
    }
}
