// Creator Studio — Skill package import (STATIC ENGINE)
// ---------------------------------------------------------------------------
// Pehle adm-zip + fs tha. Ab browser me: fflate se zip kholte hain aur files
// IndexedDB (files store) me jaati hain. Metadata logic pehle jaisa hi hai.

import { unzipSync } from "fflate";
import {
  countPackageFiles, findPackage, isTextFile, newId, putPackageFile,
  readIndex, snapshotCurrentVersion, deletePackageFile, fileList, deletePackageFiles,
  writeIndex,
} from "./store";
import type { PackageEntry, SkillMeta, UploadVersion, VersionEntry } from "./types";

// ---------- small utils ----------

export class UploadError extends Error {}

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
      permissions: Array.isArray(j.permissions) ? (j.permissions as unknown[]).filter((x: unknown): x is string => typeof x === "string") : [],
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

// ---------- zip helpers ----------

interface ZipFile {
  zipPath: string;
  data: Uint8Array;
}

function unzipFiles(buffer: ArrayBuffer): ZipFile[] {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new UploadError("File is not a valid ZIP archive");
  }
  const files: ZipFile[] = [];
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith("/")) continue; // directory entry
    const clean = sanitizeZipPath(name);
    if (!clean) continue;
    files.push({ zipPath: clean, data });
  }
  return files;
}

function detectRootPrefix(files: ZipFile[]): { rootPrefix: string; manifestZipPath?: string } {
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
  return { rootPrefix, manifestZipPath };
}

// ---------- core: build a skill from a stored .md file ----------

async function buildSkillFromStore(
  pkgId: string,
  relPath: string, // e.g. "skills/youtube_upload.md" (relative to package root)
  enabledByDefault: boolean,
  uploadedAt: string
): Promise<SkillMeta> {
  const buf = await import("./idb").then((m) => m.fileGet(pkgId, relPath));
  if (buf === null) throw new UploadError("Skill file missing");
  const content = new TextDecoder().decode(buf);
  const name = relPath.split("/").pop()!.replace(/\.md$/i, "");
  const { title, description } = parseSkillMarkdown(content, name);

  // detail files: skills/<skillName>/** (any depth)
  const skillDirRel = relPath.slice(0, relPath.lastIndexOf("/")) + "/" + name;
  const all = await fileList(pkgId, true);
  const detailFiles = all.filter((p) => p.startsWith(skillDirRel + "/"));

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

export async function registerZipPackage(buffer: ArrayBuffer, originalFileName: string): Promise<PackageEntry> {
  const files = unzipFiles(buffer);
  if (files.length === 0) throw new UploadError("ZIP is empty (no extractable files)");

  const { rootPrefix, manifestZipPath } = detectRootPrefix(files);

  const pkgId = newId();
  const now = new Date().toISOString();

  // extract everything under rootPrefix → IDB
  for (const { zipPath, data } of files) {
    if (!zipPath.startsWith(rootPrefix)) continue;
    const rel = zipPath.slice(rootPrefix.length);
    if (!rel) continue;
    await putPackageFile(pkgId, rel, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  }

  const manifest = manifestZipPath
    ? parseManifestJson(new TextDecoder().decode(files.find((f) => f.zipPath === manifestZipPath)!.data))
    : null;

  // skills: .md directly inside skills/ (relative to package root)
  const skillRelPaths = files
    .filter((f) => f.zipPath.startsWith(rootPrefix))
    .map((f) => f.zipPath.slice(rootPrefix.length))
    .filter((rel) => /^skills\/[^/]+\.md$/i.test(rel));

  const skills = (await Promise.all(
    skillRelPaths.map((rel) => buildSkillFromStore(pkgId, rel, true, now).catch(() => null))
  )).filter((s): s is SkillMeta => s !== null);

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
        const found = files.find((f) => f.zipPath === rootPrefix + readmeRel);
        if (found) {
          const txt = new TextDecoder().decode(found.data);
          description = parseSkillMarkdown(txt, "").description;
        }
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
  const fileCount = await countPackageFiles(pkgId);
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
export async function addPackageVersion(pkgId: string, buffer: ArrayBuffer, originalFileName: string): Promise<PackageEntry> {
  // 1) index se package dhundo
  const idx = await readIndex();
  const pkg = findPackage(idx, pkgId);
  if (!pkg) throw new UploadError("Skill not found — naya version sirf existing skill par add hota hai");

  // 2) zip validate + parse pehle karo (fail hone par kuch bhi na badle)
  const files = unzipFiles(buffer);
  if (files.length === 0) throw new UploadError("ZIP is empty (no extractable files)");

  const { rootPrefix, manifestZipPath } = detectRootPrefix(files);

  const now = new Date().toISOString();
  const prevLatestN = pkg.uploads.length > 0 ? pkg.uploads[pkg.uploads.length - 1].n : 0;
  const nextN = prevLatestN + 1;

  // 3) current files ko versions/v<prevN>/ me snapshot karo, phir root clear
  if (prevLatestN > 0) {
    await snapshotCurrentVersion(pkgId, prevLatestN);
    const current = await fileList(pkgId, false);
    for (const rel of current) await deletePackageFile(pkgId, rel);
  }

  // 4) naye files extract karo (root ab khali hai, versions/ folder waisa hi rahega)
  for (const { zipPath, data } of files) {
    if (!zipPath.startsWith(rootPrefix)) continue;
    const rel = zipPath.slice(rootPrefix.length);
    if (!rel) continue;
    await putPackageFile(pkgId, rel, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  }

  // 5) skills / name / description / icon dobara detect karo
  const manifest = manifestZipPath
    ? parseManifestJson(new TextDecoder().decode(files.find((f) => f.zipPath === manifestZipPath)!.data))
    : null;

  const skillRelPaths = files
    .filter((f) => f.zipPath.startsWith(rootPrefix))
    .map((f) => f.zipPath.slice(rootPrefix.length))
    .filter((rel) => /^skills\/[^/]+\.md$/i.test(rel));

  const skills = (await Promise.all(
    skillRelPaths.map((rel) => buildSkillFromStore(pkgId, rel, true, now).catch(() => null))
  )).filter((s): s is SkillMeta => s !== null);

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
        const found = files.find((f) => f.zipPath === rootPrefix + readmeRel);
        if (found) {
          const txt = new TextDecoder().decode(found.data);
          description = parseSkillMarkdown(txt, "").description;
        }
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

  const fileCount = await countPackageFiles(pkgId);

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

  await writeIndex(idx);
  return pkg;
}

// ---------- entry: register a single uploaded file ----------

export async function registerSingleFile(buffer: ArrayBuffer, originalFileName: string): Promise<PackageEntry> {
  const pkgId = newId();
  const now = new Date().toISOString();

  const safeName = (originalFileName.split(/[\\/]/).pop() ?? originalFileName).replace(/[\\/\0]/g, "_") || "file";
  await putPackageFile(pkgId, safeName, buffer);

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
    const skill = await buildSkillFromStore(pkgId, safeName, true, now);
    const { title, description } = parseSkillMarkdown(new TextDecoder().decode(buffer), safeName.replace(/\.md$/i, ""));
    return {
      ...base,
      name: title || safeName.replace(/\.md$/i, ""),
      type: "single",
      description: description || "Single skill file",
      skills: [skill],
    };
  }

  if (isTextFile(safeName)) {
    const preview = new TextDecoder().decode(new Uint8Array(buffer).subarray(0, 240)).replace(/\s+/g, " ").trim();
    base.description = preview ? `Text file — ${preview.slice(0, 140)}` : "Uploaded text file";
  }
  return base;
}

// re-export — delete package ke time files cleanup
export { deletePackageFiles };
