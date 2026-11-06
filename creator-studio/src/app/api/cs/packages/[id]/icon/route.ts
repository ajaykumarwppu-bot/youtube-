import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { findPackage, packageDir, readIndex } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon",
};

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const idx = readIndex();
  const pkg = findPackage(idx, id);
  if (!pkg || !pkg.icon) return NextResponse.json({ error: "No icon" }, { status: 404 });

  try {
    const abs = path.resolve(packageDir(id), pkg.icon);
    if (!abs.startsWith(packageDir(id)) || !fs.existsSync(abs)) {
      return NextResponse.json({ error: "No icon" }, { status: 404 });
    }
    const buf = fs.readFileSync(abs);
    const ext = (pkg.icon.split(".").pop() || "").toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": MIME[ext] || "image/png", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "No icon" }, { status: 404 });
  }
}
