import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { packageDir, readFileContent, safeResolve } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const relPath = req.nextUrl.searchParams.get("path");
  if (!relPath) return NextResponse.json({ error: "path query required" }, { status: 400 });

  try {
    if (req.nextUrl.searchParams.get("download") === "1") {
      const abs = safeResolve(id, relPath);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      const buf = fs.readFileSync(abs);
      const name = relPath.split("/").pop() || "file";
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
        },
      });
    }

    const result = readFileContent(id, relPath);

    if (result.isImage) {
      const abs = safeResolve(id, relPath);
      const ext = (relPath.split(".").pop() || "").toLowerCase();
      result.content = `/api/cs/packages/${id}/raw?path=${encodeURIComponent(relPath)}`;
      result.language = ext || "image";
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cannot read file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
