import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { buildFileTree, findPackage, packageDir, readIndex, writeIndex } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const idx = readIndex();
  const pkg = findPackage(idx, id);
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  const tree = buildFileTree(id);
  return NextResponse.json({ package: pkg, tree });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "body.enabled (boolean) required" }, { status: 400 });
  }
  const idx = readIndex();
  const pkg = findPackage(idx, id);
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  pkg.enabled = body.enabled;
  // package toggle also gates its skills (like AntiGem: disabled extension serves no tools)
  for (const s of pkg.skills) s.enabled = body.enabled;
  pkg.updatedAt = new Date().toISOString();
  writeIndex(idx);
  return NextResponse.json({ package: pkg });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const idx = readIndex();
  const pkg = findPackage(idx, id);
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  idx.packages = idx.packages.filter((p) => p.id !== id);
  writeIndex(idx);
  try {
    fs.rmSync(packageDir(id), { recursive: true, force: true });
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
