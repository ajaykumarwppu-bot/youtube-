// Creator Studio — Videos section server store (JSON persistence)
// Server-only file (uses fs) — client components import only video-types.ts
//
// FRESH INSTALL POLICY: koi demo/seed video nahi. Videos section shuru me
// khali hai — records agent ke production runs complete hone par bante hain
// (studio_video_record) aur YouTube upload/analytics ke baad bhar jaate hain.

import fs from "fs";
import path from "path";
import type { VideosState } from "./video-types";
import { DATA_BASE } from "./paths";

const VIDEOS_FILE = path.join(DATA_BASE, "data", "creator-studio", "videos.json");

function readVideosFile(): VideosState | null {
  try {
    const raw = fs.readFileSync(VIDEOS_FILE, "utf8");
    const st = JSON.parse(raw) as VideosState;
    if (!st || !Array.isArray(st.videos)) return null;
    return st;
  } catch {
    return null;
  }
}

export function writeVideosFile(st: VideosState) {
  const dir = path.dirname(VIDEOS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = VIDEOS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2), "utf8");
  fs.renameSync(tmp, VIDEOS_FILE);
}

export function readVideos(): VideosState {
  const existing = readVideosFile();
  if (existing) return existing;
  return { videos: [] };
}
