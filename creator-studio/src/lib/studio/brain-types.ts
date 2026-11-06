// Creator Studio — Main Brain types (Findings/Lessons, Research, Experiments)
// Ye 4 brain sections ka data model hai: Skills (packages me already), Findings, Research, Experiments.
// Phase 2 me ye data AntiGem plugin me chrome.storage.local me jayega.

export type VideoKind = "long" | "short";

// ek problem ka area — agent inhi areas ke hisaab se research questions raise karta hai
export type ProblemArea = "thumbnail" | "title" | "topic" | "hook" | "seo" | "length";

export interface VideoProblem {
  area: ProblemArea;
  // agent ka observation, e.g. "CTR sirf 1.8% — thumbnail click nahi karwa raha"
  note: string;
}

export interface VideoMetrics {
  views: number;
  ctr: number; // %
  retention: number; // avg % viewed
  likes: number;
  comments: number;
}

export interface VideoEntry {
  id: string;
  topic: string;
  kind: VideoKind;
  publishedAt: string; // ISO — feed iski order me dikhta hai
  duration: string; // "12:34" ya "0:45"
  hue: number; // 0-360, deterministic gradient thumbnail ke liye
  status: "analyzed";
  metrics: VideoMetrics;
  problems: VideoProblem[]; // agent ne kya problems pakdi
  findings: string[]; // lessons learned (positive + negative)
}

export interface LinkRef {
  id: string;
  url: string;
  label: string; // user-friendly naam, e.g. "Thumbnail design guide video"
}

export type QuestionStatus = "open" | "researching" | "done";

export interface ResearchQuestion {
  id: string;
  text: string; // e.g. "Thumbnail & Title par research karni hai"
  areas: ProblemArea[]; // kis area par research
  sourceVideoIds: string[]; // kaunse videos se ye question utha
  // agent ka breakdown:
  problem: string; // problem kya pakdi
  why: string; // research kyun zaroori hai
  topics: string[]; // kin topics par research karni hai
  links: LinkRef[]; // user ne jo custom references add kiye
  status: QuestionStatus;
  createdAt: string;
  reportId?: string; // done hone par experiment/report ka id
}

export type ExperimentItemKind = "do" | "avoid";

export interface ExperimentItem {
  id: string;
  kind: ExperimentItemKind; // "do" = karna hai, "avoid" = mistake, ye nahi karna
  text: string;
  enabled: boolean; // enabled = agent NEXT VIDEO me ye try karega (skills ke saath)
}

export interface ExperimentEntry {
  id: string;
  title: string; // e.g. "Thumbnail & Title Research Report"
  questionId: string;
  questionText: string;
  createdAt: string;
  summary: string; // report ka 2-3 line overview
  sources: string[]; // kin links/videos par research based hai
  items: ExperimentItem[]; // report ke action points + mistakes
}

export interface BrainState {
  videos: VideoEntry[];
  questions: ResearchQuestion[];
  experiments: ExperimentEntry[];
}
