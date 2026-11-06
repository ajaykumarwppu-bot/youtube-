import { NextRequest, NextResponse } from "next/server";
import { mutateBrain, newId } from "@/lib/studio/brain";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// POST /api/cs/brain/questions/[id]/links — user ne custom link/reference add kiya
// body: { url: string, label?: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { url?: string; label?: string } | null;
  const url = body?.url?.trim();
  if (!url || !/^https?:\/\/.+/i.test(url)) {
    return NextResponse.json({ error: "Valid URL required (http/https)" }, { status: 400 });
  }

  const question = mutateBrain((st) => {
    const q = st.questions.find((x) => x.id === id);
    if (!q) return null;
    q.links.push({ id: newId(), url, label: body?.label?.trim() || url.replace(/^https?:\/\//, "").slice(0, 60) });
    return q;
  });

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json({ question });
}

// DELETE /api/cs/brain/questions/[id]/links?linkId=... — link remove
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const linkId = req.nextUrl.searchParams.get("linkId");
  if (!linkId) return NextResponse.json({ error: "linkId required" }, { status: 400 });

  const question = mutateBrain((st) => {
    const q = st.questions.find((x) => x.id === id);
    if (!q) return null;
    q.links = q.links.filter((l) => l.id !== linkId);
    return q;
  });

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json({ question });
}
