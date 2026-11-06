import { NextResponse } from "next/server";
import { readBrain } from "@/lib/studio/brain";

export const runtime = "nodejs";

// GET /api/cs/brain — full brain state (videos + questions + experiments), seeds on first call
export async function GET() {
  const state = readBrain();
  return NextResponse.json(state);
}
