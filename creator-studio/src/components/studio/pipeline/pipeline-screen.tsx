"use client";

// PIPELINE tab — video ka pura safar zero se production ready tak.
// 1. Idea Bank (sabse upar): owner apne ideas add karta hai — agent agli video
//    banate waqt sabse pehle yahi ideas check karega.
// 2. Production Runs: har video ka step-by-step tracker (research-based order).

import { useCallback, useEffect, useState } from "react";
import {
  ChevronRight, FolderKanban, Info, Lightbulb, Loader2, Plus, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Thumb } from "@/components/studio/brain/thumb";
import { timeAgo } from "@/lib/studio/brain-format";
import { stageLabel } from "@/lib/studio/pipeline-stages";
import { RunDetail } from "./run-detail";
import type { IdeaEntry, PipelineRun, PipelineState } from "@/lib/studio/pipeline-types";

const IDEA_META: Record<IdeaEntry["status"], { label: string; cls: string }> = {
  new: { label: "New", cls: "border-primary/50 text-primary" },
  picked: { label: "Run chal raha hai", cls: "border-amber-400/50 text-amber-400" },
  done: { label: "Video ban gayi", cls: "border-emerald-400/50 text-emerald-400" },
};

const RUN_META: Record<PipelineRun["status"], { label: string; cls: string }> = {
  active: { label: "Chal raha hai", cls: "border-primary/50 text-primary" },
  ready: { label: "Production Ready", cls: "border-emerald-400/50 text-emerald-400" },
  failed: { label: "Fail hua", cls: "border-destructive/60 text-destructive" },
};

export function PipelineScreen() {
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyIdeaId, setBusyIdeaId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cs/pipeline");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setState(j as PipelineState);
    } catch (e) {
      toast.error("Pipeline load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- run detail (full-screen push) ---------- */
  if (state && selectedRunId) {
    const run = state.runs.find((r) => r.id === selectedRunId);
    if (run) {
      return (
        <RunDetail
          run={run}
          ideas={state.ideas}
          onBack={() => setSelectedRunId(null)}
          onRunChanged={(updated) =>
            setState((prev) =>
              prev
                ? {
                    ideas: prev.ideas.map((i) =>
                      updated.status === "ready" && i.id === updated.ideaId ? { ...i, status: "done" } : i
                    ),
                    runs: prev.runs.map((r) => (r.id === updated.id ? updated : r)),
                  }
                : prev
            )
          }
        />
      );
    }
  }

  const ideas = state?.ideas ?? [];
  const runs = state?.runs ?? [];
  const activeCount = runs.filter((r) => r.status === "active").length;

  /* ---------- add idea ---------- */
  const saveIdea = async () => {
    if (!topic.trim()) {
      toast.error("Topic likhna zaroori hai");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cs/pipeline/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, details }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setState((prev) => (prev ? { ...prev, ideas: [j.idea, ...prev.ideas] } : prev));
      setAddOpen(false);
      setTopic("");
      setDetails("");
      toast.success("Idea bank me add ho gaya", {
        description: "Agent agli video banate waqt sabse pehle ye idea check karega.",
      });
    } catch (e) {
      toast.error("Idea add failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- idea par video banana shuru ---------- */
  const startRun = async (idea: IdeaEntry) => {
    setBusyIdeaId(idea.id);
    try {
      const res = await fetch(`/api/cs/pipeline/ideas/${idea.id}/start`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await load();
      toast.success("Agent ne idea utha liya — run shuru!", {
        description: "Production Runs me stage-by-stage progress dikhega.",
      });
    } catch (e) {
      toast.error("Run start failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBusyIdeaId(null);
    }
  };

  /* ---------- idea delete (sirf new ideas) ---------- */
  const removeIdea = async (idea: IdeaEntry) => {
    try {
      const res = await fetch(`/api/cs/pipeline/ideas/${idea.id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setState((prev) => (prev ? { ...prev, ideas: prev.ideas.filter((i) => i.id !== idea.id) } : prev));
      toast.success("Idea hata diya");
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const stageLine = (r: PipelineRun): string => {
    const done = r.stages.filter((s) => s.state === "done").length;
    if (r.status === "ready") return `${done}/${r.stages.length} stages complete`;
    const active = r.stages.find((s) => s.state === "active");
    if (r.status === "failed") return `${r.failedStage ?? "Stage"} par fail hua`;
    return `Stage ${done + 1}/${r.stages.length} · abhi: ${active ? stageLabel(active.key) : ""}`;
  };

  const currentLine = (r: PipelineRun): string => {
    if (r.status === "ready") return "Upload ke liye taiyar — schedule hoga Videos section me.";
    if (r.status === "failed") return "Retry karke wahin se resume hoga.";
    const active = r.stages.find((s) => s.state === "active");
    return active?.note ?? "";
  };

  return (
    <div className="space-y-5">
      {/* heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FolderKanban className="h-5 w-5 text-primary" /> Pipeline
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Video ka pura safar — idea se production ready tak, step by step.
          </p>
        </div>
        {activeCount > 0 && (
          <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-primary/40 px-2 py-1 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {activeCount} active
          </span>
        )}
      </div>

      {/* ==================== IDEA BANK (sabse upar) ==================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-[18px] w-[18px] text-amber-400" />
            <h2 className="text-[15px] font-bold">Idea Bank</h2>
            <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-[18px] text-muted-foreground">
              {ideas.length}
            </span>
          </div>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Idea
          </Button>
        </div>

        {/* agent rule note */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-[11.5px] leading-relaxed text-amber-200/90">
            Yahan apne ideas add karo — <b className="font-semibold">agent agli video banate waqt sabse
            pehle yahi ideas check karega</b>. Phir pipeline ke har stage follow karega.
          </p>
        </div>

        {/* idea cards */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Card key={i} className="h-28 animate-pulse bg-card/60" />)}
          </div>
        ) : ideas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Lightbulb className="h-9 w-9 text-muted-foreground/50" />
              <p className="font-medium">Idea bank khali hai</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Add Idea dabao — jo idea aapko aaya, wo yahan save kar do. Agent isi ko pehle uthayega.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {ideas.map((idea) => {
              const meta = IDEA_META[idea.status];
              return (
                <Card key={idea.id} className="p-0">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold leading-snug">{idea.topic}</p>
                        {idea.details && (
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                            {idea.details}
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {idea.status === "picked" && idea.pickedAt
                            ? `Agent ne ${timeAgo(idea.pickedAt)} uthaya`
                            : timeAgo(idea.createdAt) + " add kiya"}
                        </p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${meta.cls}`}>
                        {meta.label}
                      </Badge>
                    </div>

                    {/* actions */}
                    {idea.status === "new" && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 flex-1 gap-1.5 text-[12px]"
                          disabled={busyIdeaId === idea.id}
                          onClick={() => startRun(idea)}
                        >
                          {busyIdeaId === idea.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <FolderKanban className="h-3.5 w-3.5 text-primary" />}
                          Video Banao — Agent Shuru Kare
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Idea hatao: ${idea.topic}`}
                          onClick={() => removeIdea(idea)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {idea.status === "picked" && (
                      <button
                        type="button"
                        className="mt-2.5 flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-primary/30 text-[12px] font-medium text-primary active:bg-primary/10"
                        onClick={() => {
                          const run = runs.find((r) => r.ideaId === idea.id && r.status !== "ready");
                          if (run) setSelectedRunId(run.id);
                        }}
                      >
                        Run dekho — stage-by-stage progress <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {idea.status === "done" && (
                      <p className="mt-2.5 text-[11.5px] text-emerald-400">
                        Video production ready hai — Videos section me dikhega.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================== PRODUCTION RUNS ==================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-[18px] w-[18px] text-primary" />
          <h2 className="text-[15px] font-bold">Production Runs</h2>
          <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-[18px] text-muted-foreground">
            {runs.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Card key={i} className="h-28 animate-pulse bg-card/60" />)}
          </div>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-10 text-center">
              <p className="font-medium">Koi run nahi chal raha</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Idea Bank me se kisi idea par &ldquo;Video Banao&rdquo; dabao — agent pipeline shuru karega.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {runs.map((r) => {
              const meta = RUN_META[r.status];
              const done = r.stages.filter((s) => s.state === "done").length;
              const pct = Math.round((done / r.stages.length) * 100);
              return (
                <Card
                  key={r.id}
                  className="cursor-pointer p-0 transition-colors active:bg-secondary/40"
                  onClick={() => setSelectedRunId(r.id)}
                >
                  <CardContent className="flex gap-3 p-3">
                    <Thumb hue={r.hue} duration={r.estDuration ?? "--:--"} kind={r.kind} className="aspect-video w-24" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{r.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`shrink-0 ${meta.cls}`}>{meta.label}</Badge>
                        <span className="text-[10.5px] text-muted-foreground">{stageLine(r)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${r.status === "failed" ? "bg-destructive" : r.status === "ready" ? "bg-emerald-400" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-[10.5px] text-muted-foreground">
                        {currentLine(r)}
                      </p>
                    </div>
                    <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* research source note — order kyun aisa hai */}
      <Card className="border-dashed">
        <CardContent className="p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <Info className="h-3.5 w-3.5 text-primary" /> Ye order kyun? (research-based)
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Professional guides ke hisaab se <b className="text-foreground">title + thumbnail ka CONCEPT
            script se pehle</b> banta hai (MrBeast ka &ldquo;packaging first&rdquo; rule — packaging hi
            video ka promise hai), aur <b className="text-foreground">final thumbnail edit ke baad</b> —
            taaki video ke actual content se match kare. Sources: storyflow.so aur loopdesk.ai ke 2026
            production pipeline guides.
          </p>
        </CardContent>
      </Card>

      {/* ==================== ADD IDEA DIALOG ==================== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[440px] gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" /> Naya Idea Add Karo
            </DialogTitle>
            <DialogDescription>
              Topic aur detail likho — agent agli video banate waqt isi ko sabse pehle dekhega.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="idea-topic" className="text-[12px] font-medium">Kya topic hai? *</label>
              <Input
                id="idea-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Jaise: 30 din sirf AI shorts banaye — experiment"
                className="h-10"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="idea-details" className="text-[12px] font-medium">
                Detail description <span className="font-normal text-muted-foreground">(kya hai, kyun, kya cover karna hai)</span>
              </label>
              <Textarea
                id="idea-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Jaise: 30 din ka personal experiment, har short AI pipeline se, real numbers dikhaunga…"
                rows={4}
                className="resize-none text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveIdea} disabled={saving || !topic.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Idea Add Karo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
