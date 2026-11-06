// Creator Studio — Packages/Skills store (STATIC ENGINE, IndexedDB)
// ---------------------------------------------------------------------------
// Pehle Node fs par tha (data/creator-studio/… files). Ab sab IndexedDB me:
//   - index.json      → docs store, key "index"
//   - package files   → files store, key "<pkgId>/<relPath>"
//   - version snapshots → "<pkgId>/versions/v<n>/<relPath>"
//
// Client components import only types.ts — ye module sirf api layer use karta hai.

import { v4 as uuidv4 } from "uuid";
import type { FileContentResult, FileNode, StudioIndex } from "./types";
import {
  fileGet, filePut, fileList, filesDeletePackage, fileDelete,
  docGet, docSet, filesSnapshotVersion, keysUnder,
} from "./idb";

export const INDEX_KEY = "index";

export async function readIndex(): Promise<StudioIndex> {
  const idx = await docGet<StudioIndex>(INDEX_KEY);
  if (!idx || !Array.isArray(idx.packages)) return { packages: [] };
  return migrateIndex(idx);
}

export async function writeIndex(idx: StudioIndex): Promise<void> {
  await docSet(INDEX_KEY, idx);
}

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

// ---------- file helpers (pure — pehle jaisa hi) ----------

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
  const base = p.split("/").pop() ?? p;
  const i = base.lastIndexOf(".");
  if (i <= 0) return base.toLowerCase() === "dockerfile" ? "dockerfile" : "";
  return base.slice(i + 1).toLowerCase();
}

export function isTextFile(p: string): boolean {
  const e = extOf(p);
  if (!e) {
    const base = p.split("/").pop() ?? p;
    return base.toLowerCase().startsWith("dockerfile") || base.startsWith(".");
  }
  return TEXT_EXTENSIONS.has(e);
}

export function isImageFile(p: string): boolean {
  return IMAGE_EXTENSIONS.has(extOf(p));
}

export function languageOf(p: string): string | undefined {
  return LANGUAGE_MAP[extOf(p)];
}

export const MAX_TEXT_BYTES = 512 * 1024; // like AntiGem: 512 KiB truncation

// relPath sanitize — package ke bahar ka rasta block (pehle safeResolve tha)
export function assertSafeRelPath(relPath: string): string {
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (norm.startsWith("/") || norm.split("/").some((seg) => seg === ".." || seg === "") && norm.includes("..")) {
    throw new Error("Path escapes package directory");
  }
  if (norm.includes("../")) throw new Error("Path escapes package directory");
  return norm;
}

// ---------- tree building (IDB keys se) ----------

export async function buildFileTree(pkgId: string): Promise<FileNode[]> {
  const paths = await fileList(pkgId, true); // versions/ bhi tree me aata hai (pehle disk jaisa)
  return buildTreeFrom(paths);
}

export function buildTreeFrom(paths: string[]): FileNode[] {
  type DirNode = FileNode & { children: FileNode[] };
  const root: DirNode = { name: "", path: "", type: "dir", children: [] };

  for (const rel of paths) {
    const segs = rel.split("/");
    let cur = root;
    for (let i = 0; i < segs.length; i++) {
      const isLast = i === segs.length - 1;
      const seg = segs[i];
      const pathSoFar = segs.slice(0, i + 1).join("/");
      if (isLast) {
        cur.children.push({
          name: seg, path: pathSoFar, type: "file", size: 0,
        });
      } else {
        let next = cur.children.find(
          (c): c is DirNode => c.type === "dir" && c.name === seg
        );
        if (!next) {
          next = { name: seg, path: pathSoFar, type: "dir", children: [] };
          cur.children.push(next);
        }
        cur = next;
      }
    }
  }

  const sortRec = (n: FileNode) => {
    const d = n as DirNode;
    if (!d.children) return;
    d.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of d.children) sortRec(c);
  };
  sortRec(root);
  return root.children;
}

// kisi purane version ka tree — keys "versions/v<n>/…" se
export async function buildVersionTree(pkgId: string, n: number): Promise<string[]> {
  return keysUnder(pkgId, `versions/v${n}/`);
}

// ---------- file content ----------

export async function readFileContent(pkgId: string, relPathRaw: string): Promise<FileContentResult> {
  const relPath = assertSafeRelPath(relPathRaw);
  const buf = await fileGet(pkgId, relPath);
  if (buf === null) throw new Error("File not found");
  const name = relPath.split("/").pop() ?? relPath;
  const base: FileContentResult = {
    path: relPath,
    name,
    size: buf.byteLength,
    isText: isTextFile(relPath),
    isImage: isImageFile(relPath),
    language: languageOf(relPath),
  };
  if (base.isText) {
    const bytes = new Uint8Array(buf);
    if (bytes.length > MAX_TEXT_BYTES) {
      base.content = new TextDecoder().decode(bytes.subarray(0, MAX_TEXT_BYTES));
      base.truncated = true;
    } else {
      base.content = new TextDecoder().decode(bytes);
    }
  }
  return base;
}

export async function countPackageFiles(pkgId: string): Promise<number> {
  return (await fileList(pkgId, false)).length;
}

// current files ko versions/v<n>/ me snapshot karta hai (naya version upload se pehle)
export async function snapshotCurrentVersion(pkgId: string, n: number): Promise<number> {
  return filesSnapshotVersion(pkgId, n);
}

export async function deletePackageFiles(pkgId: string): Promise<void> {
  await filesDeletePackage(pkgId);
}

export { fileGet as getPackageFile, filePut as putPackageFile, fileDelete as deletePackageFile, fileList, keysUnder };

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
