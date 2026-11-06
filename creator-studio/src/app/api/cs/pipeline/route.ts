import { NextResponse } from "next/server";
import { readPipeline } from "@/lib/studio/pipeline";

export const runtime = "nodejs";

// GET /api/cs/pipeline — idea bank + production runs (seeded on first call)
export async function GET() {
  const state = readPipeline();
  return NextResponse.json(state);
}
