// Creator Studio — apiFetch (STATIC ENGINE)
// ---------------------------------------------------------------------------
// UI pehle fetch("/api/cs/…") karta tha. Ab apiFetch() wahi call LOCAL router
// (api.ts) ko karta hai — koi HTTP nahi, koi server nahi. Response ka shape
// Response jaisa hi hai: .ok, .status, .json(), .blob(), .arrayBuffer(), .text()
// — isliye UI ka error-handling code bilkul waisa hi kaam karta hai.

import { handleLocalApi, type LocalApiResult } from "./api";

export class LocalResponse {
  readonly ok: boolean;
  readonly status: number;
  private readonly result: LocalApiResult;
  private blobUrlCache: string | null = null;

  constructor(result: LocalApiResult) {
    this.result = result;
    this.status = result.status;
    this.ok = result.status >= 200 && result.status < 400;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async json(): Promise<any> {
    if (this.result.json !== undefined) return this.result.json;
    return null;
  }

  async blob(): Promise<Blob> {
    if (this.result.blob) {
      return new Blob([this.result.blob.data], { type: this.result.blob.mime });
    }
    return new Blob([], { type: "application/json" });
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    if (this.result.blob) return this.result.blob.data;
    return new ArrayBuffer(0);
  }

  async text(): Promise<string> {
    if (this.result.json !== undefined) return JSON.stringify(this.result.json);
    return "";
  }

  // objectURL — img src ke liye (blob ka URL, memory-managed by caller)
  async objectUrl(): Promise<string> {
    if (this.blobUrlCache) return this.blobUrlCache;
    const b = await this.blob();
    this.blobUrlCache = URL.createObjectURL(b);
    return this.blobUrlCache;
  }
}

export interface ApiFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown; // JSON-serializable object YA FormData
}

export async function apiFetch(path: string, init?: ApiFetchInit | RequestInit): Promise<LocalResponse> {
  const method = (init?.method ?? "GET").toUpperCase();
  const [pathname, query = ""] = path.split("?");
  const search = new URLSearchParams(query);

  let body: Record<string, unknown> | null = null;
  let formData: FormData | undefined;

  const rawBody = (init as { body?: unknown })?.body;
  if (rawBody instanceof FormData) {
    formData = rawBody;
  } else if (rawBody && typeof rawBody === "object") {
    body = rawBody as Record<string, unknown>;
  } else if (typeof rawBody === "string" && rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      body = null;
    }
  }

  const result = await handleLocalApi(method, pathname, search, body, formData);
  return new LocalResponse(result);
}

// download helper — LocalResponse ko file download me convert karo
export async function downloadResponse(res: LocalResponse, fallbackName: string): Promise<void> {
  const b = await res.blob();
  const url = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// "local-raw:/api/cs/…" jaise markers ko object URL me resolve karna
// (file-viewer images ke liye)
export async function resolveLocalUrl(u: string): Promise<string> {
  if (u.startsWith("local-raw:")) {
    const res = await apiFetch(u.slice("local-raw:".length));
    return res.objectUrl();
  }
  return u;
}
