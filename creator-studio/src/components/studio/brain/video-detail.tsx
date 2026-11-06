"use client";

import {
  Activity, ArrowRight, Eye, Link2, MessageSquare, MousePointerClick, ThumbsUp, Timer, TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailBar } from "./detail-bar";
import { Thumb } from "./thumb";
import { AREA_LABEL, ctrLevel, formatViews, retentionLevel, timeAgo } from "@/lib/studio/brain-format";
import type { BrainState, ProblemArea, VideoEntry } from "@/lib/studio/brain-types";

interface Props {
  video: VideoEntry;
  brain: BrainState;
  onBack: () => void;
  onOpenQuestion: (id: string) => void;
  onSendToResearch: (areas: ProblemArea[], videoId: string) => Promise<void>;
}

// VIDEO DETAIL — problems (agent ne kya pakda) + findings (kya seekha) + raised questions
export function VideoDetail({ video, brain, onBack, onOpenQuestion, onSendToResearch }: Props) {
  const ctr = ctrLevel(video.metrics.ctr);
  const ret = retentionLevel(video.kind, video.metrics.retention);
  const toneClass = { bad: "text-destructive", ok: "text-amber-400", good: "text-emerald-400" };

  // kaunse problem areas already kisi question me covered hain
  const coveredAreas = new Set<ProblemArea>();
  for (const q of brain.questions) {
    for (const a of q.areas) coveredAreas.add(a);
  }

  const relatedQuestions = brain.questions.filter((q) =>
    q.sourceVideoIds.includes(video.id) || q.areas.some((a) => video.problems.some((p) => p.area === a))
  );
  const coveredInQuestion = new Set<ProblemArea>();
  for (const q of relatedQuestions) for (const a of q.areas) coveredInQuestion.add(a);

  const uncovered = video.problems.filter((p) => !coveredAreas.has(p.area));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailBar title="Video Analysis" subtitle={video.kind === "short" ? "Short video" : "Long video"} onBack={onBack} />

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4">
        {/* hero */}
        <Thumb hue={video.hue} duration={video.duration} kind={video.kind} className="aspect-video w-full" />
        <div>
          <h2 className="text-[17px] font-bold leading-snug">{video.topic}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatViews(video.metrics.views)} views • {timeAgo(video.publishedAt)} • {video.duration}
          </p>
        </div>

        {/* metrics */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Eye, label: "Views", value: formatViews(video.metrics.views) },
            { icon: MousePointerClick, label: `CTR ${ctr.label}`, value: `${video.metrics.ctr}%`, tone: toneClass[ctr.tone] },
            { icon: Timer, label: `Watched ${ret.label}`, value: `${video.metrics.retention}%`, tone: toneClass[ret.tone] },
            { icon: ThumbsUp, label: "Likes", value: formatViews(video.metrics.likes) },
          ].map((m) => (
            <Card key={m.label} className="p-0">
              <CardContent className="flex flex-col items-center gap-1 p-2.5 text-center">
                <m.icon className={`h-4 w-4 ${m.tone ?? "text-primary"}`} />
                <p className={`text-[15px] font-bold leading-none ${m.tone ?? ""}`}>{m.value}</p>
                <p className="text-[9px] leading-tight text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* problems */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TriangleAlert className="h-3.5 w-3.5 text-destructive" /> Problems — agent ne kya pakda
          </h3>
          {video.problems.length === 0 ? (
            <Card className="p-0">
              <CardContent className="flex items-center gap-2 p-3 text-[13px] text-emerald-400">
                <MessageSquare className="h-4 w-4" /> Is video me koi problem nahi mili.
              </CardContent>
            </Card>
          ) : (
            video.problems.map((p, i) => (
              <Card key={`${p.area}-${i}`} className="p-0">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px] font-semibold">{AREA_LABEL[p.area]}</Badge>
                    {coveredInQuestion.has(p.area) ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <Link2 className="h-3 w-3" /> Research me ja raha hai
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{p.note}</p>
                </CardContent>
              </Card>
            ))
          )}
          {uncovered.length > 0 && (
            <Button
              size="sm"
              className="h-10 w-full text-[13px] font-semibold"
              onClick={() => onSendToResearch(uncovered.map((p) => p.area), video.id)}
            >
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Baaki problems research bhejo ({uncovered.length})
            </Button>
          )}
        </section>

        {/* findings */}
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" /> Findings & Lessons
          </h3>
          {video.findings.map((f, i) => (
            <Card key={i} className="p-0">
              <CardContent className="flex gap-2.5 p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <p className="text-[13px] leading-relaxed">{f}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* raised questions */}
        {relatedQuestions.length > 0 && (
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5 text-primary" /> Research Questions (agent ne raise kiye)
            </h3>
            {relatedQuestions.map((q) => (
              <button key={q.id} type="button" onClick={() => onOpenQuestion(q.id)} className="block w-full text-left">
                <Card className="p-0 transition-colors active:bg-secondary/60">
                  <CardContent className="flex items-center gap-2.5 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{q.text}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {q.status === "done" ? "Report ready" : q.status === "researching" ? "Research chal rahi hai" : "Open"}
                        {" • "}{q.sourceVideoIds.length} video{q.sourceVideoIds.length > 1 ? "s" : ""} se
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
