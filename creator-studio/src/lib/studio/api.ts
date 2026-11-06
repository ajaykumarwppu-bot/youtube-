// Creator Studio — LOCAL API ROUTER (STATIC ENGINE)
// ---------------------------------------------------------------------------
// Pehle ye saara logic Next.js API routes (src/app/api/cs/**) me tha — Node
// server par. Ab wahi handlers browser me chalte hain (IndexedDB par) aur
// apiFetch() inko call karta hai. Route shapes + JSON responses bilkul wahi
// hain jo pehle the — sirf transport HTTP se function-call ban gaya.

import {
  assertSafeRelPath, buildFileTree, buildVersionTree, bumpVersion,
  deletePackageFiles, findPackage, findSkill, getPackageFile,
  readFileContent, readIndex, writeIndex,
} from "./store";
import { addPackageVersion, parseSkillMarkdown, registerSingleFile, registerZipPackage, UploadError } from "./extract";
import { readPipeline, addIdea, updateIdea, deleteIdea, startRunFromIdea, advanceRun, retryRun } from "./pipeline";
import { readBrain, mutateBrain, newId, questionSignature, generateReport } from "./brain";
import { readVideos, writeVideosFile } from "./videos";
import { readSettings, maskSettings, setCred, updatePrefs } from "./settings";
import { buildDashboard } from "./dashboard";
import { ensureSeeded } from "./seed";
import type { ProblemArea } from "./brain-types";
import type { VideoKind, VideoRecord, VideoStatus } from "./video-types";
import type { SkillEditRequest } from "./types";

export interface LocalApiResult {
  status: number;
  json?: unknown;
  blob?: { data: ArrayBuffer; mime: string; filename?: string };
}

type JsonBody = Record<string, unknown> | null;

function ok(json: unknown, status = 200): LocalApiResult {
  return { status, json };
}
function err(message: string, status = 400): LocalApiResult {
  return { status, json: { error: message } };
}
function blob(data: ArrayBuffer, mime: string, filename?: string): LocalApiResult {
  return { status: 200, blob: { data, mime, filename } };
}

const IMAGE_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon", svg: "image/svg+xml",
};
const RAW_MIME: Record<string, string> = {
  ...IMAGE_MIME,
  md: "text/markdown", txt: "text/plain", json: "application/json",
};

// ---------------------------------------------------------------------------
// brain question helpers (routes se shift)

const VALID_AREAS: ProblemArea[] = ["thumbnail", "title", "topic", "hook", "seo", "length"];

function defaultText(areas: ProblemArea[]): string {
  const map: Record<ProblemArea, string> = {
    thumbnail: "Thumbnail",
    title: "Title",
    topic: "Topic & Audience",
    hook: "Hook / Intro",
    seo: "SEO & Timing",
    length: "Video Length",
  };
  return `${areas.map((a) => map[a] ?? a).join(" & ")} par research karni hai`;
}

function defaultTopics(areas: ProblemArea[]): string[] {
  const base: Partial<Record<ProblemArea, string[]>> = {
    thumbnail: ["Mobile-first thumbnail rules", "Contrast aur text size best practices"],
    title: ["Curiosity + keyword first 40 characters", "Clickbait vs honest curiosity"],
    topic: ["Audience profile per video", "Competitor gap research"],
    hook: ["First 15 sec hook patterns", "Pattern interrupt frequency"],
    seo: ["Best posting windows", "Description keyword placement"],
    length: ["Ideal length per format", "Retention drop sections"],
  };
  return areas.flatMap((a) => base[a] ?? ["Is area ke proven best practices"]);
}

// ---------------------------------------------------------------------------
// videos POST validation helpers

const VIDEO_STATUSES: VideoStatus[] = ["uploaded", "scheduled", "processing", "failed"];
const VIDEO_KINDS: VideoKind[] = ["long", "short"];

function pickString(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" ? v : undefined;
}

function pickNumber(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

// ---------------------------------------------------------------------------
// MAIN ROUTER

export async function handleLocalApi(
  method: string,
  pathname: string,
  search: URLSearchParams,
  body: JsonBody,
  formData?: FormData
): Promise<LocalApiResult> {
  // pehli baar seed import (aapke skill packages ready milne ke liye)
  await ensureSeeded();

  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean); // ["api","cs",...]
  const p = seg.slice(2); // ["cs", ...] hata diya

  // ---------- health ----------
  if (method === "GET" && p[0] === "health") {
    return ok({ ready: true, app: "creator-studio" });
  }

  // ---------- dashboard ----------
  if (method === "GET" && p[0] === "dashboard") {
    try {
      return ok(await buildDashboard());
    } catch (e) {
      return err(e instanceof Error ? e.message : "Dashboard load failed", 500);
    }
  }

  // ---------- brain ----------
  if (p[0] === "brain") {
    if (method === "GET" && p.length === 1) {
      return ok(await readBrain());
    }
    if (method === "POST" && p[1] === "questions" && p.length === 2) {
      const b = (body ?? {}) as { areas?: string[]; videoId?: string; text?: string };
      if (!Array.isArray(b.areas) || b.areas.length === 0) {
        return err("areas (non-empty array) required");
      }
      const areas = b.areas.filter((a): a is ProblemArea => VALID_AREAS.includes(a as ProblemArea));
      if (areas.length === 0) return err("No valid areas in request");

      const question = await mutateBrain((st) => {
        const sig = questionSignature(areas);
        let q = st.questions.find((x) => x.status !== "done" && questionSignature(x.areas) === sig);

        if (q) {
          if (b.videoId && !q.sourceVideoIds.includes(b.videoId)) {
            q.sourceVideoIds.push(b.videoId);
          }
          q.createdAt = new Date().toISOString();
          return q;
        }

        q = {
          id: newId(),
          text: b.text?.trim() || defaultText(areas),
          areas,
          sourceVideoIds: b.videoId ? [b.videoId] : [],
          problem: b.videoId
            ? "Ye video ke metrics + findings se agent ne ye problem pakdi hai. Detail is video ke page par hai."
            : "User-raised question — problem detail abhi khali hai.",
          why: "Is area par research hoga to agle videos ka performance improve hoga.",
          topics: defaultTopics(areas),
          links: [],
          status: "open",
          createdAt: new Date().toISOString(),
        };
        st.questions.unshift(q);
        return q;
      });
      return ok({ question });
    }
    if (method === "POST" && p[1] === "questions" && p[3] === "start" && p.length === 4) {
      const id = p[2];
      // checks pehle (404/409) — phir mutate (pehle route jaisa hi behavior)
      const pre = await readBrain();
      const q0 = pre.questions.find((x) => x.id === id);
      if (!q0) return err("Question not found", 404);
      if (q0.status === "researching") return err("Research already running", 409);

      const result = await mutateBrain((st) => {
        const q = st.questions.find((x) => x.id === id);
        if (!q) return null;
        const report = generateReport(q, st);
        q.status = "done";
        q.reportId = report.id;
        st.experiments.unshift(report);
        return { question: q, report };
      });
      if (!result) return err("Question not found", 404);
      return ok(result);
    }
    if ((method === "POST" || method === "DELETE") && p[1] === "questions" && p[3] === "links" && p.length === 4) {
      const id = p[2];
      if (method === "POST") {
        const b = (body ?? {}) as { url?: string; label?: string };
        const url = b?.url?.trim();
        if (!url || !/^https?:\/\/.+/i.test(url)) {
          return err("Valid URL required (http/https)");
        }
        const question = await mutateBrain((st) => {
          const q = st.questions.find((x) => x.id === id);
          if (!q) return null;
          q.links.push({ id: newId(), url, label: b?.label?.trim() || url.replace(/^https?:\/\//, "").slice(0, 60) });
          return q;
        });
        if (!question) return err("Question not found", 404);
        return ok({ question });
      }
      const linkId = search.get("linkId");
      if (!linkId) return err("linkId required");
      const question = await mutateBrain((st) => {
        const q = st.questions.find((x) => x.id === id);
        if (!q) return null;
        q.links = q.links.filter((l) => l.id !== linkId);
        return q;
      });
      if (!question) return err("Question not found", 404);
      return ok({ question });
    }
    if (method === "PATCH" && p[1] === "experiments" && p.length === 3) {
      const id = p[2];
      const b = (body ?? {}) as { itemId?: string; enabled?: boolean; setAll?: boolean };
      if (!body) return err("Invalid body");

      const experiment = await mutateBrain((st) => {
        const e = st.experiments.find((x) => x.id === id);
        if (!e) return null;
        if (typeof b.setAll === "boolean") {
          for (const item of e.items) item.enabled = b.setAll;
        } else if (b.itemId && typeof b.enabled === "boolean") {
          const item = e.items.find((i) => i.id === b.itemId);
          if (!item) return null;
          item.enabled = b.enabled;
        } else {
          return null;
        }
        return e;
      });
      if (!experiment) return err("Experiment or item not found", 404);
      return ok({ experiment });
    }
  }

  // ---------- pipeline ----------
  if (p[0] === "pipeline") {
    if (method === "GET" && p.length === 1) {
      return ok(await readPipeline());
    }
    if (method === "POST" && p[1] === "ideas" && p.length === 2) {
      const b = (body ?? {}) as { topic?: string; details?: string };
      const topic = b?.topic?.trim();
      if (!topic) return err("Topic zaroori hai");
      const idea = await addIdea(topic, b?.details ?? "");
      return ok({ idea }, 201);
    }
    if (p[1] === "ideas" && p.length === 3) {
      const id = p[2];
      if (method === "PATCH") {
        const b = (body ?? {}) as { topic?: string; details?: string; status?: "new" | "picked" | "done" };
        if (!body) return err("Invalid body");
        try {
          const idea = await updateIdea(id, b);
          return ok({ idea });
        } catch (e) {
          return err(e instanceof Error ? e.message : "Update failed", 404);
        }
      }
      if (method === "DELETE") {
        const state = await readPipeline();
        const idea = state.ideas.find((i) => i.id === id);
        if (!idea) return err("Idea nahi mila", 404);
        if (idea.status === "picked") {
          return err("Is idea par run chal raha hai — pehle run khatam karo", 409);
        }
        if (idea.status === "done") {
          return err("Video ban chuki hai — idea record keep karna sahi hai", 409);
        }
        await deleteIdea(id);
        return ok({ ok: true });
      }
    }
    if (method === "POST" && p[1] === "ideas" && p[3] === "start" && p.length === 4) {
      const id = p[2];
      try {
        const { idea, run } = await startRunFromIdea(id);
        return ok({ idea, run }, 201);
      } catch (e) {
        return err(e instanceof Error ? e.message : "Run start failed");
      }
    }
    if (method === "POST" && p[1] === "runs" && p[3] === "advance" && p.length === 4) {
      try {
        const run = await advanceRun(p[2]);
        return ok({ run });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Advance failed");
      }
    }
    if (method === "POST" && p[1] === "runs" && p[3] === "retry" && p.length === 4) {
      try {
        const run = await retryRun(p[2]);
        return ok({ run });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Retry failed");
      }
    }
  }

  // ---------- videos ----------
  if (p[0] === "videos") {
    if (method === "GET" && p.length === 1) {
      return ok(await readVideos());
    }
    if (method === "POST" && p.length === 1) {
      try {
        if (!body || typeof body !== "object") return err("JSON body required");
        const b = body as Record<string, unknown>;
        const title = pickString(b, "title")?.trim();
        if (!title) return err("title required (video ka final title)");

        const state = await readVideos();
        const id = pickString(b, "id")?.trim() || `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const existing = state.videos.find((v) => v.id === id);

        const kind = VIDEO_KINDS.includes(b.kind as VideoKind) ? (b.kind as VideoKind) : existing?.kind ?? "long";
        const status = VIDEO_STATUSES.includes(b.status as VideoStatus)
          ? (b.status as VideoStatus)
          : existing?.status ?? "processing";

        const packagingIn =
          b.packaging && typeof b.packaging === "object" ? (b.packaging as Record<string, unknown>) : undefined;

        const base: VideoRecord = existing ?? {
          id,
          title,
          topic: "",
          kind,
          status,
          duration: "--:--",
          hue: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0) * 31, 0)) % 360,
          script: "",
          pipeline: [],
          experiments: [],
        };

        base.title = title;
        if (pickString(b, "topic") !== undefined) base.topic = pickString(b, "topic")!;
        if (kind) base.kind = kind;
        if (status) base.status = status;
        if (pickString(b, "duration") !== undefined) base.duration = pickString(b, "duration")!;
        if (pickNumber(b, "hue") !== undefined) base.hue = pickNumber(b, "hue")!;
        if (pickString(b, "script") !== undefined) base.script = pickString(b, "script")!;
        if (pickString(b, "scheduledFor") !== undefined) base.scheduledFor = pickString(b, "scheduledFor")!;
        if (pickString(b, "publishedAt") !== undefined) base.publishedAt = pickString(b, "publishedAt")!;
        if (pickString(b, "failReason") !== undefined) base.failReason = pickString(b, "failReason")!;
        if (pickString(b, "failedStage") !== undefined) base.failedStage = pickString(b, "failedStage")!;
        if (pickString(b, "failedAt") !== undefined) base.failedAt = pickString(b, "failedAt")!;

        if (b.progress && typeof b.progress === "object") {
          const pr = b.progress as Record<string, unknown>;
          base.progress = {
            stage: typeof pr.stage === "string" ? pr.stage : base.progress?.stage ?? "",
            pct: typeof pr.pct === "number" ? Math.max(0, Math.min(100, pr.pct)) : base.progress?.pct ?? 0,
            note: typeof pr.note === "string" ? pr.note : base.progress?.note,
          };
        }

        if (Array.isArray(b.pipeline)) {
          base.pipeline = (b.pipeline as Array<Record<string, unknown>>)
            .filter((s) => s && typeof s.stage === "string" && Array.isArray(s.skills))
            .map((s) => ({
              stage: String(s.stage),
              skills: (s.skills as Array<Record<string, unknown>>)
                .filter((k) => k && typeof k.name === "string")
                .map((k) => ({ name: String(k.name), version: String(k.version ?? "1.0.0") })),
            }));
        }

        if (Array.isArray(b.experiments)) {
          base.experiments = (b.experiments as Array<Record<string, unknown>>)
            .filter((e) => e && typeof e.title === "string" && typeof e.technique === "string")
            .map((e) => ({ title: String(e.title), technique: String(e.technique) }));
        }

        if (packagingIn) {
          const cur = base.packaging;
          base.packaging = {
            title: typeof packagingIn.title === "string" ? packagingIn.title : base.title,
            titleNote: typeof packagingIn.titleNote === "string" ? packagingIn.titleNote : cur?.titleNote ?? "",
            description: typeof packagingIn.description === "string" ? packagingIn.description : cur?.description ?? "",
            tags: Array.isArray(packagingIn.tags) ? packagingIn.tags.map(String) : cur?.tags ?? [],
            hashtags: Array.isArray(packagingIn.hashtags) ? packagingIn.hashtags.map(String) : cur?.hashtags,
            chapters: Array.isArray(packagingIn.chapters)
              ? (packagingIn.chapters as Array<Record<string, unknown>>)
                  .filter((c) => c && typeof c.time === "string" && typeof c.label === "string")
                  .map((c) => ({ time: String(c.time), label: String(c.label) }))
              : cur?.chapters,
            endScreen: typeof packagingIn.endScreen === "string" ? packagingIn.endScreen : cur?.endScreen,
            pinnedComment: typeof packagingIn.pinnedComment === "string" ? packagingIn.pinnedComment : cur?.pinnedComment,
          };
        }

        if (!existing) state.videos.unshift(base);
        await writeVideosFile(state);
        return ok({ video: base, created: !existing });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Video record save nahi hua");
      }
    }
  }

  // ---------- packages ----------
  if (p[0] === "packages") {
    if (method === "GET" && p.length === 1) {
      const idx = await readIndex();
      const packages = idx.packages;
      const stats = {
        packages: packages.length,
        skills: packages.length,
        enabledSkills: packages.filter((x) => x.enabled).length,
        versions: packages.reduce((n, x) => n + (x.uploads?.length ?? 1), 0),
      };
      return ok({ packages, stats });
    }
    if (p.length >= 2) {
      const id = p[1];
      // /packages/[id]/file
      if (method === "GET" && p[2] === "file" && p.length === 3) {
        const relPath = search.get("path");
        if (!relPath) return err("path query required");
        try {
          if (search.get("download") === "1") {
            const buf = await getPackageFile(id, assertSafeRelPath(relPath));
            if (buf === null) return err("File not found", 404);
            const name = relPath.split("/").pop() || "file";
            return blob(buf, "application/octet-stream", name.replace(/"/g, ""));
          }
          const result = await readFileContent(id, relPath);
          if (result.isImage) {
            const ext = (relPath.split(".").pop() || "").toLowerCase();
            // UI isko apiFetch → blob → objectURL se resolve karega
            result.content = `local-raw:/api/cs/packages/${id}/raw?path=${encodeURIComponent(relPath)}`;
            result.language = ext || "image";
          }
          return ok(result);
        } catch (e) {
          return err(e instanceof Error ? e.message : "Cannot read file");
        }
      }
      // /packages/[id]/icon
      if (method === "GET" && p[2] === "icon" && p.length === 3) {
        const idx = await readIndex();
        const pkg = findPackage(idx, id);
        if (!pkg || !pkg.icon) return err("No icon", 404);
        try {
          const buf = await getPackageFile(id, assertSafeRelPath(pkg.icon));
          if (buf === null) return err("No icon", 404);
          const ext = (pkg.icon.split(".").pop() || "").toLowerCase();
          return blob(buf, IMAGE_MIME[ext] || "image/png");
        } catch {
          return err("No icon", 404);
        }
      }
      // /packages/[id]/raw
      if (method === "GET" && p[2] === "raw" && p.length === 3) {
        const relPath = search.get("path");
        if (!relPath) return err("path query required");
        try {
          const buf = await getPackageFile(id, assertSafeRelPath(relPath));
          if (buf === null) return err("File not found", 404);
          const ext = (relPath.split(".").pop() || "").toLowerCase();
          return blob(buf, RAW_MIME[ext] || "application/octet-stream");
        } catch (e) {
          return err(e instanceof Error ? e.message : "Cannot read file");
        }
      }
      // /packages/[id]/versions/[n]
      if (method === "GET" && p[2] === "versions" && p.length === 4) {
        const idx = await readIndex();
        const pkg = findPackage(idx, id);
        if (!pkg) return err("Skill not found", 404);
        const num = parseInt(p[3], 10);
        if (!Number.isFinite(num)) return err("Invalid version number");
        const upload = pkg.uploads?.find((u) => u.n === num);
        if (!upload) return err("Version not found", 404);
        const paths = await buildVersionTree(id, num);
        if (paths.length === 0) {
          // snapshot missing (migration se pehle ka data) — khaali tree
          return ok({ n: num, tree: [], missing: true });
        }
        const rels = paths
          .map((x) => x.slice(`versions/v${num}/`.length))
          .filter((x) => x.length > 0);
        return ok({ n: num, tree: buildTreeFromRels(rels) });
      }
      // /packages/[id]
      if (p.length === 2) {
        const idx = await readIndex();
        const pkg = findPackage(idx, id);
        if (method === "GET") {
          if (!pkg) return err("Package not found", 404);
          const tree = await buildFileTree(id);
          return ok({ package: pkg, tree });
        }
        if (method === "PATCH") {
          const b = (body ?? {}) as { enabled?: boolean };
          if (!body || typeof b.enabled !== "boolean") {
            return err("body.enabled (boolean) required");
          }
          if (!pkg) return err("Package not found", 404);
          pkg.enabled = b.enabled;
          for (const s of pkg.skills) s.enabled = b.enabled;
          pkg.updatedAt = new Date().toISOString();
          await writeIndex(idx);
          return ok({ package: pkg });
        }
        if (method === "DELETE") {
          if (!pkg) return err("Package not found", 404);
          idx.packages = idx.packages.filter((x) => x.id !== id);
          await writeIndex(idx);
          try {
            await deletePackageFiles(id);
          } catch { /* ignore */ }
          return ok({ ok: true });
        }
      }
    }
  }

  // ---------- skills ----------
  if (p[0] === "skills" && p.length >= 2) {
    const id = p[1];
    if (method === "PATCH" && p.length === 2) {
      const b = body as ({ enabled: boolean } | SkillEditRequest) | null;
      if (!b) return err("Invalid body");
      const idx = await readIndex();
      const found = findSkill(idx, id);
      if (!found) return err("Skill not found", 404);
      const { pkg, skill } = found;

      // ---- toggle enable/disable ----
      if ("enabled" in b && typeof b.enabled === "boolean" && !("content" in b)) {
        if (!pkg.enabled && b.enabled) {
          return err("Package is disabled — enable the package first", 409);
        }
        skill.enabled = b.enabled;
        skill.updatedAt = new Date().toISOString();
        await writeIndex(idx);
        return ok({ skill });
      }

      // ---- edit content → new version ----
      const edit = b as SkillEditRequest;
      if (typeof edit.content !== "string" || edit.content.trim().length === 0) {
        return err("content (non-empty string) required");
      }
      const bump = edit.bump || "patch";
      try {
        const nextVersion = bumpVersion(skill.version, bump, edit.customVersion);
        if (nextVersion === skill.version) {
          return err("New version must be different from current");
        }
        const { putPackageFile } = await import("./store");
        await putPackageFile(pkg.id, assertSafeRelPath(skill.path), new TextEncoder().encode(edit.content).buffer as ArrayBuffer);

        const now = new Date().toISOString();
        skill.version = nextVersion;
        skill.versions.push({
          version: nextVersion,
          content: edit.content,
          savedAt: now,
          source: "edit",
          note: edit.note || undefined,
        });
        const parsed = parseSkillMarkdown(edit.content, skill.name);
        skill.title = parsed.title;
        skill.description = parsed.description;
        skill.updatedAt = now;
        pkg.updatedAt = now;
        await writeIndex(idx);
        return ok({ skill });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Edit failed");
      }
    }
    if (method === "GET" && p.length === 2) {
      const idx = await readIndex();
      const found = findSkill(idx, id);
      if (!found) return err("Skill not found", 404);
      const { pkg, skill } = found;
      let current = "";
      try {
        const buf = await getPackageFile(pkg.id, assertSafeRelPath(skill.path));
        if (buf !== null) current = new TextDecoder().decode(buf);
      } catch { /* missing file */ }
      return ok({
        skill,
        package: { id: pkg.id, name: pkg.name, enabled: pkg.enabled },
        currentContent: current,
      });
    }
    if (method === "POST" && p[2] === "rollback" && p.length === 3) {
      const b = (body ?? {}) as { version?: string };
      const targetVersion = b?.version;
      if (typeof targetVersion !== "string" || !targetVersion) {
        return err("version (string) required");
      }
      const idx = await readIndex();
      const found = findSkill(idx, id);
      if (!found) return err("Skill not found", 404);
      const { pkg, skill } = found;

      const entry = skill.versions.find((v) => v.version === targetVersion);
      if (!entry) return err("Version not found in history", 404);

      try {
        const nextVersion = bumpVersion(skill.version, "patch");
        const now = new Date().toISOString();

        const { putPackageFile } = await import("./store");
        await putPackageFile(pkg.id, assertSafeRelPath(skill.path), new TextEncoder().encode(entry.content).buffer as ArrayBuffer);

        skill.version = nextVersion;
        skill.versions.push({
          version: nextVersion,
          content: entry.content,
          savedAt: now,
          source: "rollback",
          note: `Rolled back to v${targetVersion}`,
        });
        const parsed = parseSkillMarkdown(entry.content, skill.name);
        skill.title = parsed.title;
        skill.description = parsed.description;
        skill.updatedAt = now;
        pkg.updatedAt = now;
        await writeIndex(idx);
        return ok({ skill });
      } catch (e) {
        return err(e instanceof Error ? e.message : "Rollback failed");
      }
    }
  }

  // ---------- settings ----------
  if (p[0] === "settings") {
    if (method === "GET" && p.length === 1) {
      return ok(maskSettings(await readSettings()));
    }
    if (method === "PUT" && p.length === 1) {
      try {
        const b = (body ?? {}) as Record<string, unknown>;
        if (b.kind === "cred") {
          const { integrationId, fieldId, value } = b as {
            integrationId?: string; fieldId?: string; value?: string | null;
          };
          if (!integrationId || !fieldId) {
            return err("integrationId aur fieldId zaroori hain");
          }
          if (value !== null && value !== undefined && typeof value !== "string") {
            return err("Value string honi chahiye (ya null)");
          }
          if (value !== null && value !== undefined && value.trim().length < 4) {
            return err("Ye key chhoti lag rahi hai — pura token paste karo");
          }
          maskSettings(await setCred(integrationId, fieldId, value ?? null));
        } else if (b.kind === "prefs") {
          maskSettings(await updatePrefs((b.patch ?? {}) as never));
        } else {
          return err("Unknown kind");
        }
        return ok(maskSettings(await readSettings()));
      } catch (e) {
        return err(e instanceof Error ? e.message : "Settings update failed");
      }
    }
  }

  // ---------- upload ----------
  if (method === "POST" && p[0] === "upload" && p.length === 1) {
    try {
      if (!formData) return err("file field required");
      const file = formData.get("file");
      if (!(file instanceof File)) return err("file field required");
      const packageId = formData.get("packageId");
      const buf = await file.arrayBuffer();

      if (typeof packageId === "string" && packageId.trim()) {
        const pkg = await addPackageVersion(packageId.trim(), buf, file.name);
        return ok({ package: pkg, updatedVersion: true });
      }

      const looksZip =
        /\.zip$/i.test(file.name) ||
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed";
      const pkg = looksZip
        ? await registerZipPackage(buf, file.name)
        : await registerSingleFile(buf, file.name);

      const idx = await readIndex();
      idx.packages.unshift(pkg); // naya skill sabse upar
      await writeIndex(idx);
      return ok({ package: pkg });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return err(message);
    }
  }

  return err(`Not found: ${method} ${pathname}`, 404);
}

// buildTreeFrom store.ts me hai (paths→tree) — versions route ke liye chhota wrapper
import { buildTreeFrom } from "./store";
function buildTreeFromRels(rels: string[]) {
  return buildTreeFrom(rels);
}

// upload error type public (worker/MCP bridge bhi use karega)
export { UploadError };
