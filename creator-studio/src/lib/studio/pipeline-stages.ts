// Professional production pipeline stages — CLIENT-SAFE constants (no fs).
// pipeline.ts (server) bhi isi ko import karta hai, RunDetail (client) bhi.
//
// Order RESEARCH-BASED hai (2026 professional guides):
//  - storyflow.so — "The 7-Stage YouTube Content Pipeline 2026"
//    (idea capture → packaging → scripting → filming → editing → publishing → analysis)
//  - loopdesk.ai — "YouTube Video Production Workflow: Idea to Upload (2026)"
//    (idea+research → script → pre-prod → record → edit → packaging → upload → publish → review)
//  - MrBeast / Mark Rober / Thomas Frank "packaging first" rule:
//    title + thumbnail ka CONCEPT script se pehle — "if you can't describe the
//    title and thumbnail yet, the idea isn't ready to script" (packaging = video
//    ka promise; weak packaging = weak CTR = wasted effort)
//  - Final thumbnail EDIT KE BAAD banti hai (loopdesk: "lock the edit before
//    you package it") — video ke actual content se match karni chahiye.
//
// Automation context me "filming" ki jagah: voiceover (TTS) + AI visuals/B-roll.

import type { StageKey } from "./pipeline-types";

export interface StageDef {
  key: StageKey;
  label: string;
  desc: string; // is stage me kya hota hai (Hinglish)
  doneNote: string; // advance par agent ka default "kya kiya" note
}

export const STAGE_DEFS: StageDef[] = [
  {
    key: "research",
    label: "Research",
    desc: "Topic ki deep research — trends, competitor videos, facts aur sahi angle.",
    doneNote: "Competitor videos + trends analyze kiye, facts collect hue, video ka angle lock ho gaya.",
  },
  {
    key: "packaging",
    label: "Packaging Plan",
    desc: "Title + thumbnail ka CONCEPT script se pehle — video ka promise decide (kya dikhega, kya click karwayega).",
    doneNote: "Title final + thumbnail concept (2 options) ready — video ka promise yahi rahega.",
  },
  {
    key: "script",
    label: "Script",
    desc: "Hook word-by-word + pura script — visual direction bhi yahin lock (kya dikhega, kya nahi).",
    doneNote: "Script likh di gayi — hook, body, CTA sab lock. Visual direction ke saath.",
  },
  {
    key: "voiceover",
    label: "Voiceover",
    desc: "Script se voice generate (TTS) — tone aur pace video ke format ke hisaab se.",
    doneNote: "Voiceover generate ho gaya — pace check kiya, retakes nahi chahiye.",
  },
  {
    key: "visuals",
    label: "Visuals",
    desc: "Script ke hisaab se AI visuals / B-roll generate — har section ka matching footage.",
    doneNote: "Saare visuals generate ho gaye — script ke sections se sync kar diye.",
  },
  {
    key: "edit",
    label: "Edit & Render",
    desc: "Final cut, captions, music, pattern interrupts — video lock ho jata hai.",
    doneNote: "Edit complete + render done — video ab lock hai.",
  },
  {
    key: "final_packaging",
    label: "Final Thumbnail",
    desc: "Edit ke baad final thumbnail — video ke actual content se match (A/B options ke saath).",
    doneNote: "Final thumbnail ready — title ke saath ek message banata hai.",
  },
  {
    key: "seo_prep",
    label: "SEO & Upload Prep",
    desc: "Description, tags, chapters, end screens, pinned comment — production ready.",
    doneNote: "SEO + upload settings ready — video production ready hai, ab schedule/upload hoga.",
  },
];

export const TOTAL_STAGES = STAGE_DEFS.length;

export function stageLabel(key: StageKey | string): string {
  return STAGE_DEFS.find((s) => s.key === key)?.label ?? String(key);
}
