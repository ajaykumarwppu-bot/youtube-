"use client";

import { ChevronRight, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/studio/brain-format";
import type { ExperimentEntry } from "@/lib/studio/brain-types";

// EXPERIMENTS tab — research reports yahan aati hain. Report ke andar kaunse
// points next video me experiment karne hain, wo enable/disable hota hai.
export function ExperimentsTab({
  experiments,
  onOpenExperiment,
}: {
  experiments: ExperimentEntry[];
  onOpenExperiment: (id: string) => void;
}) {
  if (experiments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Abhi koi experiment nahi</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Research tab me kisi question par &quot;Start Research&quot; dabao — report banke yahan
            aa jayegi, phir uske points next video me experiment honge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {experiments.map((e) => {
        const active = e.items.filter((i) => i.enabled).length;
        return (
          <button key={e.id} type="button" onClick={() => onOpenExperiment(e.id)} className="block w-full text-left">
            <Card className="p-0 transition-colors active:bg-secondary/60">
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[14px] font-semibold leading-snug">{e.title}</p>
                  <Badge variant="outline" className="shrink-0 border-primary/40 px-1.5 py-0 text-[10px] text-primary">
                    {active}/{e.items.length} active
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Q: {e.questionText} • {timeAgo(e.createdAt)}</p>
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{e.summary}</p>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary">
                  Report kholo <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
