import { NextRequest, NextResponse } from "next/server";
import { mutateBrain } from "@/lib/studio/brain";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/cs/brain/experiments/[id] — report item enable/disable (experiment toggle)
// body: { itemId: string, enabled: boolean } | { setAll: boolean }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { itemId?: string; enabled?: boolean; setAll?: boolean }
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const experiment = mutateBrain((st) => {
    const e = st.experiments.find((x) => x.id === id);
    if (!e) return null;
    if (typeof body.setAll === "boolean") {
      for (const item of e.items) item.enabled = body.setAll;
    } else if (body.itemId && typeof body.enabled === "boolean") {
      const item = e.items.find((i) => i.id === body.itemId);
      if (!item) return null;
      item.enabled = body.enabled;
    } else {
      return null;
    }
    return e;
  });

  if (!experiment) return NextResponse.json({ error: "Experiment or item not found" }, { status: 404 });
  return NextResponse.json({ experiment });
}
