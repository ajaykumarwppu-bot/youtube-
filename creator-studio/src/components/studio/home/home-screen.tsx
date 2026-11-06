"use client";

// HOME (Dashboard) — overall channel health + snapshot
// READ-ONLY screen: koi mutation nahi. Data /api/cs/dashboard se aata hai
// (videos.json + brain.json ka aggregate). Skills stats page.tsx se props me.

import { useEffect, useState } from "react";
import {
  Activity, BrainCircuit, CalendarClock, CheckCircle2, ChevronRight,
  Eye, FlaskConical, Gauge, MousePointerClick, Percent, Target,
  TrendingDown, TrendingUp, Timer, Users, XCircle, Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Thumb } from "@/components/studio/brain/thumb";
import { formatViews, timeAgo } from "@/lib/studio/brain-format";
import type { DashboardData, HealthComponent, MonetizationReq, Tone } from "@/lib/studio/dashboard-types";
import type { VideoKind } from "@/lib/studio/video-types";

const TONE_COLOR: Record<Tone, string> = { good: "#4ade80", ok: "#fbbf24", bad: "#f87171" };

const AXIS = { fill: "#aaaaaa", fontSize: 10 };
const GRID = "#272727";

interface SkillsStats {
  packages: number;
  skills: number;
  enabledSkills: number;
  versions: number;
}

export function HomeScreen({ skillsStats }: { skillsStats: SkillsStats }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/cs/dashboard");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Load failed");
        if (alive) setData(j as DashboardData);
      } catch (e) {
        toast.error("Dashboard load failed", { description: e instanceof Error ? e.message : "" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-card/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Activity className="h-5 w-5 text-primary" /> Channel Health
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {data.channelName} — pura channel ek nazar me.
          </p>
        </div>
        <span className="mt-1 shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          Last 28 days
        </span>
      </div>

      {/* health score card */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <HealthGauge score={data.health.score} tone={data.health.tone} label={data.health.label} />
            <div className="min-w-0 flex-1 space-y-2.5">
              {data.health.components.map((c) => (
                <HealthBar key={c.key} comp={c} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* quick stats 2x3 — sab real calculations */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Eye} label="Total Views" value={formatViews(data.totals.views)} sub={`${data.totals.uploadedCount} uploads`} />
        <StatCard icon={Gauge} label="Impressions" value={formatViews(data.totals.totalImpressions)} sub={`Avg ${formatViews(data.totals.avgImpressions)}/video`} />
        <StatCard icon={MousePointerClick} label="Avg CTR" value={`${data.totals.avgCtr}%`} sub="Impressions-weighted" />
        <StatCard icon={Percent} label="Retention" value={`${data.totals.avgRetention}%`} sub={`Avg watch ${data.totals.avgWatchTime}`} />
        <StatCard icon={Timer} label="Watch Time" value={`${formatViews(data.totals.watchHours)} hrs`} sub={`Likes ${formatViews(data.totals.likes)} • ${formatViews(data.totals.comments)} comments`} />
        <StatCard icon={Users} label="Subscribers" value={`+${formatViews(data.totals.subsGained)}`} sub="Total gained — saare videos se" />
      </div>

      {/* impressions trend */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-[14px] font-semibold leading-tight">Daily impressions</p>
              <p className="text-[11px] text-muted-foreground">Pichle 28 din — saare videos mila ke</p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                data.trend.delta7 >= 0
                  ? "border-emerald-400/40 text-emerald-400"
                  : "border-destructive/50 text-destructive"
              }`}
            >
              {data.trend.delta7 >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {data.trend.delta7 >= 0 ? "+" : ""}{data.trend.delta7}%
            </span>
          </div>
          <p className="mb-1 text-[11px] text-muted-foreground">
            7 din: {formatViews(data.trend.last7)} • pichle 7: {formatViews(data.trend.prev7)}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.trend.series} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="homeImpFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff0033" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ff0033" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatViews(v)} width={44} />
              <Tooltip
                contentStyle={{ background: "#212121", border: "1px solid #303030", borderRadius: 8, fontSize: 12, color: "#f1f1f1" }}
                labelStyle={{ color: "#f1f1f1" }}
                formatter={(v) => [formatViews(Number(v)), "Impressions"]}
              />
              <Area type="monotone" dataKey="value" stroke="#ff0033" strokeWidth={2} fill="url(#homeImpFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* pipeline snapshot */}
      <Card className="p-0">
        <CardContent className="divide-y divide-border p-0">
          <p className="flex items-center gap-2 px-4 pt-3.5 pb-2 text-[14px] font-semibold">
            <Gauge className="h-4 w-4 text-primary" /> Pipeline snapshot
          </p>
          {data.pipeline.nextScheduled && (
            <PipelineRow
              icon={<CalendarClock className="h-4 w-4 text-amber-400" />}
              title={data.pipeline.nextScheduled.title}
              meta={`Scheduled — ${fmtCountdown(data.pipeline.nextScheduled.scheduledFor)} baaki (${new Date(data.pipeline.nextScheduled.scheduledFor).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })})`}
              metaTone="text-amber-400"
              kind={data.pipeline.nextScheduled.kind}
              hue={data.pipeline.nextScheduled.hue}
              duration={data.pipeline.nextScheduled.duration}
            />
          )}
          {data.pipeline.inProgress && (
            <div className="px-4 py-3">
              <PipelineRow
                icon={<span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
                title={data.pipeline.inProgress.title}
                meta={`${data.pipeline.inProgress.stage} — ${data.pipeline.inProgress.pct}%`}
                metaTone="text-primary"
                kind={data.pipeline.inProgress.kind}
                hue={data.pipeline.inProgress.hue}
                duration={data.pipeline.inProgress.duration}
              />
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${data.pipeline.inProgress.pct}%` }} />
              </div>
            </div>
          )}
          {data.pipeline.latestFailed && (
            <PipelineRow
              icon={<XCircle className="h-4 w-4 text-destructive" />}
              title={data.pipeline.latestFailed.title}
              meta={`${data.pipeline.latestFailed.stage} par fail • ${timeAgo(data.pipeline.latestFailed.at)}`}
              metaTone="text-destructive"
              kind={data.pipeline.latestFailed.kind}
              hue={data.pipeline.latestFailed.hue}
              duration={data.pipeline.latestFailed.duration}
              note={data.pipeline.latestFailed.reason}
            />
          )}
          {data.pipeline.scheduledCount + data.pipeline.processingCount + data.pipeline.failedCount === 0 && (
            <p className="px-4 py-4 text-[13px] text-muted-foreground">
              Abhi kuch schedule/progress me nahi hai — naya video pipeline me daalo.
            </p>
          )}
        </CardContent>
      </Card>

      {/* top performer */}
      {data.topVideo && (
        <Card className="p-0">
          <CardContent className="p-4">
            <p className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" /> Top performer
            </p>
            <div className="flex items-start gap-3">
              <Thumb hue={data.topVideo.hue} duration={data.topVideo.duration} kind={data.topVideo.kind} className="h-[64px] w-[112px]" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{data.topVideo.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatViews(data.topVideo.views)} views • CTR {data.topVideo.ctr}% • {timeAgo(data.topVideo.publishedAt)}
                </p>
              </div>
              <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* agent / brain status */}
      <Card className="p-0">
        <CardContent className="p-4">
          <p className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
            <BrainCircuit className="h-4 w-4 text-primary" /> Agent status
          </p>
          <div className="space-y-2.5">
            <AgentRow
              icon={<Zap className="h-3.5 w-3.5 text-primary" />}
              label="Skills enabled"
              value={`${skillsStats.enabledSkills}/${skillsStats.skills}`}
              pct={skillsStats.skills > 0 ? (skillsStats.enabledSkills / skillsStats.skills) * 100 : 0}
            />
            <AgentRow
              icon={<FlaskConical className="h-3.5 w-3.5 text-amber-400" />}
              label="Techniques enabled (experiments)"
              value={`${data.brain.enabledTechniques}`}
              pct={100}
            />
            <AgentRow
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              label="Research done"
              value={`${data.brain.questionsDone} done${data.brain.questionsOpen > 0 ? ` • ${data.brain.questionsOpen} open` : ""}`}
              pct={data.brain.questionsDone + data.brain.questionsOpen + data.brain.questionsResearching > 0
                ? (data.brain.questionsDone / (data.brain.questionsDone + data.brain.questionsOpen + data.brain.questionsResearching)) * 100
                : 0}
            />
          </div>
          <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Next video me agent ye skills + enabled techniques apne pipeline stages (Research → Script → Thumbnail → Upload) me use karega.
            Brain ke Experiments tab se control karo.
          </p>
        </CardContent>
      </Card>

      {/* monetization targets — YPP official thresholds ke against progress */}
      <Card className="p-0">
        <CardContent className="p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <Target className="h-4 w-4 text-primary" /> Monetization targets
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            YouTube Partner Program ke official rules — kitna poora, kitna baaki.
          </p>

          <div className="mt-3 space-y-3">
            {data.monetization.tiers.map((tier) => (
              <div key={tier.key} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-semibold leading-tight">{tier.name}</p>
                  {tier.complete ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-amber-400/40 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                      In progress
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">{tier.desc}</p>
                <div className="mt-2.5 space-y-2">
                  {tier.reqs.map((r) => (
                    <div key={r.key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[11.5px] font-medium">{r.label}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          <span className="font-semibold text-foreground">{fmtReq(r.current, r.unit)}</span>
                          {" / "}{fmtReq(r.target, r.unit)}
                          {r.complete ? (
                            <span className="text-emerald-400"> • poora ✓</span>
                          ) : r.etaDays !== null ? (
                            <span className="text-amber-400"> • ~{r.etaDays}d aur</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${r.complete ? "bg-emerald-400" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, Math.max(3, r.pct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {data.monetization.tiers[1].complete && (
            <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-[12px] font-medium text-emerald-400">
              Monetization ready — dono tier poore hain, YPP me apply ho sakta hai!
            </p>
          )}

          <div className="mt-3 space-y-1.5 rounded-lg bg-secondary/60 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Channel age: <span className="font-semibold text-foreground">{data.monetization.channelAgeDays} din</span> • Pace:{" "}
              <span className="font-semibold text-foreground">~{formatViews(data.monetization.pace.subsPerWeek)} subs/wk</span>,{" "}
              <span className="font-semibold text-foreground">~{formatViews(data.monetization.pace.hoursPerWeek)} hrs/wk</span>
            </p>
            {data.monetization.notes.map((n, i) => (
              <p key={i} className="text-[10.5px] leading-relaxed text-muted-foreground">• {n}</p>
            ))}
            <p className="text-[10px] text-muted-foreground/70">Source: {data.monetization.source}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- sub-components ---------- */

function HealthGauge({ score, tone, label }: { score: number; tone: Tone; label: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = TONE_COLOR[tone];
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#272727" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[26px] font-bold leading-none">{score}</p>
        <p className="mt-1 text-[11px] font-medium" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

function HealthBar({ comp }: { comp: HealthComponent }) {
  const color = comp.score >= 80 ? "bg-emerald-400" : comp.score >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[12.5px] font-medium">{comp.label}</p>
        <p className="shrink-0 text-[12px] font-semibold tabular-nums">{comp.score}</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${comp.score}%` }} />
      </div>
      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{comp.hint}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Eye; label: string; value: string; sub: string;
}) {
  return (
    <Card className="p-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <p className="text-[11px]">{label}</p>
        </div>
        <p className="mt-1 text-[19px] font-bold leading-none">{value}</p>
        <p className="mt-1 truncate text-[10.5px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function PipelineRow({ icon, title, meta, metaTone, kind, hue, duration, note }: {
  icon: React.ReactNode; title: string; meta: string; metaTone: string;
  kind: VideoKind; hue: number; duration: string; note?: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Thumb hue={hue} duration={duration} kind={kind} className="h-[52px] w-[92px]" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-[13px] font-semibold leading-snug">{title}</p>
        <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${metaTone}`}>
          {icon} {meta}
        </p>
        {note && <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{note}</p>}
      </div>
    </div>
  );
}

function AgentRow({ icon, label, value, pct }: {
  icon: React.ReactNode; label: string; value: string; pct: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium">{icon} {label}</p>
        <p className="shrink-0 text-[12px] font-semibold tabular-nums">{value}</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(4, pct))}%` }} />
      </div>
    </div>
  );
}

// monetization numbers — subs/hrs comma ke saath (1,618), uploads plain
function fmtReq(n: number, unit: MonetizationReq["unit"]): string {
  if (unit === "uploads") return `${n}`;
  return n.toLocaleString("en-IN");
}

// scheduled upload ka countdown — "2d 4h" / "5h 30m" / "abhi"
function fmtCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "abhi";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}
