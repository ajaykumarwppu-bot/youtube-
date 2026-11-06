"use client";

import {
  Bot, CalendarClock, CheckCircle2, Eye, FlaskConical, Film, Heart, Info,
  Lightbulb, MessageSquare, MousePointerClick, PackageCheck, Pin, ScrollText,
  Share2, Timer, TrendingUp, TriangleAlert, Users, Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DetailBar } from "@/components/studio/brain/detail-bar";
import { Markdown } from "@/components/studio/markdown";
import { formatViews, timeAgo } from "@/lib/studio/brain-format";
import { CtrChart, ImpressionsChart, RetentionChart } from "./charts";
import { MockPlayer } from "./mock-player";
import type { VideoPackaging, VideoRecord, VideoStatus } from "@/lib/studio/video-types";

interface Props {
  video: VideoRecord;
  onBack: () => void;
}

const STATUS_META: Record<VideoStatus, { label: string; cls: string }> = {
  uploaded: { label: "Uploaded", cls: "border-emerald-400/50 text-emerald-400" },
  scheduled: { label: "Scheduled", cls: "border-amber-400/50 text-amber-400" },
  processing: { label: "In Progress", cls: "border-primary/50 text-primary" },
  failed: { label: "Failed", cls: "border-destructive/60 text-destructive" },
};

export function VideoDetail({ video: v, onBack }: Props) {
  const status = STATUS_META[v.status];

  const analyticsTiles = v.metrics
    ? [
      { icon: Eye, label: "Views", value: formatViews(v.metrics.views) },
      { icon: TrendingUp, label: "Impressions", value: formatViews(v.metrics.impressions) },
      { icon: MousePointerClick, label: "CTR", value: `${v.metrics.ctr}%`, tone: v.metrics.ctr < 3 ? "text-destructive" : "text-emerald-400" },
      { icon: Timer, label: "Watch Time", value: `${formatViews(v.metrics.watchHours)} hrs` },
      { icon: Users, label: "Subs Gained", value: formatViews(v.metrics.subsGained) },
      { icon: Film, label: "Avg Duration", value: v.metrics.avgViewDuration },
      { icon: Heart, label: "Likes", value: formatViews(v.metrics.likes) },
      { icon: MessageSquare, label: "Comments", value: formatViews(v.metrics.comments) },
      { icon: Share2, label: "Shares", value: formatViews(v.metrics.shares) },
    ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailBar title="Video Details" subtitle={status.label} onBack={onBack} right={<StatusBadge status={v.status} />} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {/* video player — prototype demo player, Phase 2 me agent ka rendered video */}
        <div>
          <MockPlayer hue={v.hue} duration={v.duration} kind={v.kind} />
          <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
            Demo player — Phase 2 me agent ka rendered video yahan chalega.
          </p>
        </div>

        {/* title + meta */}
        <div>
          <h2 className="text-[17px] font-bold leading-snug">{v.title}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {v.kind === "short" ? "Short" : "Long"} • {v.duration}
            {v.publishedAt ? ` • ${timeAgo(v.publishedAt)}` : ""}
          </p>
        </div>

        {/* status-specific info */}
        {v.status === "scheduled" && v.scheduledFor && (
          <InfoCard
            icon={<CalendarClock className="h-4 w-4 text-amber-400" />}
            title={`Upload hoga: ${new Date(v.scheduledFor).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}`}
            text="Ye video schedule ho chuki hai — is time par agent automatically upload kar dega."
          />
        )}
        {v.status === "processing" && v.progress && (
          <Card className="border-primary/30 p-0">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  {v.progress.stage} — {v.progress.pct}%
                </p>
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">In Progress</Badge>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${v.progress.pct}%` }} />
              </div>
              {v.progress.note && (
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{v.progress.note}</p>
              )}
            </CardContent>
          </Card>
        )}
        {v.status === "failed" && v.failReason && (
          <Card className="border-destructive/40 p-0">
            <CardContent className="p-3.5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-destructive">
                <TriangleAlert className="h-4 w-4" /> Fail — {v.failedStage} stage
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{v.failReason}</p>
              {v.failedAt && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">Detected: {timeAgo(v.failedAt)}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* analytics — sirf uploaded videos par (YouTube Studio style) */}
        {v.metrics && (
          <>
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" /> Analytics — pura data
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {analyticsTiles.map((t) => (
                  <Card key={t.label} className="p-0">
                    <CardContent className="flex flex-col items-center gap-1 p-2.5 text-center">
                      <t.icon className={`h-4 w-4 ${t.tone ?? "text-primary"}`} />
                      <p className={`text-[14px] font-bold leading-none ${t.tone ?? ""}`}>{t.value}</p>
                      <p className="text-[9px] leading-tight text-muted-foreground">{t.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* graphs */}
            {v.impressionsSeries && (
              <GraphCard title="Impressions — roz kitne logon tak pahuncha" total={`${formatViews(v.metrics.impressions)} total`}>
                <ImpressionsChart data={v.impressionsSeries} />
              </GraphCard>
            )}
            {v.ctrSeries && (
              <GraphCard title="CTR — kitne log click kar rahe hain" total={`avg ${v.metrics.ctr}%`}>
                <CtrChart data={v.ctrSeries} />
              </GraphCard>
            )}
            {v.retentionCurve && (
              <GraphCard title="Audience Retention — log kitna dekh rahe hain" total={`end ${v.retentionCurve[v.retentionCurve.length - 1]?.pct ?? 0}%`}>
                <RetentionChart data={v.retentionCurve} />
              </GraphCard>
            )}
          </>
        )}

        {/* topic */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary" /> Topic
          </h3>
          <Card className="p-0">
            <CardContent className="p-3.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{v.topic}</p>
            </CardContent>
          </Card>
        </section>

        {/* upload package — seo_prep stage ka output (script se pehle packaging dikhta hai) */}
        {v.packaging ? (
          <PackagingBlock p={v.packaging} kind={v.kind} />
        ) : (
          <section className="space-y-1.5">
            <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              <PackageCheck className="h-3.5 w-3.5 text-primary" /> Upload Package
            </h3>
            <Card className="p-0">
              <CardContent className="p-3.5">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Upload package abhi ready nahi hua — SEO &amp; Upload Prep stage complete hone par title,
                  description, tags, chapters, end screen aur pinned comment yahan dikhte hain.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

        {/* script */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5 text-primary" /> Script — agent ne ye likhi thi
          </h3>
          <Card className="p-0">
            <CardContent className="p-3.5">
              <Markdown content={v.script} />
            </CardContent>
          </Card>
        </section>

        {/* pipeline + skills used */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Wrench className="h-3.5 w-3.5 text-primary" /> Pipeline — kaunsi skills, kaunse version
          </h3>
          {v.pipeline.map((st, i) => (
            <Card key={st.stage} className="p-0">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-[13px] font-semibold">{st.stage}</p>
                  {v.status === "processing" && v.progress?.stage === st.stage && (
                    <Badge variant="outline" className="border-primary/40 text-[9px] text-primary">chal raha hai</Badge>
                  )}
                  {v.status === "failed" && v.failedStage === st.stage && (
                    <Badge variant="outline" className="border-destructive/50 text-[9px] text-destructive">fail hua</Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-7">
                  {st.skills.map((s) => (
                    <Badge key={s.name} variant="secondary" className="gap-1 font-mono text-[10px]">
                      <Bot className="h-3 w-3 text-primary" /> {s.name} <span className="text-muted-foreground">v{s.version}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* experiments used */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5 text-primary" /> Experiments — Brain se kya try kiya
          </h3>
          {v.experiments.length === 0 ? (
            <Card className="p-0">
              <CardContent className="p-3.5 text-[13px] text-muted-foreground">
                Is video me koi experiment use nahi hua.
              </CardContent>
            </Card>
          ) : (
            v.experiments.map((e, i) => (
              <Card key={i} className="border-emerald-400/20 p-0">
                <CardContent className="flex gap-2.5 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-muted-foreground">{e.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed">{e.technique}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

// Upload Package — seo_prep stage ne kya-kya ready kiya (structured: title, description,
// tags, chapters, end screen, pinned comment). Script se PEHLE dikhta hai.
function PackagingBlock({ p, kind }: { p: VideoPackaging; kind: "long" | "short" }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        <PackageCheck className="h-3.5 w-3.5 text-primary" /> Upload Package — video ke saath ye ready hua
      </h3>

      {/* Title — final title + kis angle se likha */}
      <Card className="border-primary/25 p-0">
        <CardContent className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Title</p>
          <p className="mt-1 text-[14px] font-semibold leading-snug">{p.title}</p>
          <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>{p.titleNote}</span>
          </p>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="p-0">
        <CardContent className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
          <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{p.description}</p>
        </CardContent>
      </Card>

      {/* Tags + hashtags */}
      <Card className="p-0">
        <CardContent className="p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tags — {p.tags.length} tags{p.hashtags?.length ? ` + ${p.hashtags.length} hashtags` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[10px] font-normal">{t}</Badge>
            ))}
          </div>
          {p.hashtags && p.hashtags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.hashtags.map((h) => (
                <Badge key={h} variant="outline" className="border-primary/30 text-[10px] font-medium text-primary">{h}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chapters — sirf long videos */}
      {p.chapters && p.chapters.length > 0 && (
        <Card className="p-0">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chapters — {p.chapters.length}
            </p>
            <div className="mt-2 space-y-1">
              {p.chapters.map((c) => (
                <div key={c.time} className="flex items-center gap-2.5">
                  <span className="w-10 shrink-0 rounded bg-secondary px-1 py-0.5 text-center font-mono text-[10px] font-semibold text-foreground/80">{c.time}</span>
                  <span className="text-[12.5px] leading-relaxed">{c.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* End screen */}
      {p.endScreen && (
        <Card className="p-0">
          <CardContent className="p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">End Screen</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{p.endScreen}</p>
          </CardContent>
        </Card>
      )}

      {/* Pinned comment */}
      {p.pinnedComment && (
        <Card className="border-amber-400/25 p-0">
          <CardContent className="p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Pin className="h-3 w-3 rotate-45 text-amber-400" /> Pinned Comment — upload ke baad pin hoga
            </p>
            <p className="mt-1.5 flex gap-2 text-[12.5px] leading-relaxed">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
              <span>{p.pinnedComment}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {kind === "short" && (
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/70">
          Short video — chapters YouTube shorts par nahi dikhte, isliye package me nahi hain.
        </p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: VideoStatus }) {
  const s = STATUS_META[status];
  return <Badge variant="outline" className={`shrink-0 text-[10px] ${s.cls}`}>{s.label}</Badge>;
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="p-0">
      <CardContent className="p-3.5">
        <p className="flex items-center gap-2 text-[13px] font-semibold">{icon} {title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function GraphCard({ title, total, children }: { title: string; total: string; children: React.ReactNode }) {
  return (
    <Card className="p-0">
      <CardContent className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium leading-snug text-muted-foreground">{title}</p>
          <p className="shrink-0 font-mono text-[11px] font-semibold text-foreground">{total}</p>
        </div>
        <div className="mt-2">{children}</div>
      </CardContent>
    </Card>
  );
}
