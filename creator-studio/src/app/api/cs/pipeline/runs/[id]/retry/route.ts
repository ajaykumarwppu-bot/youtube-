import { NextRequest, NextResponse } from "next/server";
import { retryRun } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/cs/pipeline/runs/[id]/retry — failed run wahin se resume karo
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const run = retryRun(id);
    return NextResponse.json({ run });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Retry failed" },
      { status: 400 }
    );
  }
}
