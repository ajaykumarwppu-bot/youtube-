import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { safeResolve } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon", svg: "image/svg+xml",
  md: "text/markdown", txt: "text/plain", json: "application/json",
};

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const relPath = req.nextUrl.searchParams.get("path");
  if (!relPath) return NextResponse.json({ error: "path query required" }, { status: 400 });
  try {
    const abs = safeResolve(id, relPath);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const buf = fs.readFileSync(abs);
    const ext = (relPath.split(".").pop() || "").toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": mime, "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot read file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
