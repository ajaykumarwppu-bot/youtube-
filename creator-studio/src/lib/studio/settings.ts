// Creator Studio — Settings store (STATIC ENGINE, IndexedDB).
// Client sirf settings-types.ts import karta hai.
//
// API keys RAW form me IndexedDB docs store me save hoti hain (single device,
// WebView ka private storage). api layer client ko sirf MASKED values bhejti
// hai (••••last4) — raw key UI me kabhi nahi jati. Phase 2 me app ke secure
// storage (Keystore) me move honge — StudioWebBridge ke through.

import { docGet, docSet } from "./idb";
import {
  DEFAULT_PREFS,
  INTEGRATIONS,
  integrationDef,
  type IntegrationConfig,
  type IntegrationId,
  type IntegrationView,
  type SettingsView,
  type StoredSettings,
  type StudioPrefs,
} from "./settings-types";

const SETTINGS_KEY = "settings";

// ---------------------------------------------------------------------------
// persistence

async function readRaw(): Promise<StoredSettings | null> {
  const st = await docGet<StoredSettings>(SETTINGS_KEY);
  if (!st || !st.integrations || !st.prefs) return null;
  return st;
}

async function writeRaw(st: StoredSettings): Promise<void> {
  await docSet(SETTINGS_KEY, st);
}

export async function readSettings(): Promise<StoredSettings> {
  const existing = await readRaw();
  if (existing) return existing;
  const seeded = seedSettings();
  await writeRaw(seeded);
  return seeded;
}

// seed — keys EMPTY (koi fake key nahi: agent "connected" tabhi dikhega jab
// user apni real key dale), preferences sensible defaults
function seedSettings(): StoredSettings {
  const integrations = {} as Record<IntegrationId, IntegrationConfig>;
  for (const def of INTEGRATIONS) {
    integrations[def.id] = { creds: {} }; // fieldId -> value
  }
  return { integrations, prefs: { ...DEFAULT_PREFS } };
}

// ---------------------------------------------------------------------------
// masking — client view

function maskValue(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (t.length <= 6) return "••••";
  return "••••" + t.slice(-4);
}

export function maskSettings(st: StoredSettings): SettingsView {
  const integrations = {} as Record<IntegrationId, IntegrationView>;
  for (const def of INTEGRATIONS) {
    const raw = st.integrations[def.id]?.creds ?? {};
    const masked: Record<string, string> = {};
    for (const [fieldId, value] of Object.entries(raw)) {
      if (value) masked[fieldId] = maskValue(value);
    }
    integrations[def.id] = { masked };
  }
  return { integrations, prefs: { ...st.prefs } };
}

// ---------------------------------------------------------------------------
// actions

async function storedWith(patch: (st: StoredSettings) => void): Promise<StoredSettings> {
  const st = await readSettings();
  patch(st);
  await writeRaw(st);
  return st;
}

// ek credential field set (value null = remove)
export async function setCred(integrationId: string, fieldId: string, value: string | null): Promise<StoredSettings> {
  const def = integrationDef(integrationId);
  if (!def || def.kind !== "keys") throw new Error("Integration nahi mila");
  if (!def.fields?.some((f) => f.id === fieldId)) throw new Error("Field nahi mila");

  return storedWith((st) => {
    const cfg = st.integrations[def.id];
    if (value === null || !value.trim()) delete cfg.creds[fieldId];
    else cfg.creds[fieldId] = value.trim();
  });
}

// preferences update (partial patch)
export async function updatePrefs(patch: Partial<StudioPrefs>): Promise<StoredSettings> {
  return storedWith((st) => {
    if (patch.contentLanguage !== undefined) st.prefs.contentLanguage = patch.contentLanguage;
    if (patch.defaultKind !== undefined) st.prefs.defaultKind = patch.defaultKind;
    if (patch.videosPerWeek !== undefined) {
      st.prefs.videosPerWeek = Math.min(7, Math.max(1, Math.round(patch.videosPerWeek)));
    }
    if (patch.autoUpload !== undefined) st.prefs.autoUpload = patch.autoUpload;
    if (patch.voiceCharacter !== undefined) {
      st.prefs.voiceCharacter = patch.voiceCharacter.trim().slice(0, 40);
    }
  });
}
