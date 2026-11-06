// Creator Studio — Pipeline store (STATIC ENGINE, IndexedDB)
// Client components import only pipeline-types.ts aur pipeline-stages.ts
// (shared stage definitions).

import { docGet, docSet } from "./idb";
import type { IdeaEntry, PipelineRun, PipelineStage, PipelineState } from "./pipeline-types";
import { STAGE_DEFS, stageLabel } from "./pipeline-stages";

const PIPELINE_KEY = "pipeline";

// fresh stage list — sab pending
function freshStages(): PipelineStage[] {
  return STAGE_DEFS.map((d) => ({ key: d.key, state: "pending" as const }));
}

// ---------------------------------------------------------------------------
// persistence

export async function readPipeline(): Promise<PipelineState> {
  const st = await docGet<PipelineState>(PIPELINE_KEY);
  if (!st || !Array.isArray(st.ideas) || !Array.isArray(st.runs)) {
    // FRESH INSTALL — koi demo idea/run nahi: Idea Bank khali shuru hota hai.
    return { ideas: [], runs: [] };
  }
  return st;
}

async function writeState(st: PipelineState): Promise<void> {
  await docSet(PIPELINE_KEY, st);
}

// ---------------------------------------------------------------------------
// actions

export async function addIdea(topic: string, details: string): Promise<IdeaEntry> {
  const st = await readPipeline();
  const idea: IdeaEntry = {
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    topic: topic.trim(),
    details: details.trim(),
    status: "new",
    createdAt: new Date().toISOString(),
  };
  st.ideas.unshift(idea);
  await writeState(st);
  return idea;
}

export async function updateIdea(
  id: string,
  patch: Partial<Pick<IdeaEntry, "topic" | "details" | "status">>
): Promise<IdeaEntry> {
  const st = await readPipeline();
  const idea = st.ideas.find((i) => i.id === id);
  if (!idea) throw new Error("Idea nahi mila");
  if (patch.topic !== undefined) idea.topic = patch.topic.trim();
  if (patch.details !== undefined) idea.details = patch.details.trim();
  if (patch.status !== undefined) idea.status = patch.status;
  await writeState(st);
  return idea;
}

export async function deleteIdea(id: string): Promise<void> {
  const st = await readPipeline();
  st.ideas = st.ideas.filter((i) => i.id !== id);
  await writeState(st);
}

// Idea Bank ke idea se production run start — agent isi idea par kaam shuru karega
export async function startRunFromIdea(ideaId: string): Promise<{ idea: IdeaEntry; run: PipelineRun }> {
  const st = await readPipeline();
  const idea = st.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea nahi mila");
  if (idea.status === "picked") throw new Error("Is idea par run pehle se chal raha hai");

  const now = new Date().toISOString();
  const run: PipelineRun = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ideaId: idea.id,
    title: idea.topic,
    kind: "long",
    status: "active",
    hue: (idea.id.charCodeAt(4) * 37 + idea.id.length * 61) % 360,
    createdAt: now,
    updatedAt: now,
    stages: freshStages(),
  };
  run.stages[0] = { key: run.stages[0].key, state: "active", startedAt: now, note: "Agent ne kaam shuru kar diya" };

  idea.status = "picked";
  idea.pickedAt = now;

  st.runs.unshift(run);
  await writeState(st);
  return { idea, run };
}

// "Agent agla step" — active stage complete, next stage active.
// Last stage complete hone par run production-ready.
export async function advanceRun(runId: string): Promise<PipelineRun> {
  const st = await readPipeline();
  const run = st.runs.find((r) => r.id === runId);
  if (!run) throw new Error("Run nahi mila");
  if (run.status !== "active") throw new Error("Ye run active nahi hai");

  const now = new Date().toISOString();
  const idx = run.stages.findIndex((s) => s.state === "active");

  // koi active nahi (rare) — pehla pending active kar do
  if (idx === -1) {
    const first = run.stages.find((s) => s.state === "pending");
    if (!first) throw new Error("Advance karne ko kuch nahi bacha");
    first.state = "active";
    first.startedAt = now;
    first.note = "Agent ne kaam shuru kar diya";
    run.updatedAt = now;
    await writeState(st);
    return run;
  }

  // active stage → done (default doneNote agar note set nahi tha)
  const cur = run.stages[idx];
  cur.state = "done";
  cur.finishedAt = now;
  if (!cur.note) cur.note = STAGE_DEFS[idx].doneNote;

  // next stage → active
  if (idx + 1 < run.stages.length) {
    const next = run.stages[idx + 1];
    next.state = "active";
    next.startedAt = now;
    next.note = `${STAGE_DEFS[idx + 1].label} chal raha hai`;
  } else {
    // pura pipeline complete — production ready
    run.status = "ready";
    const idea = st.ideas.find((i) => i.id === run.ideaId);
    if (idea) idea.status = "done";
  }

  run.updatedAt = now;
  await writeState(st);
  return run;
}

// failed run ko wahin se resume — failed stage wapas active
export async function retryRun(runId: string): Promise<PipelineRun> {
  const st = await readPipeline();
  const run = st.runs.find((r) => r.id === runId);
  if (!run) throw new Error("Run nahi mila");
  if (run.status !== "failed") throw new Error("Ye run failed nahi hai");

  const now = new Date().toISOString();
  const stage = run.stages.find((s) => s.state === "failed");
  if (stage) {
    stage.state = "active";
    stage.startedAt = now;
    stage.note = "Retry — wahin se resume kiya gaya";
  }
  run.status = "active";
  run.failReason = undefined;
  run.failedStage = undefined;
  run.failedAt = undefined;
  run.updatedAt = now;
  await writeState(st);
  return run;
}

// (demo/simulation) run ka current stage fail kar do — failed detection dikhane ke liye
export async function failRun(runId: string, reason: string): Promise<PipelineRun> {
  const st = await readPipeline();
  const run = st.runs.find((r) => r.id === runId);
  if (!run) throw new Error("Run nahi mila");
  if (run.status !== "active") throw new Error("Ye run active nahi hai");

  const now = new Date().toISOString();
  const stage = run.stages.find((s) => s.state === "active");
  if (stage) {
    stage.state = "failed";
    stage.finishedAt = now;
    stage.note = `Fail hua — ${reason}`;
    run.failedStage = stageLabel(stage.key);
  }
  run.status = "failed";
  run.failReason = reason;
  run.failedAt = now;
  run.updatedAt = now;
  await writeState(st);
  return run;
}
