import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { FileContentResult, FileNode, StudioIndex } from "./types";
import { DATA_BASE } from "./paths";

// All studio data lives under <project>/data/creator-studio
export const STUDIO_ROOT = path.join(DATA_BASE, "data", "creator-studio");
export const PACKAGES_ROOT = path.join(STUDIO_ROOT, "packages");
export const INDEX_FILE = path.join(STUDIO_ROOT, "index.json");

export function ensureStudioDirs() {
  fs.mkdirSync(PACKAGES_ROOT, { recursive: true });
}

export function packageDir(pkgId: string): string {
  // sanitize: id is always a uuid we generated, but be defensive
  if (!/^[a-zA-Z0-9_-]+$/.test(pkgId)) throw new Error("Invalid package id");
  return path.join(PACKAGES_ROOT, pkgId);
}

// purane versions ki snapshot files yahan rehti hain: packages/<id>/versions/v<n>/
export const VERSIONS_DIRNAME = "versions";

export function versionDir(pkgId: string, n: number): string {
  return path.join(packageDir(pkgId), VERSIONS_DIRNAME, `v${n}`);
}

// ---------- index.json ----------

// lazy migration — purane packages me uploads array nahi tha (sirf ek upload tha)
function migrateIndex(idx: StudioIndex): StudioIndex {
  let changed = false;
  for (const p of idx.packages) {
    if (!Array.isArray(p.uploads)) {
      p.uploads = [
        {
          n: 1,
          addedAt: p.installedAt,
          fileName: p.originalFileName,
          fileCount: p.fileCount,
        },
      ];
      changed = true;
    }
  }
  if (changed) writeIndex(idx);
  return idx;
}

export function readIndex(): StudioIndex {
  ensureStudioDirs();
  try {
    const raw = fs.readFileSync(INDEX_FILE, "utf8");
    const idx = JSON.parse(raw) as StudioIndex;
    if (!idx || !Array.isArray(idx.packages)) return { packages: [] };
    return migrateIndex(idx);
  } catch {
    return { packages: [] };
  }
}

export function writeIndex(idx: StudioIndex) {
  ensureStudioDirs();
  const tmp = INDEX_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(idx, null, 2), "utf8");
  fs.renameSync(tmp, INDEX_FILE);
}

export function findPackage(idx: StudioIndex, pkgId: string) {
  return idx.packages.find((p) => p.id === pkgId);
}

export function findSkill(idx: StudioIndex, skillId: string) {
  for (const pkg of idx.packages) {
    const s = pkg.skills.find((sk) => sk.id === skillId);
    if (s) return { pkg, skill: s };
  }
  return null;
}

export function newId(): string {
  return uuidv4();
}

// ---------- file helpers ----------

const TEXT_EXTENSIONS = new Set([
  "md", "markdown", "txt", "json", "js", "mjs", "cjs", "ts", "tsx", "jsx",
  "css", "scss", "html", "htm", "xml", "yaml", "yml", "sh", "bash", "zsh",
  "py", "rb", "go", "kt", "kts", "java", "c", "cpp", "h", "hpp", "rs", "php",
  "sql", "csv", "tsv", "log", "toml", "ini", "env", "conf", "properties",
  "gitignore", "gitattributes", "dockerfile", "makefile", "gradle", "lock",
  "svg", "editorconfig", "prettierrc", "eslintrc", "babelrc", "prisma",
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico"]);

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  json: "json", md: "markdown", markdown: "markdown",
  css: "css", scss: "scss", html: "html", htm: "html", xml: "xml",
  yaml: "yaml", yml: "yaml", sh: "bash", bash: "bash", zsh: "bash",
  py: "python", rb: "ruby", go: "go", kt: "kotlin", kts: "kotlin",
  java: "java", c: "c", cpp: "cpp", h: "c", hpp: "cpp", rs: "rust",
  php: "php", sql: "sql", toml: "toml", ini: "ini", prisma: "prisma",
};

export function extOf(p: string): string {
  const base = path.basename(p);
  const i = base.lastIndexOf(".");
  if (i <= 0) return base.toLowerCase() === "dockerfile" ? "dockerfile" : "";
  return base.slice(i + 1).toLowerCase();
}

export function isTextFile(p: string): boolean {
  const e = extOf(p);
  if (!e) return path.basename(p).toLowerCase().startsWith("dockerfile") || path.basename(p).startsWith(".");
  return TEXT_EXTENSIONS.has(e);
}

export function isImageFile(p: string): boolean {
  return IMAGE_EXTENSIONS.has(extOf(p));
}

export function languageOf(p: string): string | undefined {
  return LANGUAGE_MAP[extOf(p)];
}

export const MAX_TEXT_BYTES = 512 * 1024; // like AntiGem: 512 KiB truncation

export function safeResolve(pkgId: string, relPath: string): string {
  const root = packageDir(pkgId);
  const resolved = path.resolve(root, relPath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Path escapes package directory");
  }
  return resolved;
}

export function buildFileTree(pkgId: string): FileNode[] {
  return buildTreeFrom(packageDir(pkgId), "");
}

// kisi bhi absolute dir se FileNode tree (version snapshots ke liye)
export function buildTreeFrom(absDir: string, relBase: string): FileNode[] {
  const walk = (dir: string, rel: string): FileNode[] => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const nodes: FileNode[] = [];
    for (const e of entries) {
      const relPath = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) {
        nodes.push({ name: e.name, path: relPath, type: "dir", children: walk(path.join(dir, e.name), relPath) });
      } else if (e.isFile()) {
        let size = 0;
        try { size = fs.statSync(path.join(dir, e.name)).size; } catch { /* ignore */ }
        nodes.push({ name: e.name, path: relPath, type: "file", size });
      }
    }
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return nodes;
  };
  const tree = walk(absDir, relBase);
  return tree;
}

export function readFileContent(pkgId: string, relPath: string): FileContentResult {
  const abs = safeResolve(pkgId, relPath);
  const st = fs.statSync(abs);
  const name = path.basename(relPath);
  const base: FileContentResult = {
    path: relPath,
    name,
    size: st.size,
    isText: isTextFile(relPath),
    isImage: isImageFile(relPath),
    language: languageOf(relPath),
  };
  if (base.isText) {
    const buf = fs.readFileSync(abs);
    if (buf.length > MAX_TEXT_BYTES) {
      base.content = buf.subarray(0, MAX_TEXT_BYTES).toString("utf8");
      base.truncated = true;
    } else {
      base.content = buf.toString("utf8");
    }
  }
  return base;
}

export function countPackageFiles(pkgId: string): number {
  // current (latest) version ki files ginti hai — versions/ snapshot folder exclude
  const root = packageDir(pkgId);
  let count = 0;
  const walk = (dir: string, isRoot: boolean) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (isRoot && e.isDirectory() && e.name === VERSIONS_DIRNAME) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), false);
      else if (e.isFile()) count++;
    }
  };
  walk(root, true);
  return count;
}

// current files ko versions/v<n>/ me move karta hai (naya version upload se pehle)
// returns: kitni files move hui
export function snapshotCurrentVersion(pkgId: string, n: number): number {
  const root = packageDir(pkgId);
  const dest = versionDir(pkgId, n);
  fs.mkdirSync(dest, { recursive: true });
  let moved = 0;
  const move = (dir: string, rel: string, isRoot: boolean) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (isRoot && e.isDirectory() && e.name === VERSIONS_DIRNAME) continue;
      const relPath = rel ? rel + "/" + e.name : e.name;
      const from = path.join(dir, e.name);
      const to = path.join(dest, relPath);
      if (e.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        move(from, relPath, false);
      } else if (e.isFile()) {
        fs.renameSync(from, to);
        moved++;
      }
    }
  };
  move(root, "", true);
  return moved;
}

// ---------- semver ----------

export function bumpVersion(current: string, bump: "patch" | "minor" | "major" | "custom", custom?: string): string {
  if (bump === "custom") {
    const v = (custom || "").trim();
    if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v)) {
      throw new Error("Custom version must look like 1.2.3");
    }
    return v;
  }
  const m = current.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return bump === "major" ? "1.0.0" : bump === "minor" ? "0.2.0" : "0.0.2";
  let [maj, min, pat] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  if (bump === "major") { maj += 1; min = 0; pat = 0; }
  else if (bump === "minor") { min += 1; pat = 0; }
  else { pat += 1; }
  return `${maj}.${min}.${pat}`;
}
