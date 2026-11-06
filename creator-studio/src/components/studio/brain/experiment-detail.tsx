"use client";

import { useState } from "react";
import { CheckCircle2, FlaskConical, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DetailBar } from "./detail-bar";
import { timeAgo } from "@/lib/studio/brain-format";
import type { ExperimentEntry } from "@/lib/studio/brain-types";

interface Props {
  experiment: ExperimentEntry;
  onBack: () => void;
  onChanged: () => Promise<void>; // brain refetch
}

// EXPERIMENT DETAIL — report ke sections (karna hai / mistakes), har point par
// enable/disable switch. Enabled points agent NEXT VIDEO me skills ke saath padhega.
export function ExperimentDetail({ experiment: e, onBack, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const activeCount = e.items.filter((i) => i.enabled).length;

  const patch = async (body: { itemId?: string; enabled?: boolean; setAll?: boolean }, key: string) => {
    setBusy(key);
    try {
      const res = await fetch(`/api/cs/brain/experiments/${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await onChanged();
    } catch (err) {
      toast.error("Toggle failed", { description: err instanceof Error ? err.message : "" });
    } finally {
      setBusy(null);
    }
  };

  const dos = e.items.filter((i) => i.kind === "do");
  const avoids = e.items.filter((i) => i.kind === "avoid");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DetailBar
        title="Experiment / Report"
        subtitle={`${timeAgo(e.createdAt)} • ${activeCount}/${e.items.length} active`}
        onBack={onBack}
        right={
          <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">
            <FlaskConical className="mr-0.5 h-3 w-3" /> Report
          </Badge>
        }
      />

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4">
        {/* header */}
        <div>
          <h2 className="text-[17px] font-bold leading-snug">{e.title}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Research question: {e.questionText}</p>
        </div>

        {/* summary */}
        <Card className="border-primary/30 p-0">
          <CardContent className="flex gap-2.5 p-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[13px] leading-relaxed">{e.summary}</p>
          </CardContent>
        </Card>

        {/* sources */}
        <section className="space-y-1.5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Ye report kis par based hai</h3>
          {e.sources.map((s, i) => (
            <p key={i} className="flex gap-2 px-1 text-[12px] leading-relaxed text-muted-foreground">
              <span className="text-primary">•</span> {s}
            </p>
          ))}
        </section>

        {/* DO items */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Ye karna hai
          </h3>
          {dos.map((item) => (
            <ItemRow key={item.id} item={item} busy={busy === item.id} onToggle={(en) => patch({ itemId: item.id, enabled: en }, item.id)} />
          ))}
        </section>

        {/* AVOID items */}
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <XCircle className="h-3.5 w-3.5 text-destructive" /> Ye mistakes nahi karni
          </h3>
          {avoids.map((item) => (
            <ItemRow key={item.id} item={item} busy={busy === item.id} onToggle={(en) => patch({ itemId: item.id, enabled: en }, item.id)} />
          ))}
        </section>

        {/* bulk controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" className="h-10 text-[13px]" disabled={busy !== null} onClick={() => patch({ setAll: true }, "all-on")}>
            Sab enable
          </Button>
          <Button variant="secondary" size="sm" className="h-10 text-[13px]" disabled={busy !== null} onClick={() => patch({ setAll: false }, "all-off")}>
            Sab disable
          </Button>
        </div>

        {/* next-video note */}
        <Card className="border-dashed p-0">
          <CardContent className="p-3.5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Next video me kya hoga:</span> Agent jo points
              enable rahenge ({activeCount}), unhe skills ke saath padhega aur video banate waqt try karega —
              phir us video ke findings me pata chalega ki kya kaam kiya.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  busy,
  onToggle,
}: {
  item: ExperimentEntry["items"][number];
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const isDo = item.kind === "do";
  return (
    <Card className={`p-0 transition-colors ${item.enabled ? (isDo ? "border-emerald-400/30" : "border-destructive/30") : "opacity-55"}`}>
      <CardContent className="flex items-start gap-2.5 p-3">
        {isDo ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        )}
        <p className={`min-w-0 flex-1 text-[13px] leading-relaxed ${item.enabled ? "" : "line-through decoration-white/30"}`}>
          {item.text}
        </p>
        <span className="shrink-0 pt-0.5">
          <Switch checked={item.enabled} disabled={busy} onCheckedChange={onToggle} aria-label="Experiment enable" />
        </span>
      </CardContent>
    </Card>
  );
}
