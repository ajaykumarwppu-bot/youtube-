"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Thumb } from "@/components/studio/brain/thumb";
import { formatViews, timeAgo } from "@/lib/studio/brain-format";
import { VideoDetail } from "./video-detail";
import type { VideoKind, VideoRecord, VideoStatus, VideosState } from "@/lib/studio/video-types";

type KindFilter = "all" | "long" | "short";
type StatusFilter = "all" | VideoStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "uploaded", label: "Uploaded" },
  { key: "scheduled", label: "Scheduled" },
  { key: "processing", label: "In Progress" },
  { key: "failed", label: "Failed" },
];

const STATUS_META: Record<VideoStatus, { label: string; cls: string }> = {
  uploaded: { label: "Uploaded", cls: "border-emerald-400/50 text-emerald-400" },
  scheduled: { label: "Scheduled", cls: "border-amber-400/50 text-amber-400" },
  processing: { label: "In Progress", cls: "border-primary/50 text-primary" },
  failed: { label: "Failed", cls: "border-destructive/60 text-destructive" },
};

// VIDEOS tab — channel ke aaj tak ke saare videos: analytics, script, pipeline, experiments
export function VideosScreen() {
  const [state, setState] = useState<VideosState | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/cs/videos");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setState(j as VideosState);
    } catch (e) {
      toast.error("Videos load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const videos = state?.videos ?? [];

  const byStatus = useMemo(() => {
    const m: Record<StatusFilter, number> = { all: videos.length, uploaded: 0, scheduled: 0, processing: 0, failed: 0 };
    for (const v of videos) m[v.status] += 1;
    return m;
  }, [videos]);

  const list = useMemo(() => {
    const filtered = videos.filter(
      (v) => (kind === "all" || v.kind === kind) && (status === "all" || v.status === status)
    );
    const dateOf = (v: VideoRecord) => v.publishedAt ?? v.scheduledFor ?? v.failedAt ?? new Date().toISOString();
    return [...filtered].sort((a, b) => new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime());
  }, [videos, kind, status]);

  if (selectedId) {
    const video = videos.find((v) => v.id === selectedId);
    if (video) return <VideoDetail video={video} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Film className="h-5 w-5 text-primary" /> Videos
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Aaj tak ke saare videos — analytics, script, pipeline aur experiments ka pura data.
          </p>
        </div>
      </div>

      {/* summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: byStatus.all },
          { label: "Uploaded", value: byStatus.uploaded },
          { label: "Running", value: byStatus.processing + byStatus.scheduled },
          { label: "Failed", value: byStatus.failed },
        ].map((s) => (
          <Card key={s.label} className="p-0">
            <CardContent className="flex flex-col items-center gap-1 p-2.5 text-center">
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* kind filter: All / Long / Short */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
        {(["all", "long", "short"] as KindFilter[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`h-9 rounded-lg text-[12px] font-medium capitalize transition-colors ${
              kind === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {k === "all" ? "All Videos" : `${k} videos`}
          </button>
        ))}
      </div>

      {/* status filter: All / Uploaded / Scheduled / In Progress / Failed */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              aria-pressed={active}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground active:bg-secondary"
              }`}
            >
              {f.label}
              <span className={`rounded-full px-1.5 text-[9px] leading-[14px] ${active ? "bg-primary/20" : "bg-secondary"}`}>
                {byStatus[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-card/60" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-10 text-center text-[13px] text-muted-foreground">
            Is filter me koi video nahi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((v) => (
            <VideoCard key={v.id} video={v} onOpen={() => setSelectedId(v.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video: v, onOpen }: { video: VideoRecord; onOpen: () => void }) {
  const s = STATUS_META[v.status];
  const meta =
    v.status === "uploaded" && v.metrics
      ? `${formatViews(v.metrics.views)} views • ${timeAgo(v.publishedAt ?? "")}`
      : v.status === "scheduled" && v.scheduledFor
        ? `Upload: ${new Date(v.scheduledFor).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}`
        : v.status === "processing" && v.progress
          ? `${v.progress.stage} — ${v.progress.pct}%`
          : v.status === "failed" && v.failedStage
            ? `${v.failedStage} stage par fail`
            : "";

  return (
    <button type="button" onClick={onOpen} className="block w-full text-left">
      <Card className="p-0 transition-colors active:bg-secondary/60">
        <CardContent className="flex items-start gap-3 p-3">
          <Thumb hue={v.hue} duration={v.duration} kind={v.kind} className="h-[76px] w-[134px]" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{v.title}</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{meta}</p>
            <div className="mt-1.5">
              <Badge variant="outline" className={`gap-1 px-1.5 py-0 text-[10px] ${s.cls}`}>
                {v.status === "processing" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />}
                {s.label}
              </Badge>
            </div>
          </div>
          <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </button>
  );
}
