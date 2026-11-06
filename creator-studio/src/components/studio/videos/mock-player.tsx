"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { VideoKind } from "@/lib/studio/video-types";

// Mock player — prototype me demo gradient "video" hai.
// Phase 2 me yahan agent ka rendered video chalega (chrome.antigem se).
export function MockPlayer({ hue, duration, kind }: { hue: number; duration: string; kind: VideoKind }) {
  const total = useMemo(() => {
    const parts = duration.split(":").map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : 0;
  }, [duration]);

  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= total) {
          setPlaying(false);
          return total;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [playing, total]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const h2 = (hue + 45) % 360;
  const h3 = (hue + 300) % 360;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue},55%,30%)'/>` +
    `<stop offset='1' stop-color='hsl(${h2},65%,12%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='640' height='360' fill='url(#g)'/>` +
    `<circle cx='500' cy='70' r='150' fill='hsl(${h3},45%,50%)' opacity='0.2'/>` +
    `<circle cx='110' cy='300' r='120' fill='hsl(${hue},60%,60%)' opacity='0.13'/>` +
    `<text x='320' y='190' text-anchor='middle' font-family='sans-serif' font-size='26' font-weight='bold' fill='white' opacity='0.55'>${kind === "short" ? "SHORT PREVIEW" : "VIDEO PREVIEW"}</text>` +
    `</svg>`;

  const pct = total > 0 ? (elapsed / total) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="" className="aspect-video w-full object-cover" />
      <span
        className={`absolute left-2 top-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
          kind === "short" ? "bg-primary text-white" : "bg-white/90 text-black"
        }`}
      >
        {kind === "short" ? "Short" : "Long"}
      </span>

      {/* play / pause */}
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur transition-transform active:scale-90">
          {playing ? (
            <Pause className="h-7 w-7 text-white" fill="white" />
          ) : (
            <Play className="ml-1 h-7 w-7 text-white" fill="white" />
          )}
        </span>
      </button>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-white/90">
          <span>{fmt(elapsed)}</span>
          <span>{duration}</span>
        </div>
      </div>
    </div>
  );
}
