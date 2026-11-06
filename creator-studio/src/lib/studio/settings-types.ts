// Creator Studio — Settings types + integration definitions (CLIENT-SAFE, no fs).
//
// IMPORTANT (owner ka rule): LLM aur AI image/video generation YAHAN NAHI hai —
// wo AntiGem ke andar se aate hain (AntiGem me sign-in + MCP / Google Flow ke
// mini browser se). Isliye Settings me sirf:
//   1. Voiceover (TTS)  — API key + voice character ka naam
//   2. YouTube Upload   — Data API v3 OAuth (Phase 2 me agent isi se upload karega)
//   3. YouTube Analytics — Analytics API (channel data read — Home dashboard)
//   4. Stock B-roll directory  — free stock sites ki list (general + niche)
//   5. Music & SFX directory   — free background music + sound effects sites
//
// Research-based (Nov 2026):
//  - YouTube ke DO alag APIs hain: Data API v3 (upload/manage) aur Analytics
//    API (channel data read) — dono same Google Cloud project me enable hoti
//    hain, ek hi OAuth client se dono ke scopes authorize ho sakte hain.
//  - Stock/music sites ke license notes monetized channel ke hisaab se likhe hain
//    (Pexels/Pixabay/Mixkit no attribution; Dareful CC-BY; BBC SFX sirf
//    personal/education — commercial nahi).

import type { StageKey } from "./pipeline-types";

export type IntegrationId = "tts" | "youtube" | "youtube_analytics" | "stock" | "music";

export interface FieldDef {
  id: string; // "api_key" | "client_id" | ...
  label: string;
  placeholder: string;
  secret: boolean; // password input + eye toggle
}

// directory card ki ek site
export interface ResourceSite {
  name: string;
  url: string; // domain (display)
  what: string; // kya milega
  license: string; // license note — monetized channel ke hisaab se
}

export interface ResourceCategory {
  label: string;
  sites: ResourceSite[];
}

export interface IntegrationDef {
  id: IntegrationId;
  kind: "keys" | "directory";
  name: string;
  desc: string; // is automation me kya kaam aata hai (Hinglish)
  stages: StageKey[]; // pipeline ke kaun-se stages me use hota hai (empty = pipeline se direct link nahi)
  icon: "audio" | "youtube" | "chart" | "film" | "music";
  core: boolean; // agent ready hone ke liye zaroori
  phase2?: boolean; // actual kaam Phase 2 me hoga
  note?: string; // card ke neeche extra info (OAuth ka jawab, warning)
  fields?: FieldDef[]; // kind = keys
  requiredFields?: string[]; // "connected" tab jab ye sab set hon
  categories?: ResourceCategory[]; // kind = directory
}

const OAUTH_FIELDS: FieldDef[] = [
  { id: "client_id", label: "Client ID", placeholder: "Google Cloud OAuth client ka ID", secret: false },
  { id: "client_secret", label: "Client Secret", placeholder: "OAuth client secret", secret: true },
  { id: "refresh_token", label: "Refresh Token", placeholder: "OAuth consent ke baad milne wala token", secret: true },
];

const OAUTH_REQUIRED = ["client_id", "client_secret", "refresh_token"];

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "tts",
    kind: "keys",
    name: "Voiceover (TTS)",
    desc: "Script se voice generate hoti hai — jo bhi TTS service use karte ho, uski API key yahan paste karo.",
    stages: ["voiceover"],
    icon: "audio",
    core: true,
    fields: [{ id: "api_key", label: "API Key", placeholder: "TTS service ki key paste karo", secret: true }],
    requiredFields: ["api_key"],
  },
  {
    id: "youtube",
    kind: "keys",
    name: "YouTube Upload",
    desc: "Production-ready video ko channel par upload/schedule karna — agent isi se directly upload karega.",
    stages: ["seo_prep"],
    icon: "youtube",
    core: true,
    phase2: true,
    fields: OAUTH_FIELDS,
    requiredFields: OAUTH_REQUIRED,
    note: "Upload ke liye OAuth 2.0 chahiye — Google Cloud project me 'YouTube Data API v3' enable karke OAuth Client banao. Plain API key se sirf public data read hota hai, upload nahi.",
  },
  {
    id: "youtube_analytics",
    kind: "keys",
    name: "YouTube Analytics (Data Read)",
    desc: "Channel ka data read karna — views, CTR, retention, subscribers. Home dashboard ka data isi API se bharega.",
    stages: [], // pipeline stage nahi — video ke baad ka analytics
    icon: "chart",
    core: false,
    phase2: true,
    fields: OAUTH_FIELDS,
    requiredFields: OAUTH_REQUIRED,
    note: "Haan — data read ke liye ALAG API hai: 'YouTube Analytics API'. Same Google Cloud project me Data API v3 ke saath ise bhi enable karo. Same Client ID/Secret dono ke scopes authorize kar sakte hain — refresh token ek hi milega, dono jagah kaam karega.",
  },
  {
    id: "stock",
    kind: "directory",
    name: "Stock B-roll Directory",
    desc: "Visuals stage ke liye free stock photos/videos — kahan se kya milega, puri list. API key nahi chahiye.",
    stages: ["visuals"],
    icon: "film",
    core: false,
    categories: [
      {
        label: "General — sab topics ke photos + videos",
        sites: [
          { name: "Pexels", url: "pexels.com", what: "Lifestyle, people, landscape, vertical clips — HD/4K, bina account download", license: "Free commercial, attribution nahi" },
          { name: "Pixabay", url: "pixabay.com", what: "230,000+ clips — niche topics, animation, green-screen, motion graphics", license: "Free commercial, attribution nahi" },
          { name: "Mixkit", url: "mixkit.co", what: "Curated background/social footage + music + SFX bhi isi par", license: "Free — par clip ka license label check karo" },
          { name: "Coverr", url: "coverr.co", what: "Backgrounds, loops, lifestyle clips — bina account", license: "Free, attribution nahi" },
          { name: "Videvo", url: "videvo.net", what: "Stock clips + motion graphics + free music", license: "Free tier — per-clip license dekho" },
          { name: "Openverse", url: "openverse.org", what: "Crores of CC images/audio — kai sources ek jagah search", license: "CC — per-item license check" },
        ],
      },
      {
        label: "Space & Science — documentary/space videos ke liye",
        sites: [
          { name: "NASA Image & Video Library", url: "images.nasa.gov", what: "NASA ka official — missions, ISS, JWST/Hubble imagery, 4K videos", license: "Free — NASA logo/insignia rules dekho" },
          { name: "ESA Video Archives", url: "esa.int", what: "Space missions, rockets, Earth observation — documentary producers ke liye clips", license: "Free with credit (ESA terms)" },
          { name: "US National Archives — Space", url: "archives.gov", what: "~10,000 reels NASA ke historical films (Apollo era se)", license: "Public domain (US Gov)" },
        ],
      },
      {
        label: "History & Archive — documentary footage",
        sites: [
          { name: "Internet Archive", url: "archive.org", what: "Millions of free films, newsreels, TV programs", license: "Public domain/CC — per-item check" },
          { name: "Prelinger Archives", url: "archive.org/details/prelinger", what: "~11,000 titles — US cultural history, everyday life, purane ads", license: "Public domain" },
          { name: "Library of Congress", url: "loc.gov", what: "Historical photos + moving images — free-to-use sets", license: "Free to use — rights note per item" },
          { name: "Wikimedia Commons", url: "commons.wikimedia.org", what: "Historical images/videos — sab CC licensed", license: "CC — attribution type per file" },
        ],
      },
      {
        label: "Nature & Aerial",
        sites: [
          { name: "Dareful", url: "dareful.com", what: "4K landscapes, aerial, nature clips", license: "Free, CC BY 4.0 — credit chahiye" },
          { name: "Vidsplay", url: "vidsplay.com", what: "Nature/urban stock clips, chhoti library", license: "Free with attribution" },
        ],
      },
    ],
  },
  {
    id: "music",
    kind: "directory",
    name: "Music & Sound Effects Directory",
    desc: "Edit stage me background music + sound effects — free wali websites ki list. API key ka pata nahi, websites direct kaam karti hain.",
    stages: ["edit"],
    icon: "music",
    core: false,
    categories: [
      {
        label: "Background Music — free tracks",
        sites: [
          { name: "YouTube Audio Library", url: "studio.youtube.com → Audio Library", what: "YT Studio ke andar hi — monetized videos ke liye safest", license: "Free, kuch tracks credit maangte hain" },
          { name: "Pixabay Music", url: "pixabay.com/music", what: "Cinematic, lo-fi, corporate — sab genres", license: "Free commercial, attribution nahi" },
          { name: "Mixkit Music", url: "mixkit.co/free-stock-music", what: "Curated tracks — har mood/genre", license: "Free license" },
          { name: "Uppbeat", url: "uppbeat.io", what: "Trendy creator-focused tracks", license: "Free tier — credits system" },
          { name: "Free Music Archive", url: "freemusicarchive.org", what: "CC music — genre-wise sorted", license: "CC — per-track license" },
          { name: "Incompetech", url: "incompetech.com", what: "Kevin MacLeod ki famous tracks", license: "CC BY — video me credit dena" },
        ],
      },
      {
        label: "Sound Effects — whoosh, impact, ambience",
        sites: [
          { name: "Freesound", url: "freesound.org", what: "Sabse bada CC SFX community — har type ka sound", license: "CC — per-sound license check" },
          { name: "Zapsplat", url: "zapsplat.com", what: "160,000+ SFX + 1,000 music tracks", license: "Free commercial (account; credit ya premium)" },
          { name: "Pixabay Sound Effects", url: "pixabay.com/sound-effects", what: "Clean SFX — transitions, nature, UI", license: "Free commercial, attribution nahi" },
          { name: "Mixkit SFX", url: "mixkit.co/free-sound-effects", what: "Cinematic hits, transitions, interface sounds", license: "Free, attribution nahi" },
          { name: "BBC Sound Effects", url: "sound-effects.bbcrewind.co.uk", what: "16,000+ historic BBC SFX — nature, city, machines", license: "Sirf personal/education — commercial upload ke liye NAHI" },
        ],
      },
    ],
  },
];

export function integrationDef(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((i) => i.id === id);
}

// ---------------------------------------------------------------------------
// preferences

export type ContentLanguage = "hinglish" | "hindi" | "english";

export interface StudioPrefs {
  contentLanguage: ContentLanguage; // script + voiceover isi language me
  defaultKind: "long" | "short"; // naye runs ka default format
  videosPerWeek: number; // upload target (1-7)
  autoUpload: boolean; // production ready hote hi khud upload (Phase 2)
  voiceCharacter: string; // TTS voice ka CHARACTER NAME (jaise "Aarav", "Narrator Uncle")
}

export const DEFAULT_PREFS: StudioPrefs = {
  contentLanguage: "hinglish",
  defaultKind: "long",
  videosPerWeek: 3,
  autoUpload: false,
  voiceCharacter: "",
};

// ---------------------------------------------------------------------------
// stored (server) + client view

export interface IntegrationConfig {
  // fieldId -> value (raw, sirf server par; client ko masked jata hai)
  creds: Record<string, string>;
}

export interface StoredSettings {
  integrations: Record<IntegrationId, IntegrationConfig>;
  prefs: StudioPrefs;
}

// client view — values masked (••••last4), raw key kabhi browser par nahi jata
export interface IntegrationView {
  masked: Record<string, string>; // fieldId -> masked preview
}

export interface SettingsView {
  integrations: Record<IntegrationId, IntegrationView>;
  prefs: StudioPrefs;
}

// keys wala integration "connected" hai jab active fields (required) sab set hon
export function isConnected(view: IntegrationView | undefined, def: IntegrationDef): boolean {
  if (!view || def.kind !== "keys") return false;
  return (def.requiredFields ?? []).every((f) => Boolean(view.masked[f]));
}
