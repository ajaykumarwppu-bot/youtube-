// Creator Studio — Home (Dashboard) server compute
// Server-only file (uses stores) — client sirf dashboard-types.ts import kare.
// READ-ONLY: readVideos() + readBrain() ko read karta hai, koi mutation nahi.
//
// CALCULATIONS — sab transparent, koi random number nahi:
// - avgCtr         = sum(ctr × impressions) / sum(impressions)   (impressions-weighted)
// - retention      = avgViewDuration / duration per video → views-weighted average
// - avgWatchTime   = total watch seconds / total views
// - views score    = recent 3 uploads ka avg vs purane 3 ka avg (growth direction)
// - engagement     = (likes + comments) / views
// - monetization   = YouTube Partner Program official thresholds (researched):
//     Fan funding:  500 subs + 3 uploads/90d + 3,000 watch hrs (12mo) | 3M Shorts views/90d
//     Ad revenue:   1,000 subs + 4,000 watch hrs (12mo) | 10M Shorts views/90d
//     1 Feb 2027 se naye applicants: 8,000 hrs | 20M Shorts views

import { readVideos } from "./videos";
import { readBrain } from "./brain";
import { formatViews } from "./brain-format";
import type {
  DashboardData,
  HealthComponent,
  MiniVideoRef,
  MonetizationData,
  MonetizationReq,
  Tone,
  TrendPoint,
} from "./dashboard-types";
import type { VideoRecord } from "./video-types";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// "14:22" -> seconds
function durToSec(s: string): number {
  const parts = s.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
  return 0;
}

// seconds -> "1:42"
function fmtDur(totalSec: number): string {
  const s = Math.round(totalSec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

const toneOf = (score: number): Tone => (score >= 80 ? "good" : score >= 60 ? "ok" : "bad");

function miniRef(v: VideoRecord): MiniVideoRef {
  return { id: v.id, title: v.title, kind: v.kind, hue: v.hue, duration: v.duration };
}

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function buildDashboard(): DashboardData {
  const videos = readVideos().videos;
  const brain = readBrain();

  const uploaded = videos.filter((v) => v.status === "uploaded" && v.metrics);
  const scheduled = videos
    .filter((v) => v.status === "scheduled" && v.scheduledFor)
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
  const processing = videos
    .filter((v) => v.status === "processing" && v.progress)
    .sort((a, b) => (b.progress?.pct ?? 0) - (a.progress?.pct ?? 0));
  const failed = videos
    .filter((v) => v.status === "failed")
    .sort((a, b) => new Date(b.failedAt ?? 0).getTime() - new Date(a.failedAt ?? 0).getTime());

  // ---------- totals (real sums) ----------
  const totalImpressions = uploaded.reduce((s, v) => s + (v.metrics?.impressions ?? 0), 0);
  const watchHoursRaw = uploaded.reduce((s, v) => s + (v.metrics?.watchHours ?? 0), 0);
  const totals = {
    views: uploaded.reduce((s, v) => s + (v.metrics?.views ?? 0), 0),
    watchHours: Math.round(watchHoursRaw),
    subsGained: uploaded.reduce((s, v) => s + (v.metrics?.subsGained ?? 0), 0),
    likes: uploaded.reduce((s, v) => s + (v.metrics?.likes ?? 0), 0),
    comments: uploaded.reduce((s, v) => s + (v.metrics?.comments ?? 0), 0),
    totalImpressions,
    avgImpressions: uploaded.length > 0 ? Math.round(totalImpressions / uploaded.length) : 0,
    avgViews: uploaded.length > 0 ? Math.round(uploaded.reduce((s, v) => s + (v.metrics?.views ?? 0), 0) / uploaded.length) : 0,
    avgCtr: 0,
    avgRetention: 0,
    avgWatchTime: "0:00",
    uploadedCount: uploaded.length,
  };

  // avg CTR — impressions-weighted (bade videos ka CTR zyada matter karta hai)
  totals.avgCtr =
    totalImpressions > 0
      ? round1(uploaded.reduce((s, v) => s + (v.metrics?.ctr ?? 0) * (v.metrics?.impressions ?? 0), 0) / totalImpressions)
      : 0;

  // avg watch time = total watch seconds / total views (real average per view)
  const avgWatchSec = totals.views > 0 ? (watchHoursRaw * 3600) / totals.views : 0;
  totals.avgWatchTime = fmtDur(avgWatchSec);

  // per-video retention = avgViewDuration / duration → views-weighted average
  let retWeighted = 0;
  for (const v of uploaded) {
    const dur = durToSec(v.duration);
    const avd = durToSec(v.metrics?.avgViewDuration ?? "0:00");
    const pct = dur > 0 ? clamp((avd / dur) * 100, 0, 100) : 0;
    retWeighted += pct * (v.metrics?.views ?? 0);
  }
  totals.avgRetention = totals.views > 0 ? Math.round(retWeighted / totals.views) : 0;

  // ---------- health components ----------
  const components: HealthComponent[] = [];

  // 1. CTR — impressions-weighted avg vs 5% target (YouTube me 5%+ achha mana jata hai)
  const ctrScore = Math.round(clamp((totals.avgCtr / 5) * 100, 0, 100));
  components.push({
    key: "ctr",
    label: "Packaging (CTR)",
    hint: `Avg CTR ${totals.avgCtr}% (target 5%+)`,
    score: ctrScore,
  });

  // 2. Retention — long target 40%, short target 75% (kind ke hisaab se, views-weighted)
  let retScoreWeighted = 0;
  for (const v of uploaded) {
    const dur = durToSec(v.duration);
    const avd = durToSec(v.metrics?.avgViewDuration ?? "0:00");
    const pct = dur > 0 ? clamp((avd / dur) * 100, 0, 100) : 0;
    const target = v.kind === "long" ? 40 : 75;
    retScoreWeighted += clamp((pct / target) * 100, 0, 100) * (v.metrics?.views ?? 0);
  }
  const retentionScore = totals.views > 0 ? Math.round(retScoreWeighted / totals.views) : 0;
  components.push({
    key: "retention",
    label: "Retention",
    hint: `Avg ${totals.avgRetention}% viewed • avg watch ${totals.avgWatchTime}`,
    score: retentionScore,
  });

  // 3. Views — recent 3 uploads ka avg views vs purane 3 ka avg (channel grow kar raha hai ya nahi)
  const byDate = [...uploaded].sort(
    (a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
  );
  const recent = byDate.slice(0, Math.ceil(byDate.length / 2));
  const older = byDate.slice(Math.ceil(byDate.length / 2));
  const recentAvg = recent.length ? recent.reduce((s, v) => s + (v.metrics?.views ?? 0), 0) / recent.length : 0;
  const olderAvg = older.length ? older.reduce((s, v) => s + (v.metrics?.views ?? 0), 0) / older.length : 0;
  const viewsTrend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  // stable (0%) = 60, har +20% improvement = +40 score, girta hua = kam
  const viewsScore = Math.round(clamp(60 + viewsTrend * 200, 5, 100));
  components.push({
    key: "views",
    label: "Views Growth",
    hint: `Avg ${formatViews(totals.avgViews)}/video • recent ${viewsTrend >= 0 ? "+" : ""}${Math.round(viewsTrend * 100)}% vs purane`,
    score: viewsScore,
  });

  // 4. Engagement — (likes + comments) / views, 4%+ achha
  const engagementRate = totals.views > 0 ? ((totals.likes + totals.comments) / totals.views) * 100 : 0;
  const engagementScore = Math.round(clamp((engagementRate / 4) * 100, 0, 100));
  components.push({
    key: "engagement",
    label: "Engagement",
    hint: `Likes+comments ${round1(engagementRate)}% of views`,
    score: engagementScore,
  });

  // overall — CTR/Retention zyada weight (packaging + content quality), Views/Engagement support
  const score = Math.round(
    ctrScore * 0.3 + retentionScore * 0.3 + viewsScore * 0.2 + engagementScore * 0.2
  );
  const tone = toneOf(score);
  const healthLabel = score >= 80 ? "Great" : score >= 60 ? "Okay" : "Needs Work";

  // ---------- 28-day impressions trend ----------
  const dayMap = new Map<string, number>();
  for (const v of uploaded) {
    if (!v.impressionsSeries?.length || !v.publishedAt) continue;
    const start = new Date(v.publishedAt).getTime();
    v.impressionsSeries.forEach((p, i) => {
      const key = dateKey(new Date(start + i * 24 * 60 * 60 * 1000));
      dayMap.set(key, (dayMap.get(key) ?? 0) + p.value);
    });
  }
  const series: TrendPoint[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dateKey(d);
    series.push({
      day: `${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`,
      value: dayMap.get(key) ?? 0,
    });
  }
  const last7 = series.slice(-7).reduce((s, p) => s + p.value, 0);
  const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.value, 0);
  const delta7 = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;

  // ---------- pipeline snapshot ----------
  const pipeline = {
    scheduledCount: scheduled.length,
    processingCount: processing.length,
    failedCount: failed.length,
    nextScheduled: scheduled[0]
      ? { ...miniRef(scheduled[0]), scheduledFor: scheduled[0].scheduledFor! }
      : undefined,
    inProgress: processing[0]
      ? {
          ...miniRef(processing[0]),
          stage: processing[0].progress!.stage,
          pct: processing[0].progress!.pct,
          note: processing[0].progress!.note,
        }
      : undefined,
    latestFailed: failed[0]
      ? {
          ...miniRef(failed[0]),
          stage: failed[0].failedStage ?? "Unknown",
          at: failed[0].failedAt ?? new Date().toISOString(),
          reason: failed[0].failReason ?? "",
        }
      : undefined,
  };

  // ---------- top performer ----------
  const top = [...uploaded].sort((a, b) => (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0))[0];
  const topVideo = top?.metrics
    ? { ...miniRef(top), views: top.metrics.views, ctr: top.metrics.ctr, publishedAt: top.publishedAt! }
    : undefined;

  // ---------- brain / agent status ----------
  const brainStatus = {
    questionsOpen: brain.questions.filter((q) => q.status === "open").length,
    questionsResearching: brain.questions.filter((q) => q.status === "researching").length,
    questionsDone: brain.questions.filter((q) => q.status === "done").length,
    experimentReports: brain.experiments.length,
    enabledTechniques: brain.experiments.reduce(
      (s, e) => s + e.items.filter((i) => i.enabled).length,
      0
    ),
  };

  // ---------- monetization targets (YouTube Partner Program official thresholds) ----------
  const earliest = uploaded.length
    ? Math.min(...uploaded.map((v) => new Date(v.publishedAt ?? Date.now()).getTime()))
    : Date.now();
  const channelAgeDays = Math.max(1, Math.ceil((Date.now() - earliest) / 86400000));
  const subsPerWeek = Math.round((totals.subsGained / channelAgeDays) * 7);
  const hoursPerWeek = Math.round((watchHoursRaw / channelAgeDays) * 7);
  const cutoff90 = Date.now() - 90 * 86400000;
  const uploads90 = uploaded.filter((v) => new Date(v.publishedAt ?? 0).getTime() >= cutoff90).length;

  function req(key: string, label: string, unit: MonetizationReq["unit"], current: number, target: number, pacePerWeek: number): MonetizationReq {
    const complete = current >= target;
    const remaining = Math.max(0, target - current);
    const etaDays = complete || pacePerWeek <= 0 ? null : Math.ceil((remaining / pacePerWeek) * 7);
    return {
      key, label, unit, current: Math.round(current), target,
      pct: target > 0 ? Math.round((current / target) * 100) : 0,
      complete, etaDays,
    };
  }

  const tier1Reqs = [
    req("subs", "Subscribers", "subs", totals.subsGained, 500, subsPerWeek),
    req("uploads", "Uploads (90 din)", "uploads", uploads90, 3, Math.round((uploads90 / 90) * 7)),
    req("hours", "Watch hours", "hrs", watchHoursRaw, 3000, hoursPerWeek),
  ];
  const tier2Reqs = [
    req("subs", "Subscribers", "subs", totals.subsGained, 1000, subsPerWeek),
    req("hours", "Watch hours", "hrs", watchHoursRaw, 4000, hoursPerWeek),
  ];

  const monetization: MonetizationData = {
    tiers: [
      {
        key: "fan-funding",
        name: "Fan Funding — pehla milestone",
        desc: "500 subs + 3 uploads (90 din) + 3,000 watch hrs (12 mahine)",
        reqs: tier1Reqs,
        complete: tier1Reqs.every((r) => r.complete),
      },
      {
        key: "ad-revenue",
        name: "Full ad revenue — YPP",
        desc: "1,000 subs + 4,000 watch hrs (12 mahine)",
        reqs: tier2Reqs,
        complete: tier2Reqs.every((r) => r.complete),
      },
    ],
    channelAgeDays,
    pace: { subsPerWeek, hoursPerWeek },
    notes: [
      "1 Feb 2027 se naye YPP applicants ke liye ad-revenue threshold: 8,000 watch hrs ya 20M Shorts views (fan funding same rahega).",
      "Shorts route: 10M qualified Shorts views (90 din) se bhi full YPP mil jata hai.",
    ],
    source: "YouTube official — support.google.com / youtube.com/creators",
  };

  return {
    channelName: "AI Automation Hub",
    generatedAt: new Date().toISOString(),
    totals,
    health: { score, label: healthLabel, tone, components },
    trend: { series, last7, prev7, delta7 },
    pipeline,
    topVideo,
    brain: brainStatus,
    monetization,
  };
}
