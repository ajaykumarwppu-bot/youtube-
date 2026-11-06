"use client";

import { ChevronRight, FileSearch, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AREA_LABEL } from "@/lib/studio/brain-format";
import type { ResearchQuestion } from "@/lib/studio/brain-types";

// RESEARCH tab — findings se raise hue questions. Repeat hone par count badhta hai
// ("ye question baar-baar uth raha hai"), aur yahin se research start hoti hai.
export function ResearchTab({
  questions,
  onOpenQuestion,
}: {
  questions: ResearchQuestion[];
  onOpenQuestion: (id: string) => void;
}) {
  const open = questions.filter((q) => q.status !== "done");
  const done = questions.filter((q) => q.status === "done");

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <FileSearch className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Abhi koi research question nahi</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Jab agent videos ke findings me problem pakdega, wo question yahan khud raise karega.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {[...open, ...done].map((q) => {
        const repeated = q.sourceVideoIds.length > 1;
        return (
          <button key={q.id} type="button" onClick={() => onOpenQuestion(q.id)} className="block w-full text-left">
            <Card className="p-0 transition-colors active:bg-secondary/60">
              <CardContent className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-snug">{q.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {repeated ? (
                        <Badge variant="outline" className="border-amber-400/50 px-1.5 py-0 text-[10px] text-amber-400">
                          <FlaskConical className="mr-0.5 h-3 w-3" /> {q.sourceVideoIds.length} videos me issue
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                          {q.sourceVideoIds.length} video se
                        </Badge>
                      )}
                      {q.areas.map((a) => (
                        <Badge key={a} variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {AREA_LABEL[a]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <StatusChip status={q.status} />
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}

function StatusChip({ status }: { status: ResearchQuestion["status"] }) {
  if (status === "done") {
    return (
      <Badge variant="outline" className="shrink-0 border-emerald-400/50 px-1.5 py-0 text-[10px] text-emerald-400">
        Report ready
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 border-primary/40 px-1.5 py-0 text-[10px] text-primary">
      Open
    </Badge>
  );
}
