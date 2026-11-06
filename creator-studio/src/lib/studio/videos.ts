// Creator Studio — Videos section store (STATIC ENGINE, IndexedDB)
// Client components import only video-types.ts
//
// FRESH INSTALL POLICY: koi demo/seed video nahi. Videos section shuru me
// khali hai — records agent ke production runs complete hone par bante hain
// (studio_video_record) aur YouTube upload/analytics ke baad bhar jaate hain.

import { docGet, docSet } from "./idb";
import type { VideosState } from "./video-types";

const VIDEOS_KEY = "videos";

export async function readVideos(): Promise<VideosState> {
  const st = await docGet<VideosState>(VIDEOS_KEY);
  if (!st || !Array.isArray(st.videos)) return { videos: [] };
  return st;
}

export async function writeVideosFile(st: VideosState): Promise<void> {
  await docSet(VIDEOS_KEY, st);
}
