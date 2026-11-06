import { NextRequest, NextResponse } from "next/server";
import { startRunFromIdea } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/cs/pipeline/ideas/[id]/start — is idea par production run shuru karo
// (agent isi idea par kaam shuru karega — status picked ho jayega)
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { idea, run } = startRunFromIdea(id);
    return NextResponse.json({ idea, run }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Run start failed" },
      { status: 400 }
    );
  }
}
