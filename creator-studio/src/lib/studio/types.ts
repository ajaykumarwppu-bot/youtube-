// Creator Studio — Skills Manager types
// Mirrors AntiGem's plugin/skills format (manifest.json + skills/*.md + detail folders)

export type PackageType = "plugin" | "zip" | "single" | "file";

export interface VersionEntry {
  version: string;
  content: string;
  savedAt: string; // ISO
  source: "upload" | "edit" | "rollback";
  note?: string;
}

// skill (package) ki ek uploaded version ka record — version control ke liye
// n = upload number (1, 2, 3...). Latest n = active version (files package root par).
// Purane versions ki files packages/<id>/versions/v<n>/ me snapshot hoti hain.
export interface UploadVersion {
  n: number;
  addedAt: string; // ISO — kab add hua
  disabledAt?: string; // ISO — kab retire hua (naya version aane par)
  fileName: string; // original zip/file ka naam
  fileCount: number;
}

export interface SkillMeta {
  id: string; // stable: pkgId + ":" + relative path
  packageId: string;
  name: string; // file name without .md
  title: string; // frontmatter name / first # heading / name
  description: string; // frontmatter description / first paragraph
  path: string; // relative to package root, e.g. "skills/youtube_upload.md"
  detailFiles: string[]; // relative paths of detail files in skills/<name>/
  enabled: boolean;
  version: string; // current version
  versions: VersionEntry[];
  updatedAt: string;
}

export interface PackageEntry {
  id: string; // uuid
  name: string; // from manifest.name or zip/file name
  type: PackageType;
  version: string; // manifest version or 1.0.0
  description: string;
  icon?: string; // relative path inside package
  manifestId?: string; // manifest "id" field
  manifestVersion?: number; // manifest_version
  permissions: string[];
  mcpToolsCount: number;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
  originalFileName: string;
  rootPrefix: string; // e.g. "" or "my-plugin/" when zip had an enclosing folder
  fileCount: number;
  uploads: UploadVersion[]; // version control — har zip upload ka record (n=1 latest)
  skills: SkillMeta[];
}

export interface StudioIndex {
  packages: PackageEntry[];
}

export interface FileNode {
  name: string;
  path: string; // relative to package root
  type: "file" | "dir";
  size?: number;
  children?: FileNode[];
}

export interface FileContentResult {
  path: string;
  name: string;
  isText: boolean;
  content?: string; // text files (truncated if huge)
  truncated?: boolean;
  size: number;
  language?: string;
  isImage?: boolean;
}

export interface SkillEditRequest {
  content: string;
  bump: "patch" | "minor" | "major" | "custom";
  customVersion?: string;
  note?: string;
}
