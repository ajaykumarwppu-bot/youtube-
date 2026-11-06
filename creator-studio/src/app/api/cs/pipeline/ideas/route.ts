import { NextRequest, NextResponse } from "next/server";
import { addIdea } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

// POST /api/cs/pipeline/ideas — Idea Bank me naya idea add karo
// body: { topic: string, details?: string }
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { topic?: string; details?: string } | null;
  const topic = body?.topic?.trim();
  if (!topic) return NextResponse.json({ error: "Topic zaroori hai" }, { status: 400 });

  const idea = addIdea(topic, body?.details ?? "");
  return NextResponse.json({ idea }, { status: 201 });
}
