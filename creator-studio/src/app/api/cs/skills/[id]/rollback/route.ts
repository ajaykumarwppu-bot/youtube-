import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { bumpVersion, findSkill, packageDir, readIndex, writeIndex } from "@/lib/studio/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const targetVersion = body?.version;
  if (typeof targetVersion !== "string" || !targetVersion) {
    return NextResponse.json({ error: "version (string) required" }, { status: 400 });
  }

  const idx = readIndex();
  const found = findSkill(idx, id);
  if (!found) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  const { pkg, skill } = found;

  const entry = skill.versions.find((v) => v.version === targetVersion);
  if (!entry) return NextResponse.json({ error: "Version not found in history" }, { status: 404 });

  try {
    const nextVersion = bumpVersion(skill.version, "patch");
    const now = new Date().toISOString();

    // restore old content to disk
    const abs = packageDir(pkg.id) + "/" + skill.path;
    fs.mkdirSync(abs.substring(0, abs.lastIndexOf("/")), { recursive: true });
    fs.writeFileSync(abs, entry.content, "utf8");

    skill.version = nextVersion;
    skill.versions.push({
      version: nextVersion,
      content: entry.content,
      savedAt: now,
      source: "rollback",
      note: `Rolled back to v${targetVersion}`,
    });
    const { parseSkillMarkdown } = await import("@/lib/studio/extract");
    const parsed = parseSkillMarkdown(entry.content, skill.name);
    skill.title = parsed.title;
    skill.description = parsed.description;
    skill.updatedAt = now;
    pkg.updatedAt = now;
    writeIndex(idx);

    return NextResponse.json({ skill });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rollback failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
