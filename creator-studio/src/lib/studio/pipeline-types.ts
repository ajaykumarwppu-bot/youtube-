// Creator Studio — Pipeline section types (client-safe, no fs imports)
//
// PIPELINE = video ka pura safar zero se production ready tak.
// Do hisse:
//   1. Idea Bank      — owner apne ideas add karta hai (topic + details).
//                       Agent agli video banate waqt SABSE PEHLE yahi check karega.
//   2. Production Runs — har video ka step-by-step production tracker.
//                       System detect karta rahega agent abhi kaunsa stage kar raha hai.
//
// Stage order RESEARCH-BASED hai (2026 professional guides) — pipeline.ts me
// STAGE_DEFS ke saath source note bhi documented hai. Key rule:
//   Title + Thumbnail ka CONCEPT script se PEHLE (MrBeast "packaging first" rule),
//   final thumbnail edit ke BAAD (video ke actual content se match ho).

export type IdeaStatus = "new" | "picked" | "done";

// Idea Bank ka ek entry — owner ka apna idea
export interface IdeaEntry {
  id: string;
  topic: string; // kya topic hai
  details: string; // kya hai, kyun banana chahiye, kya cover karna hai
  status: IdeaStatus; // new → picked (agent ne run shuru kiya) → done (video ready)
  createdAt: string;
  pickedAt?: string; // agent ne is idea par kaam shuru kiya
  videoId?: string; // done — is video se link (Videos section me dekho)
}

export type StageKey =
  | "research"
  | "packaging"
  | "script"
  | "voiceover"
  | "visuals"
  | "edit"
  | "final_packaging"
  | "seo_prep";

export type StageState = "pending" | "active" | "done" | "failed";

// Production run ka ek stage
export interface PipelineStage {
  key: StageKey;
  state: StageState;
  note?: string; // agent ne is stage me kya kiya / abhi kya kar raha hai
  startedAt?: string;
  finishedAt?: string;
}

// ek video banne ka pura process
export type RunStatus = "active" | "ready" | "failed";

export interface PipelineRun {
  id: string;
  ideaId?: string; // Idea Bank ke kis idea se aaya
  title: string; // working title (idea topic ya packaging stage me final)
  kind: "long" | "short";
  status: RunStatus;
  hue: number; // deterministic gradient thumb
  estDuration?: string; // script pack hone ke baad estimate — pehle "--:--"
  createdAt: string;
  updatedAt: string;
  stages: PipelineStage[]; // STAGE_DEFS ke order me hi
  failReason?: string;
  failedStage?: string;
  failedAt?: string;
}

export interface PipelineState {
  ideas: IdeaEntry[];
  runs: PipelineRun[];
}
