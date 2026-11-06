import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/studio/dashboard";

export const runtime = "nodejs";

// GET /api/cs/dashboard — Home screen ka overall channel health summary (read-only)
export async function GET() {
  try {
    return NextResponse.json(buildDashboard());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dashboard load failed" },
      { status: 500 }
    );
  }
}
