// Creator Studio — AGENT BRIDGE (JS side, STATIC ENGINE)
// ---------------------------------------------------------------------------
// Antigem app ke andar MCP (studio_mcp) isi bridge se chalta hai:
//
//   agent → AndroidLocalBridgeServer (/studio tools/call) → StudioWebBridge.call()
//     → webView.evaluateJavascript("window.StudioAgent.__handle('<json>')")
//     → async op chalta hai (IndexedDB) → result wapas aate hi
//     → StudioBridge.notify('{"reqId":"…","result":{…}}')   (JS → Kotlin)
//     → Kotlin continuation resume → MCP tool result
//
// Achiva ka bridge sync hai (localStorage); Studio ka data IndexedDB me hai
// isliye async + reqId correlation pattern use hota hai.

import { apiFetch } from "./api-client";

interface BridgeCmd {
  op: string;
  args?: Record<string, unknown>;
  reqId?: string;
}

declare global {
  interface Window {
    StudioAgent?: { __handle: (json: string) => string };
    StudioBridge?: {
      notifyReady?: () => void;
      notify?: (json: string) => void;
    };
  }
}

// ---- arg helpers (purane worker.js jaisa tolerant parsing) ----

function str(a: Record<string, unknown>, k: string): string | undefined {
  const v = a?.[k];
  return typeof v === "string" ? v : undefined;
}
function bool(a: Record<string, unknown>, k: string): boolean | undefined {
  const v = a?.[k];
  return typeof v === "boolean" ? v : undefined;
}

async function callJson(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<Record<string, unknown>> {
  const res = await apiFetch(path, init);
  const json = await res.json();
  if (!res.ok) {
    const msg = (json && (json.error as string)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as Record<string, unknown>;
}

// ---- ops: 18 studio_* tools (purane MCP plugin worker.js ka mapping) ----

async function runOp(
  op: string,
  a: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (op) {
    case "health":
      return callJson("/api/cs/health");
    case "ideas_list":
    case "pipeline_list":
      return callJson("/api/cs/pipeline");
    case "idea_add":
      return callJson("/api/cs/pipeline/ideas", {
        method: "POST",
        body: { topic: str(a, "topic"), details: str(a, "details") ?? "" },
      });
    case "idea_update":
      return callJson(`/api/cs/pipeline/ideas/${str(a, "id") ?? ""}`, {
        method: "PATCH",
        body: {
          topic: str(a, "topic"),
          details: str(a, "details"),
          status: str(a, "status"),
        },
      });
    case "pipeline_start":
      return callJson(`/api/cs/pipeline/ideas/${str(a, "idea_id") ?? ""}/start`, { method: "POST" });
    case "stage_next":
      return callJson(`/api/cs/pipeline/runs/${str(a, "run_id") ?? ""}/advance`, { method: "POST" });
    case "run_retry":
      return callJson(`/api/cs/pipeline/runs/${str(a, "run_id") ?? ""}/retry`, { method: "POST" });
    case "videos_list":
      return callJson("/api/cs/videos");
    case "video_record":
      return callJson("/api/cs/videos", { method: "POST", body: a });
    case "brain_overview":
      return callJson("/api/cs/brain");
    case "brain_question_add":
      return callJson("/api/cs/brain/questions", {
        method: "POST",
        body: { areas: a.areas, text: str(a, "text"), videoId: str(a, "videoId") },
      });
    case "brain_experiment_toggle":
      return callJson(`/api/cs/brain/experiments/${str(a, "experiment_id") ?? ""}`, {
        method: "PATCH",
        body: {
          itemId: str(a, "item_id"),
          enabled: bool(a, "enabled"),
          setAll: bool(a, "set_all"),
        },
      });
    case "dashboard":
      return callJson("/api/cs/dashboard");
    case "settings_get":
      return callJson("/api/cs/settings");
    case "settings_set":
      return callJson("/api/cs/settings", { method: "PUT", body: a });
    case "skills_list":
      return callJson("/api/cs/packages");
    case "skill_get":
      return callJson(`/api/cs/skills/${str(a, "skill_id") ?? ""}`);
    default:
      return {
        ok: false,
        error:
          `Unknown op '${op}'. Available: health, ideas_list, idea_add, idea_update, ` +
          `pipeline_list, pipeline_start, stage_next, run_retry, videos_list, video_record, ` +
          `brain_overview, brain_question_add, brain_experiment_toggle, dashboard, ` +
          `settings_get, settings_set, skills_list, skill_get`,
      };
  }
}

export function installStudioAgentBridge(): void {
  if (typeof window === "undefined" || window.StudioAgent) return;

  window.StudioAgent = {
    __handle: (jsonStr: string): string => {
      // async op START karo — result StudioBridge.notify se wapas aayega
      try {
        const req = JSON.parse(jsonStr) as BridgeCmd;
        const op = String(req?.op ?? "");
        const reqId = String(req?.reqId ?? "");
        runOp(op, req?.args ?? {})
          .then((result) => {
            try {
              window.StudioBridge?.notify?.(JSON.stringify({ reqId, result }));
            } catch { /* hooks na hon to result drop */ }
          })
          .catch((e: unknown) => {
            const message = e instanceof Error ? e.message : String(e);
            try {
              window.StudioBridge?.notify?.(
                JSON.stringify({ reqId, result: { ok: false, error: message } })
              );
            } catch { /* drop */ }
          });
        return JSON.stringify({ accepted: true, reqId });
      } catch (e) {
        return JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
  };

  try {
    window.StudioBridge?.notifyReady?.();
  } catch { /* hooks optional hain */ }
}
