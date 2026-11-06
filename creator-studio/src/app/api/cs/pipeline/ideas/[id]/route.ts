import { NextRequest, NextResponse } from "next/server";
import { deleteIdea, readPipeline, updateIdea } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/cs/pipeline/ideas/[id] — idea edit karo (topic/details/status)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { topic?: string; details?: string; status?: "new" | "picked" | "done" }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const idea = updateIdea(id, body);
    return NextResponse.json({ idea });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 404 });
  }
}

// DELETE /api/cs/pipeline/ideas/[id] — idea hatao (picked/done idea delete nahi hota)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const state = readPipeline();
  const idea = state.ideas.find((i) => i.id === id);
  if (!idea) return NextResponse.json({ error: "Idea nahi mila" }, { status: 404 });
  if (idea.status === "picked") {
    return NextResponse.json({ error: "Is idea par run chal raha hai — pehle run khatam karo" }, { status: 409 });
  }
  if (idea.status === "done") {
    return NextResponse.json({ error: "Video ban chuki hai — idea record keep karna sahi hai" }, { status: 409 });
  }
  deleteIdea(id);
  return NextResponse.json({ ok: true });
}
