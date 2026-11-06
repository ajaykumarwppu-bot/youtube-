// Brain UI ke shared formatters — client-safe (no fs)

import type { ProblemArea } from "./brain-types";

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export const AREA_LABEL: Record<ProblemArea, string> = {
  thumbnail: "Thumbnail",
  title: "Title",
  topic: "Topic/Audience",
  hook: "Hook/Intro",
  seo: "SEO/Timing",
  length: "Length",
};

// CTR evaluation — 3% se kam = packaging problem, 3-5 okay, 5+ great
export function ctrLevel(ctr: number): { label: string; tone: "bad" | "ok" | "good" } {
  if (ctr < 3) return { label: "Low", tone: "bad" };
  if (ctr < 5) return { label: "Okay", tone: "ok" };
  return { label: "Great", tone: "good" };
}

export function retentionLevel(kind: "long" | "short", pct: number): { label: string; tone: "bad" | "ok" | "good" } {
  const min = kind === "long" ? 30 : 60;
  const good = kind === "long" ? 40 : 75;
  if (pct < min) return { label: "Low", tone: "bad" };
  if (pct < good) return { label: "Okay", tone: "ok" };
  return { label: "Great", tone: "good" };
}
