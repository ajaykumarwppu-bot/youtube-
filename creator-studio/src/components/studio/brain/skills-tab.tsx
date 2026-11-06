"use client";

// SKILLS tab (Brain ka 4th section) — phone-first redesign:
// - upar: Skills count + Active count + Upload button (bada drag-drop box hataya)
// - niche: search + seedhe skills ki flat list (1 uploaded zip/file = 1 skill)

import { useMemo, useState } from "react";
import { Bot, Search, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PackageCard } from "@/components/studio/package-card";
import { UploadButton } from "@/components/studio/upload-button";
import type { PackageEntry } from "@/lib/studio/types";

interface Stats {
  packages: number;
  skills: number;
  enabledSkills: number;
  versions: number;
}

interface Props {
  packages: PackageEntry[];
  stats: Stats;
  loading: boolean;
  onOpenDetail: (id: string) => void;
  onTogglePackage: (pkg: PackageEntry, enabled: boolean) => Promise<void>;
  onDeletePackage: (pkg: PackageEntry) => Promise<void>;
  onReloadPackages: () => Promise<void>;
}

export function SkillsTab({
  packages, stats, loading, onOpenDetail, onTogglePackage, onDeletePackage, onReloadPackages,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.originalFileName.toLowerCase().includes(q) ||
        p.skills.some((s) => s.title.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    );
  }, [packages, search]);

  return (
    <div className="space-y-4">
      {/* top strip: Skills | Active | Upload button */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="flex flex-col items-center gap-1 p-2.5 text-center">
            <Bot className="h-4 w-4 text-primary" />
            <p className="text-lg font-bold leading-none">{stats.skills}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Skills</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="flex flex-col items-center gap-1 p-2.5 text-center">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-lg font-bold leading-none">{stats.enabledSkills}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <UploadButton onUploaded={() => onReloadPackages()} />
      </div>

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="h-11 pl-9"
          aria-label="Search skills"
        />
      </div>

      {/* flat skill list — seedhe skills, koi package/skill switch nahi */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-40 animate-pulse bg-card/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">
              {packages.length === 0 ? "Koi skill nahi hai" : "Search se koi skill match nahi hui"}
            </p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {packages.length === 0
                ? "Upar Upload button dabao — ZIP ya koi bhi file add karo. App khud extract karke naam, version aur description detect kar lega."
                : "Dusre naam se search karke dekho."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              onToggle={onTogglePackage}
              onOpen={(pkg) => onOpenDetail(pkg.id)}
              onDelete={onDeletePackage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
