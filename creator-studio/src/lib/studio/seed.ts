// Creator Studio — FIRST-RUN SEED IMPORT (STATIC ENGINE)
// ---------------------------------------------------------------------------
// Aapke purane skill packages (repo ke creator-studio/data/creator-studio/ me
// the) ab build time par public/studio-seed/ me bundle hote hain. Pehli baar
// Studio khulne par ye sab IndexedDB me import ho jate hain — iske baad kabhi
// dubara nahi (docs me "seeded" flag + index ki maujoodi se pata chalta hai).
//
// manifest.json shape:
// {
//   "generatedAt": "...",
//   "index": { ...StudioIndex... },
//   "files": [ { "pkg": "<pkgId>", "path": "skills/x.md", "url": "./files/<pkgId>/skills%2Fx.md" }, ... ]
// }

import { docGet, docSet, filePut } from "./idb";
import type { StudioIndex } from "./types";

// RELATIVE path — page /assets/studio/index.html par chalta hai (basePath),
// isliye ye /assets/studio/studio-seed/manifest.json par resolve hota hai.
// Dev me (localhost:3000/) ye /studio-seed/manifest.json par hi rehta hai.
const SEED_URL = "studio-seed/manifest.json";
const INDEX_KEY = "index";

interface SeedManifest {
  generatedAt?: string;
  index?: StudioIndex;
  files?: { pkg: string; path: string; url: string }[];
}

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeed().catch((e) => {
      // seed fail hua to agle call par dubara try ho sake
      seedPromise = null;
      console.warn("[studio] seed import failed:", e);
    });
  }
  return seedPromise;
}

async function doSeed(): Promise<void> {
  const existing = await docGet<StudioIndex>(INDEX_KEY);
  if (existing && Array.isArray(existing.packages)) return; // already seeded / user data present

  let manifest: SeedManifest;
  try {
    const res = await fetch(SEED_URL);
    if (!res.ok) return; // seed bundle nahi hai — khali fresh start
    manifest = (await res.json()) as SeedManifest;
  } catch {
    return; // offline/404 — fresh start
  }

  if (manifest.index && Array.isArray(manifest.index.packages) && manifest.index.packages.length > 0) {
    await docSet(INDEX_KEY, manifest.index);
  }

  const files = manifest.files ?? [];
  for (const f of files) {
    try {
      const res = await fetch(f.url);
      if (!res.ok) {
        console.warn("[studio] seed file missing:", f.url);
        continue;
      }
      const buf = await res.arrayBuffer();
      await filePut(f.pkg, f.path, buf);
    } catch (e) {
      console.warn("[studio] seed file import failed:", f.path, e);
    }
  }

  // marker — seed poora hua
  await docSet("seeded", { at: new Date().toISOString(), files: files.length });
  console.log(`[studio] seed import done: ${files.length} files`);
}
