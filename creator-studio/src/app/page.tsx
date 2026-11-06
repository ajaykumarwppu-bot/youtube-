"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrainCircuit, FolderKanban, LayoutDashboard, Settings, Sparkles, Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BrainScreen, type BrainTab } from "@/components/studio/brain/brain-screen";
import { VideosScreen } from "@/components/studio/videos/videos-screen";
import { HomeScreen } from "@/components/studio/home/home-screen";
import { PipelineScreen } from "@/components/studio/pipeline/pipeline-screen";
import { SettingsScreen } from "@/components/studio/settings/settings-screen";
import { PackageDetail } from "@/components/studio/package-detail";
import type { PackageEntry } from "@/lib/studio/types";

interface Stats {
  packages: number;
  skills: number;
  enabledSkills: number;
  versions: number;
}

/* bottom tab bar — phone app navigation (same sections as planned roadmap) */
const NAV = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, soon: false },
  { key: "skills", label: "Brain", icon: BrainCircuit, soon: false },
  { key: "pipeline", label: "Pipeline", icon: FolderKanban, soon: false },
  { key: "videos", label: "Videos", icon: Video, soon: false },
  { key: "settings", label: "Settings", icon: Settings, soon: false },
];

export default function Home() {
  const [packages, setPackages] = useState<PackageEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ packages: 0, skills: 0, enabledSkills: 0, versions: 0 });
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [detailId, setDetailId] = useState<string | null>(null);
  // Brain ka active sub-tab page level par — skill detail se wapas aane par wahi tab khule
  // (pehle detail se back aane par hamesha Findings par reset ho jata tha)
  const [brainTab, setBrainTab] = useState<BrainTab>("findings");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cs/packages");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPackages(j.packages);
      setStats(j.stats);
    } catch (e) {
      toast.error("Packages load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePackage = async (pkg: PackageEntry, enabled: boolean) => {
    try {
      const res = await fetch(`/api/cs/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? j.package : p)));
      toast.success(enabled ? `${pkg.name} enabled` : `${pkg.name} disabled`);
    } catch (e) {
      toast.error("Toggle failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const deletePackage = async (pkg: PackageEntry) => {
    try {
      const res = await fetch(`/api/cs/packages/${pkg.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      toast.success(`${pkg.name} deleted`);
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  return (
    <div className="min-h-dvh bg-black">
      {/* phone shell — phone par full screen, laptop par centered app column */}
      <div className="relative mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-background sm:border-x sm:border-white/10">
        {detailId ? (
          /* detail = pushed full-screen page, apna top bar + scroll */
          <PackageDetail
            pkgId={detailId}
            onBack={() => setDetailId(null)}
            onChanged={(pkg) => {
              if (!pkg) { load(); return; }
              setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
            }}
          />
        ) : (
          <>
            {/* top app bar */}
            <header className="shrink-0 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
              <div className="flex items-center gap-2.5 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold leading-tight">Creator Studio</p>
                  <p className="text-[11px] text-muted-foreground">YouTube Automation · prototype</p>
                </div>
                <Badge variant="outline" className="shrink-0 border-primary/40 text-[10px] text-primary">
                  Phase 1
                </Badge>
              </div>
            </header>

            {/* scrollable content */}
            <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8">
              {activeNav === "dashboard" ? (
                <HomeScreen skillsStats={stats} />
              ) : activeNav === "skills" ? (
                <BrainScreen
                  packages={packages}
                  stats={stats}
                  loading={loading}
                  activeTab={brainTab}
                  onTabChange={setBrainTab}
                  onOpenPackageDetail={setDetailId}
                  onTogglePackage={togglePackage}
                  onDeletePackage={deletePackage}
                  onReloadPackages={load}
                />
              ) : activeNav === "pipeline" ? (
                <PipelineScreen />
              ) : activeNav === "videos" ? (
                <VideosScreen />
              ) : (
                <SettingsScreen />
              )}
            </main>

            {/* bottom tab bar */}
            <nav
              aria-label="Main navigation"
              className="shrink-0 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur"
            >
              <div className="grid grid-cols-5 px-1 pt-1.5">
                {NAV.map((item) => {
                  const active = activeNav === item.key && !item.soon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={item.soon}
                      onClick={() => setActiveNav(item.key)}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[52px] flex-col items-center justify-start gap-1 rounded-lg px-1 py-1.5 transition-colors ${
                        item.soon
                          ? "opacity-35"
                          : active
                            ? "text-primary"
                            : "text-muted-foreground active:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-[22px] w-[22px]" />
                      <span className={`text-[10px] leading-none ${active ? "font-semibold" : ""}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
