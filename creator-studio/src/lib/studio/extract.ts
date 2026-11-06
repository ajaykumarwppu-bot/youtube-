import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import {
  PACKAGES_ROOT, countPackageFiles, findPackage, isTextFile, newId, packageDir,
  readIndex, snapshotCurrentVersion, writeIndex,
} from "./store";
import type { PackageEntry, SkillMeta, UploadVersion, VersionEntry } from "./types";

// ---------- small utils ----------

class UploadError extends Error {}

function sanitizeZipPath(name: string): string | null {
  // normalize windows separators, reject traversal & absolute paths
  let p = name.replace(/\\/g, "/");
  if (p.startsWith("/") || p.includes("../") || p === ".." || p.includes("\0")) return null;
  // skip mac junk
  if (p.startsWith("__MACOSX/") || p.split("/").some((seg) => seg === ".DS_Store" || seg === ".AppleDouble")) return null;
  return p;
}

export interface ParsedManifest {
  manifestVersion?: number;
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  icon?: string;
  permissions?: string[];
  mcpToolsCount?: number;
  raw?: unknown;
}

export function parseManifestJson(text: string): ParsedManifest {
  try {
    const j = JSON.parse(text);
    return {
      manifestVersion: typeof j.manifest_version === "number" ? j.manifest_version : undefined,
      id: typeof j.id === "string" ? j.id : undefined,
      name: typeof j.name === "string" ? j.name : undefined,
      version: typeof j.version === "string" ? j.version : undefined,
      description: typeof j.description === "string" ? j.description : undefined,
      icon: typeof j.icon === "string" ? j.icon : typeof j.icons?.["128"] === "string" ? j.icons["128"] : typeof j.icons?.["48"] === "string" ? j.icons["48"] : undefined,
      permissions: Array.isArray(j.permissions) ? j.permissions.filter((x) => typeof x === "string") : [],
      mcpToolsCount: Array.isArray(j.mcp_tools) ? j.mcp_tools.length : 0,
      raw: j,
    };
  } catch {
    throw new UploadError("manifest.json is not valid JSON");
  }
}

// ---------- frontmatter / markdown parsing (AntiGem skills.md rules) ----------

export function parseSkillMarkdown(content: string, fallbackName: string): { title: string; description: string } {
  let title = "";
  let description = "";
  let body = content;

  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) {
    body = content.slice(fm[0].length);
    const lines = fm[1].split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^(name|description):\s*(.*)$/);
      if (m) {
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        if (m[1] === "name" && val) title = val;
        if (m[1] === "description" && val) description = val;
      }
    }
  }

  if (!title) {
    const h1 = body.match(/^#\s+(.+)$/m);
    if (h1) title = h1[1].trim();
  }
  if (!title) title = fallbackName;

  if (!description) {
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith("#") || t.startsWith("!") || t.startsWith("---") || t.startsWith("```")) continue;
      description = t.replace(/[*_`>]/g, "").slice(0, 240);
      break;
    }
  }

  return { title, description };
}

// ---------- core: build a skill from an .md file on disk ----------

function buildSkillFromDisk(
  pkgId: string,
  absRoot: string,
  relPath: string, // e.g. "skills/youtube_upload.md" (relative to package root)
  enabledByDefault: boolean,
  uploadedAt: string
): SkillMeta {
  const abs = path.join(absRoot, relPath);
  const content = fs.readFileSync(abs, "utf8");
  const name = path.basename(relPath).replace(/\.md$/i, "");
  const { title, description } = parseSkillMarkdown(content, name);

  // detail files: skills/<skillName>/** (any depth)
  const skillDirRel = path.posix.join(path.posix.dirname(relPath), name);
  const detailFiles: string[] = [];
  const skillDirAbs = path.join(absRoot, skillDirRel);
  if (fs.existsSync(skillDirAbs) && fs.statSync(skillDirAbs).isDirectory()) {
    const walk = (dir: string, rel: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const relPath2 = rel ? rel + "/" + e.name : e.name;
        if (e.isDirectory()) walk(path.join(dir, e.name), relPath2);
        else if (e.isFile()) detailFiles.push(relPath2);
      }
    };
    walk(skillDirAbs, skillDirRel);
  }

  const version: VersionEntry = {
    version: "1.0.0",
    content,
    savedAt: uploadedAt,
    source: "upload",
  };

  return {
    id: `${pkgId}:${relPath.replace(/\//g, "__")}`, // URL-safe: no slashes in ids
    packageId: pkgId,
    name,
    title,
    description,
    path: relPath,
    detailFiles,
    enabled: enabledByDefault,
    version: "1.0.0",
    versions: [version],
    updatedAt: uploadedAt,
  };
}

// ---------- entry: register an uploaded zip ----------

export function registerZipPackage(buffer: Buffer, originalFileName: string): PackageEntry {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new UploadError("File is not a valid ZIP archive");
  }

  const entries = zip.getEntries();
  const files: { zipPath: string; entry: AdmZip.IZipEntry }[] = [];
  for (const e of entries) {
    if (e.isDirectory) continue;
    const clean = sanitizeZipPath(e.entryName);
    if (!clean) continue;
    files.push({ zipPath: clean, entry: e });
  }
  if (files.length === 0) throw new UploadError("ZIP is empty (no extractable files)");

  // locate manifest.json at root or inside a single enclosing folder
  const topLevel = new Set(files.map((f) => f.zipPath.split("/")[0]));
  let rootPrefix = "";
  let manifestZipPath = files.find((f) => f.zipPath === "manifest.json")?.zipPath;

  if (!manifestZipPath) {
    if (topLevel.size === 1) {
      const only = [...topLevel][0];
      const candidate = `${only}/manifest.json`;
      if (files.some((f) => f.zipPath === candidate)) {
        rootPrefix = only + "/";
        manifestZipPath = candidate;
      }
    }
  }

  const pkgId = newId();
  const now = new Date().toISOString();
  const absRoot = path.join(PACKAGES_ROOT, pkgId);

  // extract everything under rootPrefix
  for (const { zipPath, entry } of files) {
    if (!zipPath.startsWith(rootPrefix)) continue;
    const rel = zipPath.slice(rootPrefix.length);
    if (!rel) continue;
    const dest = path.resolve(absRoot, rel);
    if (dest !== absRoot && !dest.startsWith(absRoot + path.sep)) continue; // belt & suspenders
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, entry.getData());
  }

  const manifest = manifestZipPath ? parseManifestJson(files.find((f) => f.zipPath === manifestZipPath)!.entry.getData().toString("utf8")) : null;

  // skills: .md directly inside skills/ (relative to package root)
  const skillRelPaths = files
    .filter((f) => f.zipPath.startsWith(rootPrefix))
    .map((f) => f.zipPath.slice(rootPrefix.length))
    .filter((rel) => /^skills\/[^/]+\.md$/i.test(rel));

  const skills = skillRelPaths
    .map((rel) => {
      try {
        return buildSkillFromDisk(pkgId, absRoot, rel, true, now);
      } catch {
        return null;
      }
    })
    .filter((s): s is SkillMeta => s !== null);

  // name / version / description — auto from manifest, user types nothing
  const zipBase = originalFileName.replace(/\.zip$/i, "") || "uploaded-plugin";
  const name = manifest?.name || zipBase;
  const version = manifest?.version || "1.0.0";

  let description = manifest?.description || "";
  if (!description) {
    const readmeRel = files
      .map((f) => f.zipPath.slice(rootPrefix.length))
      .find((rel) => /^readme\.md$/i.test(rel));
    if (readmeRel) {
      try {
        const txt = fs.readFileSync(path.join(absRoot, readmeRel), "utf8");
        description = parseSkillMarkdown(txt, "").description;
      } catch { /* ignore */ }
    }
  }
  if (!description && skills.length > 0) description = skills[0].description;
  if (!description) description = `ZIP package with ${files.length} files`;

  // icon
  let icon: string | undefined;
  if (manifest?.icon) {
    const rel = manifest.icon.replace(/\\/g, "/").replace(/^\.\//, "");
    const found = files.find((f) => f.zipPath === rootPrefix + rel) ||
      files.find((f) => f.zipPath.slice(rootPrefix.length).endsWith("/" + rel));
    if (found) icon = found.zipPath.slice(rootPrefix.length);
  }

  const type: PackageEntry["type"] = skills.length > 0 || manifest ? "plugin" : "zip";
  const fileCount = countPackageFiles(pkgId);
  const uploads: UploadVersion[] = [
    { n: 1, addedAt: now, fileName: originalFileName, fileCount },
  ];

  return {
    id: pkgId,
    name,
    type,
    version,
    description,
    icon,
    manifestId: manifest?.id,
    manifestVersion: manifest?.manifestVersion,
    permissions: manifest?.permissions || [],
    mcpToolsCount: manifest?.mcpToolsCount || 0,
    enabled: true,
    installedAt: now,
    updatedAt: now,
    originalFileName,
    rootPrefix,
    fileCount,
    uploads,
    skills,
  };
}

// ---------- entry: EXISTING skill me naya version upload (version control) ----------

// same skill ke andar naya zip/file version add karta hai:
// 1. current files -> versions/v<prev>/ snapshot  2. naye files root par extract
// 3. purani upload entry disabledAt + nayi entry push
export function addPackageVersion(pkgId: string, buffer: Buffer, originalFileName: string): PackageEntry {
  // 1) index se package dhundo
  const idx = readIndex();
  const pkg = findPackage(idx, pkgId);
  if (!pkg) throw new UploadError("Skill not found — naya version sirf existing skill par add hota hai");

  // 2) zip validate + parse pehle karo (fail hone par kuch bhi na badle)
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new UploadError("File is not a valid ZIP archive");
  }
  const entries = zip.getEntries();
  const files: { zipPath: string; entry: AdmZip.IZipEntry }[] = [];
  for (const e of entries) {
    if (e.isDirectory) continue;
    const clean = sanitizeZipPath(e.entryName);
    if (!clean) continue;
    files.push({ zipPath: clean, entry: e });
  }
  if (files.length === 0) throw new UploadError("ZIP is empty (no extractable files)");

  const topLevel = new Set(files.map((f) => f.zipPath.split("/")[0]));
  let rootPrefix = "";
  let manifestZipPath = files.find((f) => f.zipPath === "manifest.json")?.zipPath;
  if (!manifestZipPath) {
    if (topLevel.size === 1) {
      const only = [...topLevel][0];
      const candidate = `${only}/manifest.json`;
      if (files.some((f) => f.zipPath === candidate)) {
        rootPrefix = only + "/";
        manifestZipPath = candidate;
      }
    }
  }

  const now = new Date().toISOString();
  const absRoot = packageDir(pkgId);
  const prevLatestN = pkg.uploads.length > 0 ? pkg.uploads[pkg.uploads.length - 1].n : 0;
  const nextN = prevLatestN + 1;

  // 3) current files ko versions/v<prevN>/ me snapshot karo
  if (prevLatestN > 0) snapshotCurrentVersion(pkgId, prevLatestN);

  // 4) naye files extract karo (root ab khali hai, versions/ folder waisa hi rahega)
  for (const { zipPath, entry } of files) {
    if (!zipPath.startsWith(rootPrefix)) continue;
    const rel = zipPath.slice(rootPrefix.length);
    if (!rel) continue;
    const dest = path.resolve(absRoot, rel);
    if (dest !== absRoot && !dest.startsWith(absRoot + path.sep)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, entry.getData());
  }

  // 5) skills / name / description / icon dobara detect karo
  const manifest = manifestZipPath
    ? parseManifestJson(files.find((f) => f.zipPath === manifestZipPath)!.entry.getData().toString("utf8"))
    : null;

  const skillRelPaths = files
    .filter((f) => f.zipPath.startsWith(rootPrefix))
    .map((f) => f.zipPath.slice(rootPrefix.length))
    .filter((rel) => /^skills\/[^/]+\.md$/i.test(rel));

  const skills = skillRelPaths
    .map((rel) => {
      try {
        return buildSkillFromDisk(pkgId, absRoot, rel, true, now);
      } catch {
        return null;
      }
    })
    .filter((s): s is SkillMeta => s !== null);

  const zipBase = originalFileName.replace(/\.zip$/i, "") || "uploaded-plugin";
  const name = manifest?.name || zipBase;
  const version = manifest?.version || `1.${nextN}.0`;

  let description = manifest?.description || "";
  if (!description) {
    const readmeRel = files
      .map((f) => f.zipPath.slice(rootPrefix.length))
      .find((rel) => /^readme\.md$/i.test(rel));
    if (readmeRel) {
      try {
        const txt = fs.readFileSync(path.join(absRoot, readmeRel), "utf8");
        description = parseSkillMarkdown(txt, "").description;
      } catch { /* ignore */ }
    }
  }
  if (!description && skills.length > 0) description = skills[0].description;
  if (!description) description = `ZIP package with ${files.length} files`;

  let icon: string | undefined;
  if (manifest?.icon) {
    const rel = manifest.icon.replace(/\\/g, "/").replace(/^\.\//, "");
    const found = files.find((f) => f.zipPath === rootPrefix + rel) ||
      files.find((f) => f.zipPath.slice(rootPrefix.length).endsWith("/" + rel));
    if (found) icon = found.zipPath.slice(rootPrefix.length);
  }

  const fileCount = countPackageFiles(pkgId);

  // 6) index update — purani entry disabled, nayi push
  if (pkg.uploads.length > 0 && !pkg.uploads[pkg.uploads.length - 1].disabledAt) {
    pkg.uploads[pkg.uploads.length - 1].disabledAt = now;
  }
  pkg.uploads.push({ n: nextN, addedAt: now, fileName: originalFileName, fileCount });
  pkg.name = name;
  pkg.version = version;
  pkg.description = description;
  pkg.icon = icon;
  pkg.manifestId = manifest?.id;
  pkg.manifestVersion = manifest?.manifestVersion;
  pkg.permissions = manifest?.permissions || [];
  pkg.mcpToolsCount = manifest?.mcpToolsCount || 0;
  pkg.type = skills.length > 0 || manifest ? "plugin" : "zip";
  pkg.rootPrefix = rootPrefix;
  pkg.fileCount = fileCount;
  pkg.skills = skills;
  pkg.updatedAt = now;

  writeIndex(idx);
  return pkg;
}

// ---------- entry: register a single uploaded file ----------

export function registerSingleFile(buffer: Buffer, originalFileName: string): PackageEntry {
  const pkgId = newId();
  const now = new Date().toISOString();
  const absRoot = path.join(PACKAGES_ROOT, pkgId);
  fs.mkdirSync(absRoot, { recursive: true });

  const safeName = path.basename(originalFileName).replace(/[\\/\0]/g, "_") || "file";
  fs.writeFileSync(path.join(absRoot, safeName), buffer);

  const base: PackageEntry = {
    id: pkgId,
    name: safeName,
    type: "file",
    version: "1.0.0",
    description: "Uploaded file",
    permissions: [],
    mcpToolsCount: 0,
    enabled: true,
    installedAt: now,
    updatedAt: now,
    originalFileName: safeName,
    rootPrefix: "",
    fileCount: 1,
    uploads: [{ n: 1, addedAt: now, fileName: safeName, fileCount: 1 }],
    skills: [],
  };

  if (/\.md$/i.test(safeName)) {
    // single markdown → standalone skill (the agent brain can use it directly)
    const skill = buildSkillFromDisk(pkgId, absRoot, safeName, true, now);
    const { title, description } = parseSkillMarkdown(buffer.toString("utf8"), path.basename(safeName, ".md"));
    return {
      ...base,
      name: title || path.basename(safeName, ".md"),
      type: "single",
      description: description || "Single skill file",
      skills: [skill],
    };
  }

  if (isTextFile(safeName)) {
    const preview = buffer.subarray(0, 240).toString("utf8").replace(/\s+/g, " ").trim();
    base.description = preview ? `Text file — ${preview.slice(0, 140)}` : "Uploaded text file";
  }
  return base;
}
