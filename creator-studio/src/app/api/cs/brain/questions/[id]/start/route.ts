import { NextRequest, NextResponse } from "next/server";
import { generateReport, mutateBrain } from "@/lib/studio/brain";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/cs/brain/questions/[id]/start — "Start Research"
// Prototype: agent turant report generate karta hai (server-side template).
// Phase 2: yahan web-search + link analysis ka real agent run hoga (job_id + poll pattern).
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const result = mutateBrain((st) => {
    const q = st.questions.find((x) => x.id === id);
    if (!q) return { error: "Question not found" as const };
    if (q.status === "researching") {
      return { error: "Research already running" as const };
    }

    const report = generateReport(q, st);
    q.status = "done";
    q.reportId = report.id;
    st.experiments.unshift(report);
    return { question: q, report };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Question not found" ? 404 : 409 });
  }
  return NextResponse.json(result);
}
