<div align="center">

# Creator Studio (YouTube)

**Original AntiGem-based Android app — AI workspace + built-in YouTube Automation Creator Studio.**

AntiGem ka pura power (chat agents, Linux terminal, IDE, browser, notes) + floating switcher me ek **Studio** button jo pura Creator Studio web app local Node server par chalata hai: Idea Bank → 8-stage production pipeline → video records with full upload package → brain (skills, experiments, findings) → settings.

</div>

---

## Ye repo kya hai

- **Base: original [AntiGem](https://github.com/Santoshkurmi/antigem) (GPLv3) ka fresh code** — koi purane fork se lena-dena nahi.
- **Package identity original jaisa**: `com.antigem` (standard) / `com.termux` (termux flavor) — isliye environment/bootstrap ka behaviour bilkul original Antigem jaisa stable hai.
- Alag **app label**: "Creator Studio". Telemetry poori tarah disabled. Update system is repo se chalta hai — original Antigem se koi connection nahi.
- Note: signing alag hai, isliye **original AntiGem uninstall karke ye fresh install** karna hoga (one-time).

## App ke andar kya naya hai

| Part | Kya karta hai |
| --- | --- |
| `app/.../data/studio/StudioServerManager.kt` | APK assets me bundled `creator-studio.zip` ko `~/creator-studio/` me extract karke app ke Node se local server chalata hai (standard: port 8877 / termux: 8875). `data/` folder update par kabhi delete nahi hota. |
| `app/.../ui/studio/StudioScreen.kt` | Studio ka WebView UI (loading / error+log / ready states ke saath). |
| `AppViewMode.STUDIO` + floating switcher | Baki modes ki tarah ek persistent mode — switcher me SmartDisplay icon. |
| `creator-studio/` | Pura Creator Studio web app (Next.js standalone build CI me zip hota hai). Fresh install par **koi demo data nahi** — sirf built-in skill library. |
| `creator-studio-plugin/` | AntiGem MCP plugin — agent ko 18 `studio_*` tools deta hai (chat se poora pipeline chala sakta hai). |
| `setup.md` | YouTube (Data API v3 + Analytics API + OAuth) ka beginner-level setup guide. |
| `.github/workflows/apk.yml` | Push par APK build + GitHub Release — APK hamesha ready. |

## Build

```bash
# 1) Creator Studio web app build + APK assets me bundle
cd creator-studio && npm install && npm run build
cd .. && mkdir -p app/src/main/assets
cd creator-studio && zip -qr ../app/src/main/assets/creator-studio.zip .next/standalone package.json data
cd ..

# 2) APK (termux flavor — full environment)
./gradlew :app:assembleTermuxRelease   # keystore: app/release.jks (CI secret se)
# ya standard flavor: ./gradlew :app:assembleStandardRelease
```

APK output: `app/build/outputs/apk/<flavor>/release/`
Releases: is repo ke **Releases** section me har push par built APK milta hai — updater isi ko dhoondta hai (`CreatorStudio-<flavor>-v<version>-release.apk`).

## Documentation

- **YouTube setup (beginner, step-by-step)** → [setup.md](setup.md)
- **Verification checklist** → [CHECKLIST.md](CHECKLIST.md)
- Plugin install/usage → [creator-studio-plugin/README.md](creator-studio-plugin/README.md)
- Extension/plugin system docs (AntiGem se) → [extension_docs/README.md](extension_docs/README.md)

## License

GPLv3 (base AntiGem ke saath) — LICENSE file dekho.
