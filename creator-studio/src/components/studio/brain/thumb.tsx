"use client";

import type { VideoKind } from "@/lib/studio/brain-types";

// Deterministic gradient thumbnail (SVG data-uri) — prototype me real thumbnails
// Phase 2 me chrome.antigem.mediaFrame se aayenge, tab bhi yahi component dikhega.

export function Thumb({
  hue,
  duration,
  kind,
  className = "",
}: {
  hue: number;
  duration: string;
  kind: VideoKind;
  className?: string;
}) {
  const h2 = (hue + 45) % 360;
  const h3 = (hue + 300) % 360;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='hsl(${hue},55%,30%)'/>` +
    `<stop offset='1' stop-color='hsl(${h2},65%,12%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='320' height='180' fill='url(#g)'/>` +
    `<circle cx='252' cy='38' r='78' fill='hsl(${h3},45%,50%)' opacity='0.22'/>` +
    `<circle cx='60' cy='150' r='60' fill='hsl(${hue},60%,60%)' opacity='0.14'/>` +
    `<path d='M140 68 L192 100 L140 132 Z' fill='white' opacity='0.85'/>` +
    `</svg>`;
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-black/40 ${className}`}>
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="" className="h-full w-full object-cover" />
      <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 py-px font-mono text-[9px] leading-tight text-white">
        {duration}
      </span>
      <span
        className={`absolute left-1 top-1 rounded px-1 py-px text-[8px] font-bold uppercase leading-tight tracking-wide ${
          kind === "short" ? "bg-primary text-white" : "bg-white/90 text-black"
        }`}
      >
        {kind === "short" ? "Short" : "Long"}
      </span>
    </div>
  );
}
