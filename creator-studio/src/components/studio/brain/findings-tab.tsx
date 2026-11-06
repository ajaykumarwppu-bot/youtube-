"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Thumb } from "./thumb";
import { formatViews, timeAgo } from "@/lib/studio/brain-format";
import type { VideoEntry } from "@/lib/studio/brain-types";

type KindFilter = "all" | "long" | "short";

// FINDINGS / LESSONS tab — channel ke videos YouTube-feed style, naye upar.
// Har video par tap → problems + findings detail. (Prototype sample data —
// Phase 2 me Analytics section ye feed automatic feed karega.)
export function FindingsTab({ videos, onOpenVideo }: { videos: VideoEntry[]; onOpenVideo: (id: string) => void }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [oldestFirst, setOldestFirst] = useState(false);

  const list = useMemo(() => {
    const filtered = kind === "all" ? videos : videos.filter((v) => v.kind === kind);
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    return oldestFirst ? sorted.reverse() : sorted;
  }, [videos, kind, oldestFirst]);

  return (
    <div className="space-y-3">
      {/* sample-data note */}
      <Card className="border-dashed p-0">
        <CardContent className="flex items-start gap-2.5 p-3">
          <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">Sample</Badge>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Ye sample videos hain — jab Analytics module connect hoga, agent har naye video ka
            analysis yahan automatic dalega (naye upar, purane neeche).
          </p>
        </CardContent>
      </Card>

      {/* filters: kind chips + sort toggle */}
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
          {(["all", "long", "short"] as KindFilter[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`h-8 rounded-lg text-[12px] font-medium capitalize transition-colors ${
                kind === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {k === "all" ? "All" : `${k} videos`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOldestFirst((v) => !v)}
          aria-label="Change sort order"
          className="flex h-10 items-center gap-1.5 rounded-xl bg-secondary px-3 text-[12px] font-medium text-muted-foreground active:bg-secondary/70"
        >
          {oldestFirst ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
          {oldestFirst ? "Purane" : "Naye"}
        </button>
      </div>

      {/* feed */}
      {list.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-10 text-center text-[13px] text-muted-foreground">
            Is filter me koi video nahi.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((v) => {
            const issue = v.problems.length > 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onOpenVideo(v.id)}
                className="block w-full rounded-xl text-left transition-colors active:bg-secondary/60"
              >
                <Card className="p-0">
                  <CardContent className="flex items-start gap-3 p-3">
                    <Thumb hue={v.hue} duration={v.duration} kind={v.kind} className="h-[76px] w-[134px]" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{v.topic}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatViews(v.metrics.views)} views • {timeAgo(v.publishedAt)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {issue ? (
                          <Badge variant="outline" className="gap-1 border-destructive/50 px-1.5 py-0 text-[10px] text-destructive">
                            <TriangleAlert className="h-3 w-3" /> {v.problems.length} problem{v.problems.length > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> All good
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
