// Creator Studio MCP worker — AntiGem extension host (node runtime) ke andar chalta hai.
// App ke andar chalne wale Creator Studio local server (127.0.0.1:8877 standard / 8875 termux)
// ke REST API ko call karta hai. Studio band ho to clear guidance deta hai.

const PORTS = [8877, 8875];
let activePort = null;

const STUDIO_CLOSED_MSG =
  'Creator Studio server band hai. Pehle app me floating switcher se STUDIO kholo (server wahan se start hota hai), thoda ruko (pehli baar 10-30s), phir ye tool dobara chalao.';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryFetch(port, path, init, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Studio server ko dono ports par dhundo; ek baar mil gaya to wahi activePort use hoga. */
async function studioFetch(path, init) {
  const candidates = activePort ? [activePort, ...PORTS.filter((p) => p !== activePort)] : PORTS;
  let lastError = null;
  for (const port of candidates) {
    try {
      const result = await tryFetch(port, path, init);
      activePort = port;
      if (!result.ok) {
        const msg = result.json?.error || result.json?.raw || `HTTP ${result.status}`;
        throw new Error(msg);
      }
      return result.json;
    } catch (e) {
      lastError = e;
      // agar server se error aaya (4xx/5xx) to dusre port ki zaroorat nahi — error hi return karo
      if (e.message && !e.message.startsWith('fetch failed') && !e.message.includes('abort')) {
        throw e;
      }
      await sleep(150);
    }
  }
  throw new Error(STUDIO_CLOSED_MSG + (lastError ? ` (last error: ${lastError.message})` : ''));
}

function str(args, key) {
  const v = args?.[key];
  return typeof v === 'string' ? v : undefined;
}

// ─── Tool handlers ───────────────────────────────────────────────────────────

const handlers = {
  studio_health: async () => {
    const json = await studioFetch('/api/cs/health');
    return { ready: json.ready === true, app: json.app, port: activePort };
  },

  studio_ideas_list: async () => {
    const json = await studioFetch('/api/cs/pipeline');
    return { ideas: json.ideas || [], runs: (json.runs || []).map(summarizeRun) };
  },

  studio_idea_add: async (args) => {
    const body = { topic: str(args, 'topic') };
    const details = str(args, 'details');
    if (details) body.details = details;
    const json = await studioFetch('/api/cs/pipeline/ideas', { method: 'POST', body: JSON.stringify(body) });
    return json;
  },

  studio_idea_update: async (args) => {
    const id = str(args, 'id');
    const body = {};
    for (const k of ['topic', 'details', 'status']) if (str(args, k) !== undefined) body[k] = str(args, k);
    const json = await studioFetch(`/api/cs/pipeline/ideas/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
    return json;
  },

  studio_pipeline_list: async () => {
    const json = await studioFetch('/api/cs/pipeline');
    return { runs: (json.runs || []).map(fullRun), ideas_count: (json.ideas || []).length };
  },

  studio_pipeline_start: async (args) => {
    const json = await studioFetch(`/api/cs/pipeline/ideas/${encodeURIComponent(str(args, 'idea_id'))}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { idea: json.idea, run: fullRun(json.run) };
  },

  studio_stage_next: async (args) => {
    const json = await studioFetch(`/api/cs/pipeline/runs/${encodeURIComponent(str(args, 'run_id'))}/advance`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { run: fullRun(json.run) };
  },

  studio_run_retry: async (args) => {
    const json = await studioFetch(`/api/cs/pipeline/runs/${encodeURIComponent(str(args, 'run_id'))}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { run: fullRun(json.run) };
  },

  studio_videos_list: async () => {
    return await studioFetch('/api/cs/videos');
  },

  studio_video_record: async (args) => {
    const body = {};
    for (const k of ['id', 'title', 'topic', 'kind', 'status', 'duration', 'script', 'scheduledFor', 'publishedAt', 'failReason']) {
      if (str(args, k) !== undefined) body[k] = str(args, k);
    }
    if (args.progress && typeof args.progress === 'object') body.progress = args.progress;
    if (args.packaging && typeof args.packaging === 'object') body.packaging = args.packaging;
    return await studioFetch('/api/cs/videos', { method: 'POST', body: JSON.stringify(body) });
  },

  studio_brain_overview: async () => {
    return await studioFetch('/api/cs/brain');
  },

  studio_brain_question_add: async (args) => {
    const body = { areas: Array.isArray(args.areas) ? args.areas : [] };
    const text = str(args, 'text');
    const videoId = str(args, 'videoId');
    if (text) body.text = text;
    if (videoId) body.videoId = videoId;
    return await studioFetch('/api/cs/brain/questions', { method: 'POST', body: JSON.stringify(body) });
  },

  studio_brain_experiment_toggle: async (args) => {
    const body = {};
    if (typeof args.set_all === 'boolean') body.setAll = args.set_all;
    if (str(args, 'item_id') !== undefined && typeof args.enabled === 'boolean') {
      body.itemId = str(args, 'item_id');
      body.enabled = args.enabled;
    }
    if (!body.setAll && !('itemId' in body)) throw new Error('item_id + enabled (ya set_all) chahiye');
    return await studioFetch(`/api/cs/brain/experiments/${encodeURIComponent(str(args, 'experiment_id'))}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  studio_dashboard: async () => {
    return await studioFetch('/api/cs/dashboard');
  },

  studio_settings_get: async () => {
    return await studioFetch('/api/cs/settings');
  },

  studio_settings_set: async (args) => {
    if (args.kind === 'cred') {
      const body = {
        kind: 'cred',
        integrationId: str(args, 'integrationId'),
        fieldId: str(args, 'fieldId'),
        value: args.value === undefined ? undefined : args.value,
      };
      if (!body.integrationId || !body.fieldId) throw new Error('integrationId aur fieldId chahiye');
      return await studioFetch('/api/cs/settings', { method: 'PUT', body: JSON.stringify(body) });
    }
    if (args.kind === 'prefs') {
      const body = { kind: 'prefs', patch: args.patch && typeof args.patch === 'object' ? args.patch : {} };
      return await studioFetch('/api/cs/settings', { method: 'PUT', body: JSON.stringify(body) });
    }
    throw new Error("kind 'cred' ya 'prefs' hona chahiye");
  },

  studio_skills_list: async () => {
    return await studioFetch('/api/cs/packages');
  },

  studio_skill_get: async (args) => {
    return await studioFetch(`/api/cs/skills/${encodeURIComponent(str(args, 'skill_id'))}`);
  },
};

// ─── Run shapers (agent ko compact, readable output) ─────────────────────────

function stageLine(s) {
  return { stage: s.stage, status: s.status, note: s.note || undefined };
}

function summarizeRun(r) {
  if (!r) return r;
  return {
    id: r.id,
    idea_id: r.ideaId,
    topic: r.topic,
    status: r.status,
    current_stage: (r.stages || []).find((s) => s.status === 'active')?.stage,
    stages: (r.stages || []).map(stageLine),
  };
}

function fullRun(r) {
  if (!r) return r;
  return {
    id: r.id,
    idea_id: r.ideaId,
    topic: r.topic,
    status: r.status,
    stages: (r.stages || []).map(stageLine),
    failed_stage: r.failedStage || undefined,
    fail_reason: r.failReason || undefined,
    video_id: r.videoId || undefined,
  };
}

// ─── MCP message wiring ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'mcp_tool_call') return;
  (async () => {
    const handler = handlers[message.tool];
    if (!handler) throw new Error(`Unknown tool: ${message.tool}`);
    return await handler(message.args || {});
  })().then(sendResponse, (error) =>
    sendResponse({ isError: true, content: [{ type: 'text', text: error?.message || String(error) }] })
  );
  return true;
});
