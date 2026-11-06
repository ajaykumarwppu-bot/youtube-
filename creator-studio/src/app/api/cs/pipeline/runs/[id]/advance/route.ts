import { NextRequest, NextResponse } from "next/server";
import { advanceRun } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/cs/pipeline/runs/[id]/advance — "agent agla step pura karo"
// active stage → done, next stage → active (last hone par production ready)
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const run = advanceRun(id);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Advance failed" },
      { status: 400 }
    );
  }
}
