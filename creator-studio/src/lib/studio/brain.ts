// Creator Studio — Main Brain server store (JSON persistence + seed + report generator)
// Server-only file (uses fs) — client components must import only brain-types.ts

import fs from "fs";
import path from "path";
import { newId } from "./store";
import { DATA_BASE } from "./paths";
import type {
  BrainState,
  ExperimentEntry,
  ExperimentItem,
  ProblemArea,
  ResearchQuestion,
  VideoEntry,
} from "./brain-types";

const BRAIN_FILE = path.join(DATA_BASE, "data", "creator-studio", "brain.json");

function readBrainFile(): BrainState | null {
  try {
    const raw = fs.readFileSync(BRAIN_FILE, "utf8");
    const st = JSON.parse(raw) as BrainState;
    if (!st || !Array.isArray(st.videos) || !Array.isArray(st.questions) || !Array.isArray(st.experiments)) {
      return null;
    }
    return st;
  } catch {
    return null;
  }
}

function writeBrainFile(st: BrainState) {
  const dir = path.dirname(BRAIN_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = BRAIN_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2), "utf8");
  fs.renameSync(tmp, BRAIN_FILE);
}

export function readBrain(): BrainState {
  const existing = readBrainFile();
  if (existing) return existing;
  // FRESH INSTALL — koi demo data nahi: brain bilkul khali shuru hota hai.
  return { videos: [], questions: [], experiments: [] };
}

export function mutateBrain<T>(fn: (st: BrainState) => T): T {
  const st = readBrain();
  const out = fn(st);
  writeBrainFile(st);
  return out;
}

// ---------- helpers ----------

// research question ka signature — same areas = same question (repeat aggregation ke liye)
export function questionSignature(areas: ProblemArea[]): string {
  return [...areas].sort().join("+");
}

// ---------- research report generator ----------
// Prototype me agent real internet research nahi karta — realistic report template se generate hota hai.
// Phase 2 me yahan web-search + links ka actual analysis hoga.

const AREA_LABEL: Record<ProblemArea, string> = {
  thumbnail: "Thumbnail",
  title: "Title",
  topic: "Topic & Audience",
  hook: "Hook / Intro",
  seo: "SEO & Timing",
  length: "Video Length",
};

const REPORT_TEMPLATES: Record<ProblemArea, { dos: string[]; avoids: string[]; focus: string[] }> = {
  thumbnail: {
    dos: [
      "Thumbnail text maximum 3-4 words rakho — 60%+ viewers mobile par dekhte hain, wahan chhota text unreadable hai",
      "Face + strong expression wale thumbnails ka CTR average ~27% zyada hota hai — jab relevant ho to face add karo",
      "Background aur subject me strong color contrast rakho — dark background + bright subject sabse safe combo hai",
      "Ek clear focal point rakho — viewer ko 0.5 sec me pata chal jaye video kis baare me hai",
    ],
    avoids: [
      "Cluttered thumbnail — 1 element se zyada cheezein compete karti hain aur click nahi aata",
      "Chhota ya decorative font — mobile me readable hi nahi hota",
      "Aisa thumbnail jo video content se match na kare — CTR badhega lekin retention gir jayegi",
    ],
    focus: ["Mobile preview me thumbnail test karo", "Channel ke best CTR wale thumbnails ka pattern copy karo"],
  },
  title: {
    dos: [
      "First 40 characters me main keyword + curiosity rakho — mobile search me bas itna hi dikhta hai",
      "Number ya result promise dalo — '2 Minute Me', '3 Tricks', '1000 Subs' type specificity click badhaati hai",
      "Title me ek clear benefit batao — viewer ko kya milega ye obvious ho",
    ],
    avoids: [
      "Generic words — 'Full Guide', 'Review' jaise titles me curiosity gap nahi hota",
      "Clickbait jo video se match na kare — retention drop aur trust loss hota hai",
      "Bahut lamba title — mobile me cut ho jayega, important part end me mat rakho",
    ],
    focus: ["Apne top 3 videos ke titles ka pattern nikalo aur repeat karo"],
  },
  topic: {
    dos: [
      "Har video se pehle audience profile likho — ye video kiske liye hai, wo kya seekhega",
      "Competitor gap research karo — jo topic unhone cover nahi kiya, wahan pehle pahuncho",
      "Apne channel ke core niche se +1 step door tak hi jao — 2 step door jaane se audience mismatch hota hai",
    ],
    avoids: [
      "Broad trending topics bina apne angle ke — wrong audience ke paas video chala jata hai",
      "Wo topic jiska overlap apne existing audience se zero ho",
    ],
    focus: ["Topic shortlist banao aur audience-fit score do (1-5) — sirf 4+ banayein"],
  },
  hook: {
    dos: [
      "First 15 sec me result/preview dikhao — process pehle, reward baad me nahi",
      "Har 20-30 sec me pattern interrupt — angle/screen/graphics change, retention isse hold hoti hai",
      "Open loop chhodo — 'end me sabse important trick hai' type curiosity",
    ],
    avoids: [
      "Lamba intro/channel branding 15 sec se zyada — viewers turant nikal jate hain",
      "'Namaste dosto, aaj hum...' type predictable start — pattern interrupt ki jagah pattern repeat",
    ],
    focus: ["Apne videos ka retention graph first 60 sec ka compare karo"],
  },
  seo: {
    dos: [
      "Posting time fix karo — apne audience ke active hours me post karo (evening peak test kiya ja chuka hai)",
      "Description ke first 2 lines me main keywords — wahi search me weight rakhte hain",
      "Pinned comment me ek question dalo — comments ka early push impressions badhata hai",
    ],
    avoids: [
      "Random posting time — consistency ke bina audience signal weak hota hai",
      "Keyword stuffing tags me — YouTube semantic search use karta hai, natural language likho",
    ],
    focus: ["2 hafte ek fixed time slot test karo aur impression spike compare karo"],
  },
  length: {
    dos: [
      "Content ko sections me baanto aur timestamps dalo — mid-video drop kam hota hai",
      "Video jitna content demand kare utna hi rakho — stretch mat karo",
    ],
    avoids: [
      "Padding/filler — 'video ko lamba karne ke liye' extra footage retention khati hai",
    ],
    focus: ["Retention graph me jahan biggest drop hai wahi section agle video me cut karo"],
  },
};

export function generateReport(question: ResearchQuestion, st: BrainState): ExperimentEntry {
  const areas = question.areas.length > 0 ? question.areas : (["thumbnail"] as ProblemArea[]);
  const items: ExperimentItem[] = [];
  let n = 0;
  const push = (kind: "do" | "avoid", text: string, enabled: boolean) => {
    n += 1;
    items.push({ id: `eit-${n}`, kind, text, enabled });
  };

  for (const area of areas) {
    const tpl = REPORT_TEMPLATES[area] ?? REPORT_TEMPLATES.thumbnail;
    for (const d of tpl.dos) push("do", d, true);
    for (const a of tpl.avoids) push("avoid", a, true);
    for (const f of tpl.focus) push("do", f, true);
  }

  const videoCount = question.sourceVideoIds.length;
  const areaLabels = areas.map((a) => AREA_LABEL[a] ?? a).join(" & ");
  const summary =
    `${videoCount} video${videoCount > 1 ? "s" : ""} ke data analyze karke ` +
    `${areaLabels} ke liye ye report bani hai. ` +
    `Neeche ${items.filter((i) => i.kind === "do").length} action points aur ${items.filter((i) => i.kind === "avoid").length} mistakes hain — ` +
    `jo enable rahenge wo agent next video me skills ke saath try karega.`;

  const sources: string[] = [
    `${videoCount} source video${videoCount > 1 ? "s" : ""} ka metrics + findings data`,
  ];
  for (const l of question.links) {
    sources.push(`User link: ${l.label || l.url}`);
  }
  if (question.links.length === 0) {
    sources.push("Agent ki internet research (koi custom link nahi diya gaya tha)");
  }

  const labels = areas.map((a) => AREA_LABEL[a] ?? a).join(" & ");
  return {
    id: `exp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    title: `${labels} — Research Report`,
    questionId: question.id,
    questionText: question.text,
    createdAt: new Date().toISOString(),
    summary,
    sources,
    items,
  };
}

export type { BrainState, ExperimentEntry, ResearchQuestion, VideoEntry };
export { newId };
