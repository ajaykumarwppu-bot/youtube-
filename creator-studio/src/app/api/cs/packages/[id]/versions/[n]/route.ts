import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { buildTreeFrom, findPackage, readIndex, versionDir } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; n: string }> };

// GET /api/cs/packages/[id]/versions/[n] — kisi purane version ki file tree
// (tree paths version dir ke relative hote hain; file kholne ke liye client
//  path ke aage "versions/v<n>/" jodkar existing file API use karta hai)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id, n } = await params;
  const idx = readIndex();
  const pkg = findPackage(idx, id);
  if (!pkg) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const num = parseInt(n, 10);
  if (!Number.isFinite(num)) {
    return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
  }
  const upload = pkg.uploads?.find((u) => u.n === num);
  if (!upload) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  const dir = versionDir(id, num);
  if (!fs.existsSync(dir)) {
    // snapshot missing (migration se pehle ka data) — khaali tree
    return NextResponse.json({ n: num, tree: [], missing: true });
  }
  const tree = buildTreeFrom(dir, "");
  return NextResponse.json({ n: num, tree });
}
