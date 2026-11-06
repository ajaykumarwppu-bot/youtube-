"use client";

// RUN DETAIL — pushed full-screen page (Pipeline list se khulta hai).
// - Agent abhi kya kar raha hai (active stage + note) — system detection
// - Saare 8 stages ka vertical timeline (research-based order)
// - Active run: "Agent: Agla Step Pura Karo" (advance)
// - Failed run: reason + "Retry — wahin se resume"
// - Ready run: production ready note

import { useState } from "react";
import {
  Bot, CheckCircle2, ChevronRight, Info, Loader2, PlayCircle, RotateCcw, XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { DetailBar } from "@/components/studio/brain/detail-bar";
import { timeAgo } from "@/lib/studio/brain-format";
import { STAGE_DEFS, stageLabel } from "@/lib/studio/pipeline-stages";
import type { IdeaEntry, PipelineRun, PipelineStage } from "@/lib/studio/pipeline-types";

interface Props {
  run: PipelineRun;
  ideas: IdeaEntry[];
  onBack: () => void;
  onRunChanged: (run: PipelineRun) => void;
}

export function RunDetail({ run, ideas, onBack, onRunChanged }: Props) {
  const [busy, setBusy] = useState(false);

  const doneCount = run.stages.filter((s) => s.state === "done").length;
  const pct = Math.round((doneCount / run.stages.length) * 100);
  const active = run.stages.find((s) => s.state === "active");
  const sourceIdea = ideas.find((i) => i.id === run.ideaId);

  const subtitle = `${run.kind === "long" ? "Long" : "Short"} video · Stage ${
    run.status === "ready" ? run.stages.length : run.status === "failed" ? `${doneCount + 1}` : doneCount + 1
  }/${run.stages.length}`;

  const advance = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/cs/pipeline/runs/${run.id}/advance`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const updated = j.run as PipelineRun;
      onRunChanged(updated);
      if (updated.status === "ready") {
        toast.success("Video production ready ho gayi!", {
          description: "Saare 8 stages complete — ab schedule/upload hoga.",
        });
      } else {
        const next = updated.stages.find((s) => s.state === "active");
        toast.success(`${next ? stageLabel(next.key) : "Agla stage"} shuru ho gaya`, {
          description: "Agent us stage par kaam karna shuru karega.",
        });
      }
    } catch (e) {
      toast.error("Advance failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/cs/pipeline/runs/${run.id}/retry`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      onRunChanged(j.run as PipelineRun);
      toast.success("Run resume ho gaya", { description: "Agent wahin se kaam shuru karega." });
    } catch (e) {
      toast.error("Retry failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DetailBar title={run.title} subtitle={subtitle} onBack={onBack} />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-8">
        {/* ============ status hero — agent abhi kya kar raha hai ============ */}
        {run.status === "active" && (
          <Card className="border-primary/40 bg-primary/5 p-0">
            <CardContent className="p-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Agent abhi ye kar raha hai
                </p>
              </div>
              <p className="mt-2 text-[16px] font-bold leading-tight">
                {active ? stageLabel(active.key) : "Stage shuru hone wala hai"}
              </p>
              {active?.note && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{active.note}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Progress — {doneCount}/{run.stages.length} stages</span>
                <span className="font-semibold text-foreground">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </CardContent>
          </Card>
        )}

        {run.status === "ready" && (
          <Card className="border-emerald-400/40 bg-emerald-400/5 p-0">
            <CardContent className="p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-bold text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> Production Ready!
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Saare {run.stages.length} stages complete — script, voiceover, visuals, thumbnail, SEO
                sab lock hai. Video ab schedule/upload hogi (Videos section me dikhegi).
              </p>
            </CardContent>
          </Card>
        )}

        {run.status === "failed" && (
          <Card className="border-destructive/50 bg-destructive/5 p-0">
            <CardContent className="p-3.5">
              <p className="flex items-center gap-2 text-[15px] font-bold text-destructive">
                <XCircle className="h-5 w-5" /> Run fail ho gaya
              </p>
              <p className="mt-1 text-[12px] font-medium text-destructive/90">
                Stage: {run.failedStage ?? "?"} · {run.failedAt ? timeAgo(run.failedAt) : ""}
              </p>
              {run.failReason && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{run.failReason}</p>
              )}
              <Button
                className="mt-3 h-10 w-full gap-2"
                variant="secondary"
                disabled={busy}
                onClick={retry}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 text-primary" />}
                Retry — Wahin Se Resume Karo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ============ source idea ============ */}
        {sourceIdea && (
          <Card className="border-amber-400/25 bg-amber-400/5 p-0">
            <CardContent className="p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                <Bot className="h-3.5 w-3.5" /> Idea Bank se aaya
              </p>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug">{sourceIdea.topic}</p>
              {sourceIdea.details && (
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                  {sourceIdea.details}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============ stage timeline ============ */}
        <section>
          <h2 className="mb-3 text-[14px] font-bold">
            Production Steps <span className="ml-1 text-[11px] font-normal text-muted-foreground">(research-based professional order)</span>
          </h2>
          <div>
            {run.stages.map((st, i) => (
              <StageRow key={st.key} stage={st} index={i} isLast={i === run.stages.length - 1} />
            ))}
          </div>
        </section>

        {/* ============ action — agent agla step ============ */}
        {run.status === "active" && (
          <Button className="h-12 w-full gap-2 text-[14px] font-semibold" disabled={busy} onClick={advance}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
            Agent: Agla Step Pura Karo
          </Button>
        )}

        {/* research note */}
        <Card className="border-dashed">
          <CardContent className="p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold">
              <Info className="h-3.5 w-3.5 text-primary" /> Order kyun aisa hai?
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
              Title + thumbnail ka <b className="text-foreground">CONCEPT script se pehle</b> (MrBeast ka
              &ldquo;packaging first&rdquo; rule — packaging hi video ka promise hai), final thumbnail{" "}
              <b className="text-foreground">edit ke baad</b> (video ke content se match ho). Sources:
              storyflow.so, loopdesk.ai — 2026 production guides.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// timeline ki ek row — left rail (icon + line) + right content
function StageRow({ stage, index, isLast }: { stage: PipelineStage; index: number; isLast: boolean }) {
  const def = STAGE_DEFS[index];
  const isDone = stage.state === "done";
  const isActive = stage.state === "active";
  const isFailed = stage.state === "failed";

  return (
    <div className="flex gap-3">
      {/* left rail */}
      <div className="flex flex-col items-center">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        ) : isActive ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        ) : isFailed ? (
          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
        ) : (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold text-muted-foreground">
            {index + 1}
          </span>
        )}
        {!isLast && (
          <div
            className={`w-px flex-1 ${isDone ? "bg-emerald-400/40" : "bg-border"}`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* content */}
      <div className={isLast ? "pb-1" : "pb-5"}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-[13.5px] font-semibold leading-none ${stage.state === "pending" ? "text-muted-foreground" : ""}`}>
            {def.label}
          </p>
          {isActive && (
            <Badge variant="outline" className="border-primary/50 px-1.5 py-0 text-[9px] text-primary">
              ABHI
            </Badge>
          )}
          {isFailed && (
            <Badge variant="outline" className="border-destructive/60 px-1.5 py-0 text-[9px] text-destructive">
              FAIL
            </Badge>
          )}
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{def.desc}</p>
        {stage.note && (
          <div
            className={`mt-2 rounded-lg border px-2.5 py-2 text-[12px] leading-relaxed ${
              isFailed
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : isActive
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground"
            }`}
          >
            <p className="flex items-start gap-1.5">
              {isDone && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />}
              <span>
                {isActive && (
                  <span className="font-semibold text-primary">
                    <ChevronRight className="mr-0.5 inline h-3 w-3" />
                  </span>
                )}
                {stage.note}
              </span>
            </p>
          </div>
        )}
        {(stage.startedAt || stage.finishedAt) && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/70">
            {stage.startedAt && `Shuru: ${timeAgo(stage.startedAt)}`}
            {stage.finishedAt && ` · Pura: ${timeAgo(stage.finishedAt)}`}
          </p>
        )}
      </div>
    </div>
  );
}
