// Creator Studio — Settings server store (JSON persistence).
// Server-only file (uses fs) — client sirf settings-types.ts import karta hai.
//
// API keys RAW form me data/creator-studio/settings.json me save hoti hain
// (prototype — single device). API route client ko sirf MASKED values bhejta
// hai (••••last4), raw key browser par kabhi nahi jati. Phase 2 me encrypt
// honge + AntiGem app ke secure storage me move honge.

import fs from "fs";
import path from "path";
import { DATA_BASE } from "./paths";
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

const SETTINGS_FILE = path.join(DATA_BASE, "data", "creator-studio", "settings.json");

// ---------------------------------------------------------------------------
// persistence

function readFile(): StoredSettings | null {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    const st = JSON.parse(raw) as StoredSettings;
    if (!st || !st.integrations || !st.prefs) return null;
    return st;
  } catch {
    return null;
  }
}

function writeFile(st: StoredSettings) {
  const dir = path.dirname(SETTINGS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = SETTINGS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2), "utf8");
  fs.renameSync(tmp, SETTINGS_FILE);
}

export function readSettings(): StoredSettings {
  const existing = readFile();
  if (existing) return existing;
  const seeded = seedSettings();
  writeFile(seeded);
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

function storedWith(patch: (st: StoredSettings) => void): StoredSettings {
  const st = readSettings();
  patch(st);
  writeFile(st);
  return st;
}

// ek credential field set (value null = remove)
export function setCred(integrationId: string, fieldId: string, value: string | null): StoredSettings {
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
export function updatePrefs(patch: Partial<StudioPrefs>): StoredSettings {
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
