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

## 7. Push ke baad — verify

1. [x] ✅ Actions → "Build & Release APK" GREEN
2. [x] ✅ Release v1.0.0 published — `CreatorStudio-standard-v1.0.0-release.apk` + `CreatorStudio-termux-v1.0.0-release.apk`
3. [x] ✅ Release rootfs-v1 — bootrapz_2026-10-04.zip live (351.3MB)
4. [x] ✅ Updater probes: version.json raw (200) + APK download URL + rootfs URL — teeno live

## 8. Phone par (user steps)

1. [ ] Original AntiGem uninstall (alag signing hai)
2. [ ] APK install (termux flavor = full environment; standard = halka)
3. [ ] Local Tools install (Settings → Local Tools) — Node.js isi se aata hai
4. [ ] Floating switcher → Studio → Studio UI
5. [ ] setup.md follow karke YouTube connect
6. [ ] Plugin ZIP install → agent se studio_health
