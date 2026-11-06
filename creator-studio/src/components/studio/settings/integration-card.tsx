"use client";

// Settings ke cards — do tarah:
//   kind="keys"      → API key/OAuth fields (masked, Badlo/Hatao) + TTS me character name
//   kind="directory" → free websites ki categorized list (stock B-roll, music/SFX)
// Raw key kabhi client par nahi aati: server se sirf "••••last4" preview aata hai.

import { useState } from "react";
import {
  AudioLines, BarChart3, Check, ExternalLink, Eye, EyeOff, Film, KeyRound,
  Loader2, Music, Trash2, Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { stageLabel } from "@/lib/studio/pipeline-stages";
import {
  isConnected,
  type IntegrationDef, type IntegrationView, type SettingsView,
} from "@/lib/studio/settings-types";

const ICONS = {
  audio: AudioLines,
  youtube: Youtube,
  chart: BarChart3,
  film: Film,
  music: Music,
} as const;

interface Props {
  def: IntegrationDef;
  view: IntegrationView;
  prefs: SettingsView["prefs"];
  onChanged: (next: SettingsView) => void;
}

export function IntegrationCard({ def, view, prefs, onChanged }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({}); // fieldId -> typed text
  const [show, setShow] = useState<Record<string, boolean>>({}); // fieldId -> eye toggle
  const [editing, setEditing] = useState<Record<string, boolean>>({}); // fieldId -> "Badlo" mode
  const [busy, setBusy] = useState<string | null>(null);
  const [charDraft, setCharDraft] = useState<string | null>(null); // TTS character name draft

  const connected = isConnected(view, def);
  const Icon = ICONS[def.icon];

  const put = async (body: Record<string, unknown>, okMsg?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/cs/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      onChanged(j as SettingsView);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (e) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : "" });
      return false;
    }
  };

  const saveField = async (fieldId: string) => {
    const value = drafts[fieldId]?.trim();
    if (!value) return;
    setBusy(fieldId);
    const ok = await put(
      { kind: "cred", integrationId: def.id, fieldId, value },
      "Key save ho gayi — ab masked dikhegi",
    );
    if (ok) {
      setDrafts((d) => ({ ...d, [fieldId]: "" }));
      setEditing((e) => ({ ...e, [fieldId]: false }));
    }
    setBusy(null);
  };

  const removeField = async (fieldId: string, label: string) => {
    setBusy(fieldId);
    const ok = await put(
      { kind: "cred", integrationId: def.id, fieldId, value: null },
      `${label} hata di`,
    );
    if (ok) setDrafts((d) => ({ ...d, [fieldId]: "" }));
    setBusy(null);
  };

  const saveCharacter = async () => {
    const value = (charDraft ?? prefs.voiceCharacter).trim();
    if (!value || value === prefs.voiceCharacter) return;
    setBusy("character");
    const ok = await put(
      { kind: "prefs", patch: { voiceCharacter: value } },
      `Character "${value}" save ho gaya — voiceover isi naam se generate hoga`,
    );
    if (ok) setCharDraft(null);
    setBusy(null);
  };

  return (
    <Card className="p-0">
      <CardContent className="space-y-3 p-3.5">
        {/* header */}
        <div className="flex items-start gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            connected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
          }`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[14px] font-semibold leading-tight">{def.name}</p>
              {def.phase2 && (
                <Badge variant="outline" className="border-white/20 px-1.5 text-[9px] text-muted-foreground">
                  Phase 2
                </Badge>
              )}
            </div>
            {def.stages.length > 0 && (
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                Pipeline: {def.stages.map((s) => stageLabel(s)).join(" · ")}
              </p>
            )}
          </div>
          {def.kind === "keys" ? (
            <Badge
              variant="outline"
              className={`shrink-0 ${connected ? "border-emerald-400/50 text-emerald-400" : "border-amber-400/50 text-amber-400"}`}
            >
              {connected ? "Connected" : "Not set"}
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 border-primary/40 text-primary">
              {(def.categories ?? []).reduce((n, c) => n + c.sites.length, 0)} sites
            </Badge>
          )}
        </div>

        <p className="text-[12px] leading-relaxed text-muted-foreground">{def.desc}</p>

        {/* ==================== KEYS variant ==================== */}
        {def.kind === "keys" && (
          <>
            <div className="space-y-2.5">
              {(def.fields ?? []).map((f) => {
                const saved = view.masked[f.id] ?? "";
                const draft = drafts[f.id] ?? "";
                const isEditing = Boolean(editing[f.id]);
                const showInput = !saved || isEditing;

                if (!showInput) {
                  /* saved state — masked row + Badlo/Hatao */
                  return (
                    <div key={f.id} className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/5 px-2.5 py-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] text-muted-foreground">{f.label}</p>
                        <p className="font-mono text-[12px] text-emerald-400">{saved}</p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground"
                        onClick={() => setEditing((e) => ({ ...e, [f.id]: true }))}
                      >
                        Badlo
                      </Button>
                      <Button
                        size="icon" variant="ghost" disabled={busy === f.id}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`${f.label} hatao`}
                        onClick={() => removeField(f.id, f.label)}
                      >
                        {busy === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  );
                }

                /* empty / editing — input + eye + save */
                return (
                  <div key={f.id} className="space-y-1.5">
                    <label htmlFor={`${def.id}-${f.id}`} className="text-[11.5px] font-medium">
                      {f.label}
                      {saved && <span className="ml-1 font-normal text-muted-foreground">(saved: {saved} — replace hoga)</span>}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`${def.id}-${f.id}`}
                          type={f.secret && !show[f.id] ? "password" : "text"}
                          value={draft}
                          autoComplete="off"
                          onChange={(e) => setDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveField(f.id); }}
                          placeholder={f.placeholder}
                          className="h-9 pr-9 text-[13px]"
                        />
                        {f.secret && (
                          <button
                            type="button"
                            aria-label={show[f.id] ? "Key chhupao" : "Key dikhao"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShow((s) => ({ ...s, [f.id]: !s[f.id] }))}
                          >
                            {show[f.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <Button
                        size="sm" className="h-9 shrink-0 px-3"
                        disabled={!draft.trim() || busy === f.id}
                        onClick={() => saveField(f.id)}
                      >
                        {busy === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => { setEditing((e) => ({ ...e, [f.id]: false })); setDrafts((d) => ({ ...d, [f.id]: "" })); }}
                      >
                        Cancel — purani key rakho
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TTS extra — voice CHARACTER ka naam (voice style ki jagah) */}
            {def.id === "tts" && (
              <div className="space-y-1.5 rounded-xl border border-white/5 bg-secondary/30 p-3">
                <label htmlFor="tts-character" className="text-[11.5px] font-medium">
                  Voice character ka naam
                </label>
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  Jo naam aap TTS service me character ko dete ho wahi likho — agent voiceover
                  generate karte waqt isi character ko use karega.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="tts-character"
                    value={charDraft ?? prefs.voiceCharacter}
                    onChange={(e) => setCharDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveCharacter(); }}
                    placeholder="Jaise: Aarav, Narrator Uncle, Deep Voice…"
                    className="h-9 text-[13px]"
                    maxLength={40}
                  />
                  <Button
                    size="sm" className="h-9 shrink-0 px-3"
                    disabled={busy === "character" || !(charDraft ?? "").trim() || (charDraft ?? prefs.voiceCharacter).trim() === prefs.voiceCharacter}
                    onClick={saveCharacter}
                  >
                    {busy === "character" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
                  </Button>
                </div>
              </div>
            )}

            {def.note && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground/80">
                {def.note}
              </p>
            )}
          </>
        )}

        {/* ==================== DIRECTORY variant ==================== */}
        {def.kind === "directory" && (
          <div className="space-y-3">
            {(def.categories ?? []).map((cat) => (
              <div key={cat.label} className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat.label}
                </p>
                <div className="space-y-1.5">
                  {cat.sites.map((site) => (
                    <div key={site.name} className="rounded-lg border border-white/5 bg-secondary/30 px-2.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://${site.url.split(" → ")[0].replace(/^https?:\/\//, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
                        >
                          <span className="truncate">{site.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{site.url}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-foreground/70">{site.what}</p>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                        <span className={site.license.includes("NAHI") ? "font-semibold text-amber-400" : ""}>
                          License: {site.license}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
