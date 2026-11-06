"use client";

import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatViews } from "@/lib/studio/brain-format";
import type { MetricPoint, RetentionPoint } from "@/lib/studio/video-types";

const AXIS = { fill: "#aaaaaa", fontSize: 10 };
const GRID = "#272727";
const TOOLTIP_STYLE = {
  background: "#212121",
  border: "1px solid #303030",
  borderRadius: 8,
  fontSize: 12,
  color: "#f1f1f1",
};

function CompactTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: { value: number | string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={TOOLTIP_STYLE} className="px-2.5 py-1.5">
      <p className="font-medium text-[#f1f1f1]">{label}</p>
      <p className="text-[#ff5c72]">{typeof v === "number" ? formatViews(v) : v}{unit}</p>
    </div>
  );
}

// IMPRESSIONS graph — daily impressions (area)
export function ImpressionsChart({ data }: { data: MetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="impFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff0033" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ff0033" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatViews(v)} width={44} />
        <Tooltip content={<CompactTooltip />} />
        <Area type="monotone" dataKey="value" stroke="#ff0033" strokeWidth={2} fill="url(#impFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// CTR graph — daily CTR % (line)
export function CtrChart({ data }: { data: MetricPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={[0, "auto"]} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip content={<CompactTooltip unit="%" />} />
        <Line type="monotone" dataKey="value" stroke="#ff5c72" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#ff0033" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// RETENTION graph — audience retention curve (area)
export function RetentionChart({ data }: { data: RetentionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="t" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip content={<CompactTooltip unit="%" />} />
        <Area type="monotone" dataKey="pct" stroke="#4ade80" strokeWidth={2} fill="url(#retFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
