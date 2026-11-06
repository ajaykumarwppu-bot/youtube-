# Creator Studio

YouTube Automation **Creator Studio** — ek complete web app (Next.js) jo Creator Studio Android app ke andar localhost server ke roop me chalta hai, aur desktop par bhi standalone chal sakta hai.

Yeh repo `ajaykumarwppu-bot/youtube-merged` ke `creator-studio/` directory ka **complete latest code** hai (v1.0.3 snapshot) — wahi code jo Android app ke `app/src/main/assets/creator-studio.zip` me bundle hota hai.

## Features

- **Brain** — research library: questions, findings, experiments, video research
- **Packages / Skills** — skill library manager (upload, versions, rollback, file viewer)
- **Videos** — video records + full packaging output: title (+title note), description, tags, hashtags, chapters (long videos), end screen, pinned comment
- **Pipeline** — idea → stage-by-stage production runs (advance / retry per stage)
- **Dashboard** — combined overview (health + stats)
- **Settings** — app settings + integrations

## Tech Stack

- Next.js (App Router, TypeScript, standalone output)
- Tailwind CSS + shadcn/ui
- Data: JSON files in `data/creator-studio/` (runtime data app me auto-banti hai; sirf built-in **skill library** (`data/creator-studio/packages/` + `index.json`) repo me rakhi hai)

## Run (desktop)

```bash
npm install
npm run dev        # development
npm run build && npm start   # production
```

## Android app me packaging (CI ye karta hai)

```bash
cd creator-studio
npm ci && npm run build
zip -qr ../app/src/main/assets/creator-studio.zip .next/standalone
```

Standalone build me `data/creator-studio/packages/` trace honi chahiye (CI iski warning check karta hai). App ka `StudioServerManager` is zip ko `$HOME/creator-studio/` me extract karke Node se `.next/standalone/server.js` start karta hai (ports **8877** app + **8875** MCP), health check `/api/cs/dashboard`.

## API (sab `/api/cs/*` ke niche)

| Area | Routes |
| --- | --- |
| Dashboard | `/api/cs/dashboard` |
| Videos | `/api/cs/videos` |
| Pipeline | `/api/cs/pipeline`, `/pipeline/ideas`, `/pipeline/runs/[id]/advance\|retry` |
| Brain | `/api/cs/brain`, `/brain/questions`, `/brain/experiments` |
| Packages | `/api/cs/packages`, `/packages/[id]` (+ `file`, `raw`, `icon`, `versions/[n]`) |
| Skills | `/api/cs/skills/[id]` (+ `rollback`) |
| Upload | `/api/cs/upload` |
| Settings | `/api/cs/settings` |

## Related repos

- `ajaykumarwppu-bot/youtube-merged` — Android app (ye web app isi me embed hota hai)
- `ajaykumarwppu-bot/antigem-merged` — productivity variant
