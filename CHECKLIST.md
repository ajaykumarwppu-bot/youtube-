# CHECKLIST — har cheez ki verification (honest status)

- ✅ = sandbox/CI me verify kiya
- 🤖 = GitHub Actions (CI) par push ke baad verify hoga
- 📱 = phone par install karke test hoga

## 1. Original base, minimal diff

- [x] ✅ Base = original Santoshkurmi/antigem ka fresh code (kisi purane fork se kuch nahi liya)
- [x] ✅ Package identity original jaisa: `com.antigem` / `com.termux` — environment/bootstrap behaviour original jaisa
- [x] ✅ Nayi git history — original repo se koi fork relation nahi
- [x] ✅ Sirf zaroori cheezein badlin: app label, updater URLs, rootfs URL, Studio integration, telemetry off

## 2. Alag app identity (original AntiGem se connection nahi)

- [x] ✅ App label = "Creator Studio" (main + termux flavor strings)
- [x] ✅ Updater version.json URL → is repo (raw.githubusercontent.com/ajaykumarwppu-bot/youtube-)
- [x] ✅ APK download URL → is repo releases, naming `CreatorStudio-<flavor>-v<ver>-release.apk`
- [x] ✅ Linux rootfs URL → is repo ke release asset par (tag rootfs-v1)
- [x] ✅ About/repo links (Settings + Update dialog) → is repo
- [x] ✅ Telemetry (TelemetryDeck) poori tarah disabled — na toast, na data send
- [x] ✅ `grep -r "santoshkurmi/antigem"` in app code → sirf LICENSE/README references bachte hain

## 3. Creator Studio web app (creator-studio/)

- [x] ✅ Standalone Next.js project (`output: "standalone"`, images unoptimized)
- [x] ✅ `STUDIO_DATA_DIR` env support (device par data alag folder me)
- [x] ✅ Demo data ZERO — videos/pipeline/brain khali start, settings keys empty
- [x] ✅ Built-in skill library ship hoti hai (data/creator-studio/ — content, demo nahi)
- [x] ✅ POST /api/cs/videos — agent video record create/update (upsert + validation)
- [x] ✅ GET /api/cs/health — server health probe (naya route)
- [x] ✅ Sab 8 API areas live: brain, dashboard, packages, pipeline, settings, skills, upload, videos

## 4. Android integration (Kotlin)

- [x] ✅ `AppViewMode.STUDIO` enum + initial mode mapping + persistent Box
- [x] ✅ `StudioScreen.kt` — loading/ready/error(+log tail+retry) states + WebView (loopback only)
- [x] ✅ `StudioServerManager.kt` — BrowserExtensionManager ka proven node-spawn pattern (assets extract + zip-slip guard + data preserve + health poll + log file) — sab IO par
- [x] ✅ Floating switcher me "studio" item (vertical + horizontal) + Settings editor me checkbox
- [x] ✅ AuthPreferences — naye defaults + purani saved lists me studio guarantee-append
- [x] ✅ `STUDIO_PORT` per-flavor (standard 8877 / termux 8875)
- [x] ✅ `zip` noCompress — studio asset bina double-compression ke
- [x] ✅ WebView cleartext localhost — manifest me allowed (`usesCleartextTraffic`)
- [x] ✅ Kotlin compile — CI (gradle assemble*Release) GREEN (run 42226946400)
- [ ] 📱 Studio button → server start → WebView me Studio UI

## 5. MCP plugin (creator-studio-plugin/)

- [x] ✅ Manifest format extension_docs contract ke hisaab se (manifest_version 3, id, mcp_tools, background worker)
- [x] ✅ 18 tools — sab REAL Studio API routes par map (koi placeholder nahi)
- [x] ✅ Port fallback 8877/8875 (flavor ke hisaab se dono try)
- [x] ✅ Server band ho to clear guidance error (Studio kholo)
- [ ] 📱 ZIP install → Custom AntiGem Plugin MCP → agent se studio_health check

## 6. CI workflow (APK hamesha ready)

- [x] ✅ `.github/workflows/apk.yml` — push par: studio build → zip → APK assets → gradle release (standard + termux) → GitHub Release
- [x] ✅ version.json se version — updater compatible
- [x] ✅ Keystore CI secrets se (RELEASE_KEYSTORE_BASE64 etc.) — repo me key kabhi nahi
- [x] ✅ Release publish par updater-ready APK naming
- [x] ✅ Workflow GREEN — release v1.0.0 published (standard 37.9MB + termux 37.7MB)
- [x] ✅ v1.0.1 FIX: studio zip ab root-level (server.js zip root par) — CI me sanity guards bhi; v1.0.0 ka zip `.next/standalone/` nested tha jiski wajah se phone par "server.js missing" aaya tha
- [x] ✅ v1.0.1: server manager ab rebuild par stale files clean karta hai + galat layout self-heal + MCP plugin zip release me attach

## 7. Push ke baad — verify

1. [x] ✅ Actions → "Build & Release APK" GREEN
2. [x] ✅ Release v1.0.0 published — `CreatorStudio-standard-v1.0.0-release.apk` + `CreatorStudio-termux-v1.0.0-release.apk` (zip layout bug — mat install karo, v1.0.1 lo)
3. [x] ✅ Release rootfs-v1 — bootrapz_2026-10-04.zip live (351.3MB)
4. [x] ✅ Updater probes: version.json raw (200) + APK download URL + rootfs URL — teeno live
5. [x] ✅ Release v1.0.1 GREEN — APK zip root me server.js (7735B) + package.json + data/ seed verify kiya, koi .next/standalone wrapper nahi; `CreatorStudio-MCP-plugin.zip` attached (manifest root par, 18 tools); APK me versionName 1.0.1 confirm

## 8. Phone par (user steps)

1. [ ] Original AntiGem uninstall (alag signing hai)
2. [ ] **v1.0.1** APK install (termux flavor = full environment; standard = halka) — v1.0.0 se update-over-install bhi chalega (signature same)
3. [ ] Local Tools install (Settings → Local Tools) — Node.js isi se aata hai
4. [ ] Floating switcher → Studio → Studio UI (pehli baar 10-30s)
5. [ ] setup.md follow karke YouTube connect
6. [ ] `CreatorStudio-MCP-plugin.zip` install (Skills & Plugins) → MCP settings → Custom Plugin MCP → `creator-studio` → agent se studio_health

## 9. v1.0.3 — black screen ka asli fix (WebView render process crash)

**Sandbox proof (v1.0.2 release APK ke andar wale zip ko clean server par chala ke):**
- [x] ✅ HTML shell poora (16.8KB — Creator Studio + saare nav labels), CSS linked, saare 11 webpack chunks 200 OK, error-net inline script present
- [x] ✅ Desktop browser me poora dashboard render — ZERO errors, ZERO console output
- [x] ✅ Deduction: phone par HTML load hota hai + koi JS error nahi + phir bhi black ⇒ WebView ka render process paint se PEHLE hi mar raha hai (black = WebView ka dark-theme background, page ka nahi)

**Fixes (sirf Studio files — minimal diff):**
- [x] ✅ `StudioScreen.kt`: `onRenderProcessGone` capture + auto-recovery — renderer crash par naya WebView (2 baar GPU mode, phir software-layer fallback), purana WebView destroy
- [x] ✅ DOM probe: page load ke turant baad + 4s baad — WebView ka Chrome version + readyState + DOM kids/textLen JS Log me (phone-side confirmation data-backed)
- [x] ✅ Subresource (JS/CSS chunks) ke load/HTTP errors ab bhi JS Log me — silent chunk failure khatam
- [x] ✅ `setRendererPriorityPolicy(RENDERER_PRIORITY_IMPORTANT)` (API 26+ guard) — renderer memory pressure me kill na ho
- [x] ✅ `backdrop-blur` hataya (5 jagah, 4 files) — purane GPU drivers par renderer crash ka known trigger
- [x] ✅ version.json → 1.0.3 (version_code 203)
- [ ] 📱 User: v1.0.3 install → JS Log me `dom probe` line (chrome version + textLen>0 = JS chal raha) + renderer crash hua to `!! RENDERER CRASHED` line ke baad auto-recover


## 10. v1.0.4 — WebView lifecycle + dark bg + layout-size probe (Claude review par fix)

**Root cause update (v1.0.3 ke baad ka data):** user ne v1.0.3 install ki — ab bhi black, koi `!! RENDERER CRASHED` line nahi aayi aur DOM me content ban raha tha ⇒ renderer zinda tha, problem paint/composite ki. Claude review ne pakda: Studio WebView ka lifecycle bilkul unmanaged tha — BrowserScreen apne WebView ko onResume/resumeTimers/onPause + explicit background deta hai, Studio ko kuch nahi mila tha. Studio ek graphicsLayer (alpha/translationX) Box me bhi hai (purane GPU par WebView ke liye tricky combination).

**Fixes (sirf StudioScreen.kt + version.json — 2 files, minimal diff):**
- [x] ✅ `isVisible=true` → `wv.onResume()` + `wv.resumeTimers()`; `false` → `wv.onPause()` (BrowserScreen pattern, AndroidView update block me)
- [x] ✅ `setBackgroundColor(#0F0F0F)` — WebView ka apna dark bg (transparent/white-flash composite bugs bypass)
- [x] ✅ Force-dark band (Tiramisu: `isAlgorithmicDarkeningAllowed=false`; Q+: `FORCE_DARK_OFF`) — purane Android 10-12 ke buggy force-dark se bachav, BrowserScreen jaisa
- [x] ✅ DOM probe extended: `innerHeight` + `documentElement.clientHeight` + `body.getBoundingClientRect().height` + Kotlin-side view width×height — zero-size layout ab pakda jayega
- [x] ✅ CI GREEN (run 42263255603) + release v1.0.4 live — APK ke andar studio zip root layout verified (data/ root par, nesting nahi)
- [ ] 📱 User: v1.0.4 install → JS Log me `dom probe` ab `[view WxH]` + innerH/clientH/bodyH dikhayega — view 0x0 ya heights 0 aaye to layout problem, sab normal aaye aur black rahe to paint/composite problem
