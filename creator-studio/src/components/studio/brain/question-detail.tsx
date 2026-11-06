"use client";

import { useState } from "react";
import {
  CheckCircle2, ExternalLink, FileSearch, FlaskConical, Lightbulb, Link2,
  Loader2, Plus, Target, Trash2, TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DetailBar } from "./detail-bar";
import { AREA_LABEL, timeAgo } from "@/lib/studio/brain-format";
import type { BrainState, ResearchQuestion } from "@/lib/studio/brain-types";

interface Props {
  question: ResearchQuestion;
  brain: BrainState;
  onBack: () => void;
  onChanged: () => Promise<void>; // full brain refetch
  onOpenVideo: (id: string) => void;
  onOpenExperiment: (id: string) => void;
}

// QUESTION DETAIL — problem, kyun research karni hai, topics, user links, Start Research
export function QuestionDetail({ question, brain, onBack, onChanged, onOpenVideo, onOpenExperiment }: Props) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [starting, setStarting] = useState(false);

  const videos = brain.videos.filter((v) => question.sourceVideoIds.includes(v.id));

  const addLink = async () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      toast.error("Valid URL dalo (https://...)");
      return;
    }
    setAddingLink(true);
    try {
      const res = await fetch(`/api/cs/brain/questions/${question.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label: linkLabel.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setLinkUrl("");
      setLinkLabel("");
      await onChanged();
      toast.success("Link add ho gaya — research me use hoga");
    } catch (e) {
      toast.error("Link add failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setAddingLink(false);
    }
  };

  const removeLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/cs/brain/questions/${question.id}/links?linkId=${linkId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      await onChanged();
    } catch (e) {
      toast.error("Link remove failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const startResearch = async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/cs/brain/questions/${question.id}/start`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);

      // agent ko kaam karte hue dikhao (prototype simulation), phir report kholo
      setTimeout(async () => {
        await onChanged();
        setStarting(false);
        if (j.report?.id) {
          toast.success("Report ready — Experiments tab me bhi saved hai");
          onOpenExperiment(j.report.id);
        }
      }, 2200);
    } catch (e) {
      setStarting(false);
      toast.error("Research start failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailBar
        title="Research Question"
        subtitle={`Raised ${timeAgo(question.createdAt)}`}
        onBack={onBack}
        right={<StatusBadge status={question.status} />}
      />

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4">
        {/* question text */}
        <Card className="border-primary/30 p-0">
          <CardContent className="p-3.5">
            <div className="flex items-start gap-2.5">
              <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-snug">{question.text}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {question.areas.map((a) => (
                    <Badge key={a} variant="secondary" className="text-[10px]">{AREA_LABEL[a]}</Badge>
                  ))}
                  {question.sourceVideoIds.length > 1 && (
                    <Badge variant="outline" className="border-amber-400/50 text-[10px] text-amber-400">
                      {question.sourceVideoIds.length} videos me repeat
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* source videos */}
        {videos.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Source videos</h3>
            {videos.map((v) => (
              <button key={v.id} type="button" onClick={() => onOpenVideo(v.id)} className="block w-full text-left">
                <Card className="p-0 transition-colors active:bg-secondary/60">
                  <CardContent className="flex items-center gap-2 p-2.5">
                    <Badge variant="outline" className="shrink-0 text-[9px] uppercase">{v.kind}</Badge>
                    <p className="min-w-0 flex-1 truncate text-[13px]">{v.topic}</p>
                    <p className="shrink-0 text-[11px] text-muted-foreground">CTR {v.metrics.ctr}%</p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </section>
        )}

        {/* problem */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <TriangleAlert className="h-3.5 w-3.5 text-destructive" /> Problem kya pakdi agent ne
          </h3>
          <Card className="p-0">
            <CardContent className="p-3.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{question.problem}</p>
            </CardContent>
          </Card>
        </section>

        {/* why */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" /> Research kyun zaroori hai
          </h3>
          <Card className="p-0">
            <CardContent className="p-3.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{question.why}</p>
            </CardContent>
          </Card>
        </section>

        {/* topics */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary" /> Kin topics par research hoga
          </h3>
          {question.topics.map((t, i) => (
            <Card key={i} className="p-0">
              <CardContent className="flex items-start gap-2.5 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-[13px] leading-relaxed">{t}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* links */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="h-3.5 w-3.5 text-primary" /> Links & References (optional)
          </h3>
          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            Apne channels, videos ya articles ke links dalo — agent inhi ke hisaab se research karega.
            Khali chhoda to agent khud internet par dhundhega.
          </p>
          {question.links.map((l) => (
            <Card key={l.id} className="p-0">
              <CardContent className="flex items-center gap-2.5 p-3">
                <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{l.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{l.url}</p>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLink(l.id)} aria-label="Remove link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed p-0">
            <CardContent className="space-y-2 p-3">
              <Input
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Label (e.g. Thumbnail design video)"
                className="h-10 text-[13px]"
              />
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="h-10 flex-1 text-[13px]"
                  inputMode="url"
                />
                <Button size="sm" className="h-10 shrink-0 px-3" disabled={addingLink} onClick={addLink}>
                  {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* report ready → jump */}
        {question.status === "done" && question.reportId && (
          <Button variant="outline" className="h-11 w-full border-emerald-400/50 text-[14px] font-semibold text-emerald-400" onClick={() => onOpenExperiment(question.reportId!)}>
            <FlaskConical className="mr-2 h-4 w-4" /> Report ready — dekho
          </Button>
        )}

        {/* start research */}
        {question.status !== "done" && (
          <Button className="h-12 w-full text-[15px] font-bold" disabled={starting} onClick={startResearch}>
            {starting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Agent research kar raha hai…
              </>
            ) : (
              <>
                <FlaskConical className="mr-2 h-5 w-5" /> Start Research
              </>
            )}
          </Button>
        )}
        {starting && (
          <p className="px-1 text-center text-[12px] leading-relaxed text-muted-foreground">
            Agent links padh raha hai, internet research kar raha hai… report banne me kuch second lagenge.
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ResearchQuestion["status"] }) {
  if (status === "done") {
    return <Badge variant="outline" className="shrink-0 border-emerald-400/50 text-[10px] text-emerald-400">Done</Badge>;
  }
  return <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">Open</Badge>;
}
