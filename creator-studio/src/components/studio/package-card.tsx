"use client";

import { useState } from "react";
import { Boxes, ChevronRight, FileArchive, FileText, GitBranch, Puzzle, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { PackageEntry } from "@/lib/studio/types";

const TYPE_LABEL: Record<PackageEntry["type"], { label: string; icon: typeof Puzzle }> = {
  plugin: { label: "Plugin", icon: Puzzle },
  zip: { label: "ZIP", icon: FileArchive },
  single: { label: "Skill", icon: FileText },
  file: { label: "File", icon: FileText },
};

export function PackageIcon({ pkg, className }: { pkg: PackageEntry; className?: string }) {
  const [err, setErr] = useState(false);
  if (pkg.icon && !err) {
    return (
      <img
        src={`/api/cs/packages/${pkg.id}/icon`}
        alt={`${pkg.name} icon`}
        className={className}
        onError={() => setErr(true)}
      />
    );
  }
  const Icon = TYPE_LABEL[pkg.type].icon;
  return (
    <div className={`flex items-center justify-center rounded-lg bg-primary/15 text-primary ${className}`}>
      <Icon className="h-1/2 w-1/2" />
    </div>
  );
}

interface Props {
  pkg: PackageEntry;
  onToggle: (pkg: PackageEntry, enabled: boolean) => void;
  onOpen: (pkg: PackageEntry) => void;
  onDelete: (pkg: PackageEntry) => void;
}

export function PackageCard({ pkg, onToggle, onOpen, onDelete }: Props) {
  const TypeIcon = TYPE_LABEL[pkg.type].icon;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const latestN = pkg.uploads?.length ? pkg.uploads[pkg.uploads.length - 1].n : 1;
  const versionCount = pkg.uploads?.length ?? 1;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-label={`Open ${pkg.name}`}
        onClick={() => onOpen(pkg)}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen(pkg); }}
        className="cursor-pointer p-0 transition-transform active:scale-[0.985]"
      >
        <CardContent className="p-4">
          {/* icon + name row */}
          <div className="flex items-start gap-3">
            <PackageIcon pkg={pkg} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[15px] font-semibold" title={pkg.name}>{pkg.name}</h3>
                <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">V{latestN}</Badge>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <TypeIcon className="h-3 w-3" /> {TYPE_LABEL[pkg.type].label}
              </p>
            </div>
            <ChevronRight className="mt-2.5 h-4.5 w-4.5 shrink-0 text-muted-foreground" />
          </div>

          {/* description */}
          <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {pkg.description}
          </p>

          {/* badges */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Boxes className="h-3 w-3" /> {pkg.fileCount} files
            </Badge>
            <Badge variant="outline" className="gap-1 text-[11px]">
              <GitBranch className="h-3 w-3" /> {versionCount} version{versionCount === 1 ? "" : "s"}
            </Badge>
            {pkg.mcpToolsCount > 0 && (
              <Badge variant="outline" className="text-[11px]">{pkg.mcpToolsCount} MCP tools</Badge>
            )}
          </div>

          {/* footer: enable switch + delete */}
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={pkg.enabled}
                onCheckedChange={(v) => onToggle(pkg, v)}
                aria-label={`Enable ${pkg.name}`}
              />
              <span className="text-xs text-muted-foreground">{pkg.enabled ? "Enabled" : "Disabled"}</span>
            </span>
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${pkg.name}`}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pkg.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Skill ki saari extracted files aur version history delete ho jayegi. Ye undo nahi ho sakta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => { e.stopPropagation(); onDelete(pkg); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
