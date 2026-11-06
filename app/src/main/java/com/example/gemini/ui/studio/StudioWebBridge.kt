package com.example.gemini.ui.studio

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.coroutines.resume

/**
 * CREATOR STUDIO AGENT BRIDGE (Kotlin side) — STATIC ENGINE
 * ---------------------------------------------------------
 * Studio ab ek persistent WebView hai (assets/studio/ static build,
 * WebViewAssetLoader se load). Ye singleton studio_mcp MCP endpoint aur
 * us page ke beech ka plumbing hai:
 *
 *   agent → AndroidLocalBridgeServer (/studio tools/call) → StudioWebBridge.call()
 *     → webView.evaluateJavascript("window.StudioAgent.__handle('<json>')")
 *     → page async op chalata hai (IndexedDB) → result par
 *       StudioBridge.notify('{"reqId":"…","result":{…}}') call karta hai
 *     → pending continuation resume → MCP tool result
 *
 * JS side Studio ke static build ke andar hi hai (window.StudioAgent,
 * src/lib/studio/agent-bridge.ts) — Achiva jaisi alag inject file ki
 * zaroorat nahi, hydration ke turant baad install ho jata hai.
 */
object StudioWebBridge {

    private const val TAG = "StudioWebBridge"
    private val main = Handler(Looper.getMainLooper())

    @Volatile
    private var webView: WebView? = null

    private val jsReady = AtomicBoolean(false)
    private val pending = ConcurrentHashMap<String, CancellableContinuation<JSONObject>>()
    private val seq = AtomicLong(0)

    /** StudioScreen apna WebView (re)create kare tab. Latest wins. */
    fun attach(wv: WebView) {
        webView = wv
        jsReady.set(false)
    }

    fun detach(wv: WebView) {
        if (webView === wv) {
            webView = null
            jsReady.set(false)
        }
    }

    /** JS hooks — page ki taraf se sirf notifyReady/notify call hote hain. */
    class JsHooks {
        @JavascriptInterface
        fun notifyReady() {
            jsReady.set(true)
            Log.i(TAG, "Studio agent bridge ready (window.StudioAgent installed)")
        }

        @JavascriptInterface
        fun notify(json: String) {
            // {"reqId":"…","result":{…}} — async op ka result
            try {
                val obj = JSONObject(json)
                val reqId = obj.optString("reqId", "")
                if (reqId.isEmpty()) return
                val result = obj.optJSONObject("result")
                    ?: JSONObject().put("ok", false).put("error", "bridge result missing")
                pending.remove(reqId)?.let { cont ->
                    main.post {
                        try {
                            if (cont.isActive) cont.resume(result)
                        } catch (_: Throwable) { /* already resumed */ }
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "bad bridge notify: ${json.take(200)}", t)
            }
        }
    }

    val jsHooks = JsHooks()

    fun isReady(): Boolean = webView != null && jsReady.get()

    /**
     * Ek op page par run karta hai. Never throws — failures
     * {"ok":false,"error":…} ke roop me aate hain.
     */
    suspend fun call(cmd: JSONObject): JSONObject {
        val wv = webView ?: return JSONObject()
            .put("ok", false)
            .put("error", "Creator Studio abhi load nahi hua. App me Studio kholo (ya khulne ka wait karo), phir retry karo.")

        val reqId = "s${seq.incrementAndGet()}"
        val cmdWithId = try { cmd.put("reqId", reqId) } catch (_: Exception) { cmd }

        return withTimeoutOrNull(25_000L) {
            suspendCancellableCoroutine { cont ->
                pending[reqId] = cont
                cont.invokeOnCancellation { pending.remove(reqId) }
                main.post {
                    try {
                        val js = "window.StudioAgent && window.StudioAgent.__handle(" +
                            JSONObject.quote(cmdWithId.toString()) + ")"
                        wv.evaluateJavascript(js) { value ->
                            // page par bridge abhi install nahi hua ("false"/"null")
                            val v = value?.trim()
                            if (v == "false" || v == "null" || v == "undefined") {
                                pending.remove(reqId)?.let { c ->
                                    main.post {
                                        try {
                                            if (c.isActive) {
                                                c.resume(
                                                    JSONObject()
                                                        .put("ok", false)
                                                        .put("error", "Studio page abhi load ho raha hai — thoda ruk kar retry karo.")
                                                )
                                            }
                                        } catch (_: Throwable) { /* resumed */ }
                                    }
                                }
                            }
                        }
                    } catch (t: Throwable) {
                        Log.w(TAG, "evaluateJavascript failed", t)
                        pending.remove(reqId)?.let { c ->
                            main.post {
                                try {
                                    if (c.isActive) {
                                        c.resume(
                                            JSONObject()
                                                .put("ok", false)
                                                .put("error", "Studio bridge call failed: ${t.message}")
                                        )
                                    }
                                } catch (_: Throwable) { /* resumed */ }
                            }
                        }
                    }
                }
            }
        } ?: run {
            pending.remove(reqId)
            JSONObject()
                .put("ok", false)
                .put("error", "Studio bridge timed out (page busy ya load ho raha hai). Thodi der baad retry karo.")
        }
    }

    /**
     * MCP entry point: ek studio_* tool call page par dispatch karta hai.
     * Returns MCP tool result ({content:[{type:"text",text:<json>}]}).
     */
    suspend fun callMcpTool(toolName: String, args: JSONObject): JSONObject {
        val cmd = try {
            JSONObject().put("op", toolName.removePrefix("studio_")).put("args", args)
        } catch (_: Exception) {
            JSONObject().put("op", toolName.removePrefix("studio_")).put("args", JSONObject())
        }
        val result = call(cmd)
        val content = JSONArray().put(
            JSONObject().put("type", "text").put("text", result.toString())
        )
        return JSONObject().put("content", content)
    }

    // ------------------------------------------------------------------
    // studio_mcp tools list — 18 tools (creator-studio-plugin manifest se)
    // ------------------------------------------------------------------

    private fun jsStr(desc: String): JSONObject =
        JSONObject().put("type", "string").put("description", desc)

    private fun jsEnum(vals: List<String>, desc: String): JSONObject =
        JSONObject().put("type", "string")
            .put("enum", JSONArray().apply { vals.forEach { put(it) } })
            .put("description", desc)

    private fun jsBool(desc: String): JSONObject =
        JSONObject().put("type", "boolean").put("description", desc)

    fun tools(): JSONArray {
        val tools = JSONArray()
        fun tool(name: String, description: String, props: JSONObject, required: List<String> = emptyList()) {
            tools.put(JSONObject().apply {
                put("name", name)
                put("description", description)
                put("inputSchema", JSONObject().apply {
                    put("type", "object")
                    put("properties", props)
                    if (required.isNotEmpty()) {
                        put("required", JSONArray().apply { required.forEach { put(it) } })
                    }
                })
            })
        }

        tool(
            "studio_health",
            "Check karo ki Creator Studio ka page load ho chuka hai (agent bridge ready). ready:true aaye to baaki studio_* tools chalane ke liye taiyar hai.",
            JSONObject()
        )
        tool(
            "studio_ideas_list",
            "Idea Bank ke saare ideas (topic, details, status) + unke production runs ki list. Pipeline ka overview lene ke liye.",
            JSONObject()
        )
        tool(
            "studio_idea_add",
            "Idea Bank me naya video idea add karo. topic required, details optional (angle, target audience, research notes).",
            JSONObject().apply {
                put("topic", jsStr("Video idea ka topic"))
                put("details", jsStr("Optional details — angle, audience, research notes"))
            },
            listOf("topic")
        )
        tool(
            "studio_idea_update",
            "Idea edit/update karo — topic, details ya status (new/picked/done).",
            JSONObject().apply {
                put("id", jsStr("Idea ki id (studio_ideas_list se)"))
                put("topic", jsStr("Naya topic"))
                put("details", jsStr("Naye details"))
                put("status", jsEnum(listOf("new", "picked", "done"), "Naya status"))
            },
            listOf("id")
        )
        tool(
            "studio_pipeline_list",
            "Production runs ki detailed list — har run ka current stage, stage statuses, failed stage/reason. Agent ka aage ka plan isi se decide hota hai.",
            JSONObject()
        )
        tool(
            "studio_pipeline_start",
            "Kisi idea par 8-stage production run START karo (idea status picked ho jata hai). Iske baad stages ke hisaab se kaam karo aur studio_stage_next se advance karo.",
            JSONObject().apply {
                put("idea_id", jsStr("Idea ki id (studio_ideas_list se)"))
            },
            listOf("idea_id")
        )
        tool(
            "studio_stage_next",
            "Active stage ko DONE mark karke agla stage ACTIVE karo (jab current stage ka kaam poora ho jaye). Last stage done hone par run production-ready ho jata hai.",
            JSONObject().apply {
                put("run_id", jsStr("Run ki id (studio_pipeline_list se)"))
            },
            listOf("run_id")
        )
        tool(
            "studio_run_retry",
            "Failed run ko usi stage par wapas active karke resume karo (fix karne ke baad).",
            JSONObject().apply {
                put("run_id", jsStr("Run ki id"))
            },
            listOf("run_id")
        )
        tool(
            "studio_videos_list",
            "Channel ke saare video records — status (processing/uploaded/scheduled/failed), script, pipeline, experiments, upload packaging. Video detail isi se milti hai.",
            JSONObject()
        )
        tool(
            "studio_video_record",
            "Video record create/update karo (upsert). Fields: title (required), topic, kind (long/short), status, duration, script, scheduledFor, publishedAt, failReason, progress {stage, pct, note}, packaging {title, description, tags, hashtags, chapters [{time, label}], endScreen, pinnedComment}. Upload package yahin save hota hai.",
            JSONObject().apply {
                put("id", jsStr("Existing record ka id (update ke liye); naya banane ke liye mat do"))
                put("title", jsStr("Video ka final title"))
                put("topic", jsStr("Video topic"))
                put("kind", jsEnum(listOf("long", "short"), "Video kind"))
                put("status", jsEnum(listOf("uploaded", "scheduled", "processing", "failed"), "Video status"))
                put("duration", jsStr("Duration 'mm:ss'"))
                put("script", jsStr("Final script"))
                put("scheduledFor", jsStr("Scheduled time (ISO)"))
                put("publishedAt", jsStr("Publish time (ISO)"))
                put("failReason", jsStr("Fail hone ki wajah"))
                put("progress", JSONObject().apply {
                    put("type", "object")
                    put("properties", JSONObject().apply {
                        put("stage", jsStr("Stage name"))
                        put("pct", JSONObject().put("type", "number").put("description", "0-100 progress"))
                        put("note", jsStr("Progress note"))
                    })
                })
                put("packaging", JSONObject().apply {
                    put("type", "object")
                    put("description", "Upload package: title, description, tags, hashtags, chapters, endScreen, pinnedComment")
                })
            },
            listOf("title")
        )
        tool(
            "studio_brain_overview",
            "Creator Brain ka full state — research questions, experiments (findings with enabled/disabled report items), tracked videos. Content strategy decisions isi par based karo.",
            JSONObject()
        )
        tool(
            "studio_brain_question_add",
            "Naya research question raise karo. areas required (thumbnail/title/topic/hook/seo/length me se), text optional, videoId optional (source video). Same areas wala question repeat hua to wo merge hota hai.",
            JSONObject().apply {
                put("areas", JSONObject().apply {
                    put("type", "array")
                    put("items", jsEnum(listOf("thumbnail", "title", "topic", "hook", "seo", "length"), "Problem area"))
                    put("description", "Problem areas (non-empty)")
                })
                put("text", jsStr("Optional question text"))
                put("videoId", jsStr("Optional source video id"))
            },
            listOf("areas")
        )
        tool(
            "studio_brain_experiment_toggle",
            "Experiment ke report item ko enable/disable karo (item_id + enabled) ya poore experiment ke items ek saath set karo (set_all).",
            JSONObject().apply {
                put("experiment_id", jsStr("Experiment ki id"))
                put("item_id", jsStr("Report item ki id (set_all ke waqt optional)"))
                put("enabled", jsBool("true = enable, false = disable"))
                put("set_all", jsBool("true = poore experiment ke items isi value par set"))
            },
            listOf("experiment_id")
        )
        tool(
            "studio_dashboard",
            "Home dashboard ka channel health summary (read-only) — overall stats jo Studio ke Home screen par dikhte hain.",
            JSONObject()
        )
        tool(
            "studio_settings_get",
            "Studio settings padho — keys MASKED hoti hain (raw token kabhi nahi milti), integrations ka connect status + preferences dikhte hain.",
            JSONObject()
        )
        tool(
            "studio_settings_set",
            "Studio settings update karo. Do kind: (1) cred — integrationId + fieldId + value (API key/token save, value null = remove); (2) prefs — preferences patch. Sirf owner ke kehne par ya setup flow me use karo.",
            JSONObject().apply {
                put("kind", jsEnum(listOf("cred", "prefs"), "Update ka type"))
                put("integrationId", jsStr("kind=cred: integration id"))
                put("fieldId", jsStr("kind=cred: credential field id"))
                put("value", jsStr("kind=cred: key value (null = remove)"))
                put("patch", JSONObject().put("type", "object").put("description", "kind=prefs: preferences patch"))
            },
            listOf("kind")
        )
        tool(
            "studio_skills_list",
            "Installed skill packages ki list — har package ke naam, enabled status, aur skills (name, description, version, stage tags). Kaam shuru se pehle relevant skills dhundo.",
            JSONObject()
        )
        tool(
            "studio_skill_get",
            "Ek skill ka poora content padho (skill_id se) — instructions, references, current markdown. Script writing / SEO / thumbnail jaise playbooks isi se follow hote hain.",
            JSONObject().apply {
                put("skill_id", jsStr("Skill ki id (studio_skills_list se)"))
            },
            listOf("skill_id")
        )

        return tools
    }
}
