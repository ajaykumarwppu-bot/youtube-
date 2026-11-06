"use client";

// SETTINGS tab — automation ka engine config.
// 1. Setup card: kitni key-services connected (Voiceover TTS + YouTube)
//    NOTE: LLM + AI images/video AntiGem ke andar se aate hain (MCP + Google
//    Flow) — isliye unki keys yahan NAHI hain.
// 2. Automation Preferences: language, default format, weekly target, auto-upload
// 3. API Keys & Services: TTS, YouTube Upload, YouTube Analytics (masked keys)
// 4. Free Resources: stock B-roll + music/SFX websites ki directory

import { useCallback, useEffect, useState } from "react";
import { Info, Loader2, Minus, Plus, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  INTEGRATIONS, isConnected,
  type SettingsView, type StudioPrefs,
} from "@/lib/studio/settings-types";
import { IntegrationCard } from "./integration-card";

const LANG_LABELS: Record<StudioPrefs["contentLanguage"], string> = {
  hinglish: "Hinglish",
  hindi: "Hindi",
  english: "English",
};

export function SettingsScreen() {
  const [state, setState] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPref, setBusyPref] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cs/settings");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setState(j as SettingsView);
    } catch (e) {
      toast.error("Settings load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updatePrefs = async (patch: Partial<StudioPrefs>, msg?: string) => {
    if (!state) return;
    // optimistic — turant UI me dikh jaye
    setState({ ...state, prefs: { ...state.prefs, ...patch } });
    setBusyPref(true);
    try {
      const res = await fetch("/api/cs/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "prefs", patch }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setState(j as SettingsView);
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error("Preference save failed", { description: e instanceof Error ? e.message : "" });
      load(); // rollback
    } finally {
      setBusyPref(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Card key={i} className="h-32 animate-pulse bg-card/60" />)}
      </div>
    );
  }

  const keyDefs = INTEGRATIONS.filter((d) => d.kind === "keys");
  const dirDefs = INTEGRATIONS.filter((d) => d.kind === "directory");
  const connectedCount = keyDefs.filter((d) => isConnected(state.integrations[d.id], d)).length;
  const coreConnected = keyDefs.filter((d) => d.core && isConnected(state.integrations[d.id], d)).length;
  const coreReady = coreConnected === keyDefs.filter((d) => d.core).length;
  const pct = Math.round((connectedCount / keyDefs.length) * 100);
  const prefs = state.prefs;

  return (
    <div className="space-y-5">
      {/* heading */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <SettingsIcon className="h-5 w-5 text-primary" /> Settings
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Automation ka engine — yahan TTS + YouTube connect karo, baaki AntiGem sambhalta hai.
          </p>
        </div>
      </div>

      {/* AntiGem note — kyun LLM/images yahan nahi hain */}
      <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[11.5px] leading-relaxed text-foreground/85">
          <b className="font-semibold">AI Brain (LLM) aur AI images/videos is app me nahi hain</b> —
          wo AntiGem ke andar se aate hain. AntiGem me sign-in karke wo MCP ke through ye pura
          dashboard aur app control karega, aur Google Flow ke mini browser se visuals banayega.
        </p>
      </div>

      {/* ==================== SETUP STATUS ==================== */}
      <Card className="p-0">
        <CardContent className="space-y-2.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold">Automation Setup</p>
            <Badge
              variant="outline"
              className={coreReady
                ? "border-emerald-400/50 text-emerald-400"
                : "border-amber-400/50 text-amber-400"}
            >
              {coreReady ? "Agent ready" : "Setup baaki"}
            </Badge>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold leading-none">{connectedCount}</span>
            <span className="text-[13px] text-muted-foreground">/ {keyDefs.length} services connected</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>

          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Agent ready hai jab <b className="text-foreground">Voiceover TTS</b> +{" "}
            <b className="text-foreground">YouTube Upload</b> connect ho jaye. YouTube Analytics
            data read ke liye hai (Home dashboard), aur neeche ki directories sirf reference hain —
            unme kuch connect nahi karna.
          </p>
        </CardContent>
      </Card>

      {/* ==================== AUTOMATION PREFERENCES ==================== */}
      <section className="space-y-3">
        <h2 className="text-[15px] font-bold">Automation Preferences</h2>
        <Card className="p-0">
          <CardContent className="space-y-4 p-3.5">

            {/* content language */}
            <div>
              <p className="text-[12.5px] font-medium">Content language</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Script aur voiceover isi language me banenge.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(["hinglish", "hindi", "english"] as const).map((lang) => {
                  const active = prefs.contentLanguage === lang;
                  return (
                    <button
                      key={lang} type="button" disabled={busyPref}
                      onClick={() => updatePrefs({ contentLanguage: lang }, `Language: ${LANG_LABELS[lang]}`)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground active:bg-secondary"
                      }`}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* default kind */}
            <div>
              <p className="text-[12.5px] font-medium">Default video type</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Idea Bank se naya run shuru hote to is format me banega.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {([["long", "Long-form"], ["short", "Shorts"]] as const).map(([k, label]) => {
                  const active = prefs.defaultKind === k;
                  return (
                    <button
                      key={k} type="button" disabled={busyPref}
                      onClick={() => updatePrefs({ defaultKind: k }, `Default: ${label}`)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground active:bg-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* videos per week stepper */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium">Weekly upload target</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Hafte me kitni videos — pipeline isi pace par chalega.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Button
                  size="icon" variant="secondary" aria-label="Kam karo"
                  className="h-8 w-8" disabled={busyPref || prefs.videosPerWeek <= 1}
                  onClick={() => updatePrefs({ videosPerWeek: prefs.videosPerWeek - 1 })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-5 text-center text-[15px] font-bold tabular-nums">{prefs.videosPerWeek}</span>
                <Button
                  size="icon" variant="secondary" aria-label="Zyada karo"
                  className="h-8 w-8" disabled={busyPref || prefs.videosPerWeek >= 7}
                  onClick={() => updatePrefs({ videosPerWeek: prefs.videosPerWeek + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* auto upload */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  Auto-upload
                  <Badge variant="outline" className="border-white/20 px-1.5 text-[9px] text-muted-foreground">
                    Phase 2
                  </Badge>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Video production ready hote hi khud upload/schedule ho — YouTube connect hone par chalega.
                </p>
              </div>
              <Switch
                checked={prefs.autoUpload} disabled={busyPref}
                onCheckedChange={(v) => updatePrefs({ autoUpload: v }, v ? "Auto-upload on" : "Auto-upload off")}
                aria-label="Auto-upload toggle"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ==================== API KEYS & SERVICES ==================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold">API Keys & Services</h2>
          <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-[18px] text-muted-foreground">
            {keyDefs.length}
          </span>
        </div>

        <div className="space-y-3">
          {keyDefs.map((def) => (
            <IntegrationCard
              key={def.id}
              def={def}
              view={state.integrations[def.id]}
              prefs={prefs}
              onChanged={setState}
            />
          ))}
        </div>
      </section>

      {/* ==================== FREE RESOURCES (DIRECTORIES) ==================== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold">Free Resources</h2>
          <span className="rounded-full bg-secondary px-1.5 text-[10px] leading-[18px] text-muted-foreground">
            {dirDefs.length}
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Inme kuch connect nahi karna — agent visuals aur edit stage me yahin se free
          photos/videos/music/sound effects uthayega. License notes dhyan se padho
          (monetized channel ke hisaab se likhe hain).
        </p>

        <div className="space-y-3">
          {dirDefs.map((def) => (
            <IntegrationCard
              key={def.id}
              def={def}
              view={state.integrations[def.id]}
              prefs={prefs}
              onChanged={setState}
            />
          ))}
        </div>
      </section>

      {/* security note */}
      <Card className="border-dashed">
        <CardContent className="p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Keys ki security
          </p>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
            Keys isi device ke data folder me save hoti hain aur UI par hamesha masked dikhti hain
            (sirf aakhri 4 characters) — dobara dekhne ke liye &ldquo;Badlo&rdquo; daba kar nayi paste karo.
            Phase 2 me ye encrypted hokar AntiGem app ke secure storage me jayengi.
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            Free start: TTS ke liye jo bhi service use karte ho uski key + Pexels/YT Audio Library
            wali directories — sab kaam ke bina kharche.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
