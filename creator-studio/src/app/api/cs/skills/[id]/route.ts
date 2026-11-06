import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { findSkill, packageDir, readIndex, writeIndex, bumpVersion } from "@/lib/studio/store";
import type { SkillEditRequest } from "@/lib/studio/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | ({ enabled: boolean } | SkillEditRequest)
    | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const idx = readIndex();
  const found = findSkill(idx, id);
  if (!found) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  const { pkg, skill } = found;

  // ---- toggle enable/disable ----
  if ("enabled" in body && typeof body.enabled === "boolean" && !("content" in body)) {
    if (!pkg.enabled && body.enabled) {
      return NextResponse.json({ error: "Package is disabled — enable the package first" }, { status: 409 });
    }
    skill.enabled = body.enabled;
    skill.updatedAt = new Date().toISOString();
    writeIndex(idx);
    return NextResponse.json({ skill });
  }

  // ---- edit content → new version ----
  const edit = body as SkillEditRequest;
  if (typeof edit.content !== "string" || edit.content.trim().length === 0) {
    return NextResponse.json({ error: "content (non-empty string) required" }, { status: 400 });
  }
  const bump = edit.bump || "patch";

  try {
    const nextVersion = bumpVersion(skill.version, bump, edit.customVersion);
    if (nextVersion === skill.version) {
      return NextResponse.json({ error: "New version must be different from current" }, { status: 400 });
    }

    // write new content to the real file on disk (source of truth)
    const abs = packageDir(pkg.id) + "/" + skill.path;
    const parent = abs.substring(0, abs.lastIndexOf("/"));
    fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(abs, edit.content, "utf8");

    const now = new Date().toISOString();
    skill.version = nextVersion;
    skill.versions.push({
      version: nextVersion,
      content: edit.content,
      savedAt: now,
      source: "edit",
      note: edit.note || undefined,
    });
    // refresh title/description from new content
    const { parseSkillMarkdown } = await import("@/lib/studio/extract");
    const parsed = parseSkillMarkdown(edit.content, skill.name);
    skill.title = parsed.title;
    skill.description = parsed.description;
    skill.updatedAt = now;
    pkg.updatedAt = now;
    writeIndex(idx);

    return NextResponse.json({ skill });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const idx = readIndex();
  const found = findSkill(idx, id);
  if (!found) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  const { pkg, skill } = found;
  // include current on-disk content
  let current = "";
  try {
    current = fs.readFileSync(packageDir(pkg.id) + "/" + skill.path, "utf8");
  } catch { /* missing file */ }
  return NextResponse.json({ skill, package: { id: pkg.id, name: pkg.name, enabled: pkg.enabled }, currentContent: current });
}
