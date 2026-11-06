import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/cs/health — StudioServerManager + studio_health MCP tool ka health probe.
// Server ne "ready:true" hi jawab diya to app WebView kholta hai.
export async function GET() {
  return NextResponse.json({ ready: true, app: "creator-studio" });
}
