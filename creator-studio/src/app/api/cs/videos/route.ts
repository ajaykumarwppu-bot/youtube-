import { NextRequest, NextResponse } from "next/server";
import { readVideos, writeVideosFile } from "@/lib/studio/videos";
import type { VideoKind, VideoRecord, VideoStatus } from "@/lib/studio/video-types";

export const runtime = "nodejs";

// GET /api/cs/videos — channel ke saare videos ka data
export async function GET() {
  const state = readVideos();
  return NextResponse.json(state);
}

const VIDEO_STATUSES: VideoStatus[] = ["uploaded", "scheduled", "processing", "failed"];
const VIDEO_KINDS: VideoKind[] = ["long", "short"];

function pickString(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" ? v : undefined;
}

function pickNumber(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

// POST /api/cs/videos — agent ka video record create/update (studio_video_record tool)
// Upsert semantics: `id` diya aur record maujood → merge patch; warna naya record.
// Sirf validated fields accept hote hain — baki sab ignore.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "JSON body required" }, { status: 400 });
    }

    const title = pickString(body, "title")?.trim();
    if (!title) {
      return NextResponse.json({ error: "title required (video ka final title)" }, { status: 400 });
    }

    const state = readVideos();
    const id = pickString(body, "id")?.trim() || `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const existing = state.videos.find((v) => v.id === id);

    const kind = VIDEO_KINDS.includes(body.kind as VideoKind) ? (body.kind as VideoKind) : existing?.kind ?? "long";
    const status = VIDEO_STATUSES.includes(body.status as VideoStatus)
      ? (body.status as VideoStatus)
      : existing?.status ?? "processing";

    // packaging object ko bhi patch-style merge karo (deep nahi — top-level fields)
    const packagingIn =
      body.packaging && typeof body.packaging === "object" ? (body.packaging as Record<string, unknown>) : undefined;

    const base: VideoRecord = existing ?? {
      id,
      title,
      topic: "",
      kind,
      status,
      duration: "--:--",
      hue: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0) * 31, 0)) % 360,
      script: "",
      pipeline: [],
      experiments: [],
    };

    // ---- validated patch ----
    base.title = title;
    if (pickString(body, "topic") !== undefined) base.topic = pickString(body, "topic")!;
    if (kind) base.kind = kind;
    if (status) base.status = status;
    if (pickString(body, "duration") !== undefined) base.duration = pickString(body, "duration")!;
    if (pickNumber(body, "hue") !== undefined) base.hue = pickNumber(body, "hue")!;
    if (pickString(body, "script") !== undefined) base.script = pickString(body, "script")!;
    if (pickString(body, "scheduledFor") !== undefined) base.scheduledFor = pickString(body, "scheduledFor")!;
    if (pickString(body, "publishedAt") !== undefined) base.publishedAt = pickString(body, "publishedAt")!;
    if (pickString(body, "failReason") !== undefined) base.failReason = pickString(body, "failReason")!;
    if (pickString(body, "failedStage") !== undefined) base.failedStage = pickString(body, "failedStage")!;
    if (pickString(body, "failedAt") !== undefined) base.failedAt = pickString(body, "failedAt")!;

    if (body.progress && typeof body.progress === "object") {
      const p = body.progress as Record<string, unknown>;
      base.progress = {
        stage: typeof p.stage === "string" ? p.stage : base.progress?.stage ?? "",
        pct: typeof p.pct === "number" ? Math.max(0, Math.min(100, p.pct)) : base.progress?.pct ?? 0,
        note: typeof p.note === "string" ? p.note : base.progress?.note,
      };
    }

    // pipeline skills used — StageSkill[] shape: { stage, skills: [{name, version}] }
    if (Array.isArray(body.pipeline)) {
      base.pipeline = (body.pipeline as Array<Record<string, unknown>>)
        .filter((s) => s && typeof s.stage === "string" && Array.isArray(s.skills))
        .map((s) => ({
          stage: String(s.stage),
          skills: (s.skills as Array<Record<string, unknown>>)
            .filter((k) => k && typeof k.name === "string")
            .map((k) => ({ name: String(k.name), version: String(k.version ?? "1.0.0") })),
        }));
    }

    // experiments used — { title, technique }[]
    if (Array.isArray(body.experiments)) {
      base.experiments = (body.experiments as Array<Record<string, unknown>>)
        .filter((e) => e && typeof e.title === "string" && typeof e.technique === "string")
        .map((e) => ({ title: String(e.title), technique: String(e.technique) }));
    }

    // packaging (seo_prep ka output) — title/titleNote/description/tags/hashtags/chapters/endScreen/pinnedComment
    if (packagingIn) {
      const cur = base.packaging;
      base.packaging = {
        title: typeof packagingIn.title === "string" ? packagingIn.title : base.title,
        titleNote: typeof packagingIn.titleNote === "string" ? packagingIn.titleNote : cur?.titleNote ?? "",
        description: typeof packagingIn.description === "string" ? packagingIn.description : cur?.description ?? "",
        tags: Array.isArray(packagingIn.tags) ? packagingIn.tags.map(String) : cur?.tags ?? [],
        hashtags: Array.isArray(packagingIn.hashtags) ? packagingIn.hashtags.map(String) : cur?.hashtags,
        chapters: Array.isArray(packagingIn.chapters)
          ? (packagingIn.chapters as Array<Record<string, unknown>>)
              .filter((c) => c && typeof c.time === "string" && typeof c.label === "string")
              .map((c) => ({ time: String(c.time), label: String(c.label) }))
          : cur?.chapters,
        endScreen: typeof packagingIn.endScreen === "string" ? packagingIn.endScreen : cur?.endScreen,
        pinnedComment: typeof packagingIn.pinnedComment === "string" ? packagingIn.pinnedComment : cur?.pinnedComment,
      };
    }

    if (!existing) state.videos.unshift(base);
    writeVideosFile(state);
    return NextResponse.json({ video: base, created: !existing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video record save nahi hua";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
