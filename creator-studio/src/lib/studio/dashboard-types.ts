// Creator Studio — Home (Dashboard) types
// Client-safe file (no fs) — server compute dashboard.ts me hota hai.
// Home screen READ-ONLY hai: ye koi data mutate nahi karta, sirf videos.json +
// brain.json + packages index se overall channel health summarize karta hai.

import type { VideoKind } from "./video-types";

export type Tone = "good" | "ok" | "bad";

// health score ka ek component — score 0-100, hint me REAL calculation visible
export interface HealthComponent {
  key: string;
  label: string;
  hint: string; // actual numbers ke saath, e.g. "Avg CTR 4.7% (target 5%+)"
  score: number; // 0-100
}

// ek monetization requirement ka progress (subs / watch hours / uploads)
export interface MonetizationReq {
  key: string;
  label: string;
  unit: "subs" | "hrs" | "uploads";
  current: number;
  target: number;
  pct: number; // current/target %
  complete: boolean;
  etaDays: number | null; // complete hone par null, warna is pace par kitne din
}

// YouTube Partner Program ka ek tier (fan funding / full ad revenue)
export interface MonetizationTier {
  key: string;
  name: string;
  desc: string;
  reqs: MonetizationReq[];
  complete: boolean;
}

export interface MonetizationData {
  tiers: MonetizationTier[];
  channelAgeDays: number;
  pace: { subsPerWeek: number; hoursPerWeek: number };
  notes: string[]; // Feb 2027 rule change + Shorts alternate route
  source: string; // official source label
}

// chhota video reference — card me thumb + title dikhane ke liye
export interface MiniVideoRef {
  id: string;
  title: string;
  kind: VideoKind;
  hue: number;
  duration: string;
}

export interface TrendPoint {
  day: string; // "5 Nov"
  value: number;
}

export interface DashboardData {
  channelName: string;
  generatedAt: string;

  // uploaded videos ke aggregated totals (sab real sums/averages, koi random nahi)
  totals: {
    views: number;
    watchHours: number;
    subsGained: number; // saare uploaded videos se mila ke total gained
    likes: number;
    comments: number;
    totalImpressions: number;
    avgImpressions: number; // per video
    avgViews: number; // per video
    avgCtr: number; // impressions-weighted %
    avgRetention: number; // views-weighted avg % viewed
    avgWatchTime: string; // total watch time / views, "1:42" format
    uploadedCount: number;
  };

  // overall channel health (0-100) + 4 components: CTR, Retention, Views, Engagement
  health: {
    score: number;
    label: string; // "Great" / "Okay" / "Needs Work"
    tone: Tone;
    components: HealthComponent[];
  };

  // daily impressions (last 28 days) + 7-day momentum
  trend: {
    series: TrendPoint[];
    last7: number;
    prev7: number;
    delta7: number; // % change (last7 vs prev7)
  };

  // pipeline snapshot — abhi kya chal raha hai
  pipeline: {
    scheduledCount: number;
    processingCount: number;
    failedCount: number;
    nextScheduled?: MiniVideoRef & { scheduledFor: string };
    inProgress?: MiniVideoRef & { stage: string; pct: number; note?: string };
    latestFailed?: MiniVideoRef & { stage: string; at: string; reason: string };
  };

  // sabse zyada views wala video
  topVideo?: MiniVideoRef & { views: number; ctr: number; publishedAt: string };

  // Brain + agent ka status (sirf counts, read-only)
  brain: {
    questionsOpen: number;
    questionsResearching: number;
    questionsDone: number;
    experimentReports: number;
    enabledTechniques: number; // experiments ke enabled items (agent next video me try karega)
  };

  // monetization targets — YPP official thresholds ke against progress
  monetization: MonetizationData;
}
