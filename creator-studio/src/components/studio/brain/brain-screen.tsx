"use client";

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, FlaskConical, Lightbulb, Microscope, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { FindingsTab } from "./findings-tab";
import { VideoDetail } from "./video-detail";
import { ResearchTab } from "./research-tab";
import { QuestionDetail } from "./question-detail";
import { ExperimentsTab } from "./experiments-tab";
import { ExperimentDetail } from "./experiment-detail";
import { SkillsTab } from "./skills-tab";
import type { BrainState, ProblemArea } from "@/lib/studio/brain-types";
import type { PackageEntry } from "@/lib/studio/types";

export type BrainTab = "findings" | "research" | "experiments" | "skills";
type BrainView = { t: "video" | "question" | "experiment"; id: string } | null;

interface Stats {
  packages: number;
  skills: number;
  enabledSkills: number;
  versions: number;
}

interface Props {
  packages: PackageEntry[];
  stats: Stats;
  loading: boolean;
  activeTab: BrainTab; // page.tsx me lift kiya — package detail se wapas aane par wahi tab dikhe
  onTabChange: (t: BrainTab) => void;
  onOpenPackageDetail: (id: string) => void;
  onTogglePackage: (pkg: PackageEntry, enabled: boolean) => Promise<void>;
  onDeletePackage: (pkg: PackageEntry) => Promise<void>;
  onReloadPackages: () => Promise<void>;
}

// MAIN BRAIN — agent ke dimaag ke 4 sections:
// 1. Findings/Lessons (videos ka analysis)  2. Research (raised questions)
// 3. Experiments (reports + next-video checklist)  4. Skills (existing manager)
export function BrainScreen({
  packages, stats, loading, activeTab, onTabChange, onOpenPackageDetail, onTogglePackage, onDeletePackage, onReloadPackages,
}: Props) {
  const tab = activeTab;
  const setTab = onTabChange;
  const [brain, setBrain] = useState<BrainState | null>(null);
  const [brainLoading, setBrainLoading] = useState(true);
  const [view, setView] = useState<BrainView>(null);

  const loadBrain = useCallback(async () => {
    try {
      const res = await fetch("/api/cs/brain");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setBrain(j as BrainState);
    } catch (e) {
      toast.error("Brain data load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setBrainLoading(false);
    }
  }, []);

  useEffect(() => { loadBrain(); }, [loadBrain]);

  const sendToResearch = useCallback(async (areas: ProblemArea[], videoId: string) => {
    try {
      const res = await fetch("/api/cs/brain/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas, videoId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await loadBrain();
      toast.success("Agent ne research queue me daal diya", {
        description: "Research tab me question dikhega — wahan links add karke Start Research dabao.",
      });
    } catch (e) {
      toast.error("Question raise failed", { description: e instanceof Error ? e.message : "" });
    }
  }, [loadBrain]);

  /* ---------- detail pages (full-screen push, app navigation jaisa) ---------- */
  if (view && brain) {
    if (view.t === "video") {
      const video = brain.videos.find((v) => v.id === view.id);
      if (video) {
        return (
          <VideoDetail
            video={video}
            brain={brain}
            onBack={() => setView(null)}
            onOpenQuestion={(id) => setView({ t: "question", id })}
            onSendToResearch={sendToResearch}
          />
        );
      }
    }
    if (view.t === "question") {
      const question = brain.questions.find((q) => q.id === view.id);
      if (question) {
        return (
          <QuestionDetail
            question={question}
            brain={brain}
            onBack={() => setView(null)}
            onChanged={loadBrain}
            onOpenVideo={(id) => setView({ t: "video", id })}
            onOpenExperiment={(id) => setView({ t: "experiment", id })}
          />
        );
      }
    }
    if (view.t === "experiment") {
      const experiment = brain.experiments.find((e) => e.id === view.id);
      if (experiment) {
        return <ExperimentDetail experiment={experiment} onBack={() => setView(null)} onChanged={loadBrain} />;
      }
    }
  }

  /* ---------- tab list view ---------- */
  const TABS: { key: BrainTab; label: string; icon: typeof Lightbulb; count: number }[] = [
    { key: "findings", label: "Findings", icon: Lightbulb, count: brain?.videos.length ?? 0 },
    { key: "research", label: "Research", icon: Microscope, count: brain?.questions.filter((q) => q.status !== "done").length ?? 0 },
    { key: "experiments", label: "Experiments", icon: FlaskConical, count: brain?.experiments.length ?? 0 },
    { key: "skills", label: "Skills", icon: Puzzle, count: stats.skills },
  ];

  return (
    <div className="space-y-4">
      {/* heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <BrainCircuit className="h-5 w-5 text-primary" /> Main Brain
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Agent ka dimaag — videos ka analysis, research, experiments aur skills.
          </p>
        </div>
        <BrainStateBadge />
      </div>

      {/* 4-section tab bar */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-secondary p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-colors ${
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground active:bg-secondary/70"
              }`}
            >
              <t.icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
              <span className={`text-[10.5px] leading-none ${active ? "font-semibold" : ""}`}>{t.label}</span>
              <span className={`rounded-full px-1.5 text-[9px] leading-[14px] ${active ? "bg-primary/15 text-primary" : "bg-background/60"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* tab content */}
      {tab === "findings" && (
        brainLoading || !brain ? <BrainSkeleton /> : (
          <FindingsTab videos={brain.videos} onOpenVideo={(id) => setView({ t: "video", id })} />
        )
      )}
      {tab === "research" && (
        brainLoading || !brain ? <BrainSkeleton /> : (
          <ResearchTab questions={brain.questions} onOpenQuestion={(id) => setView({ t: "question", id })} />
        )
      )}
      {tab === "experiments" && (
        brainLoading || !brain ? <BrainSkeleton /> : (
          <ExperimentsTab experiments={brain.experiments} onOpenExperiment={(id) => setView({ t: "experiment", id })} />
        )
      )}
      {tab === "skills" && (
        <SkillsTab
          packages={packages}
          stats={stats}
          loading={loading}
          onOpenDetail={onOpenPackageDetail}
          onTogglePackage={onTogglePackage}
          onDeletePackage={onDeletePackage}
          onReloadPackages={onReloadPackages}
        />
      )}
    </div>
  );
}

function BrainStateBadge() {
  return (
    <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full border border-primary/40 px-2 py-1 text-[10px] font-medium text-primary">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      Self-learning
    </span>
  );
}

function BrainSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-card/60" />
      ))}
    </div>
  );
}
