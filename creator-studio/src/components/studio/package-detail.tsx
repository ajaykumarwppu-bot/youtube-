"use client";

// SKILL DETAIL — full-screen page
// Tabs: Version Control (har zip upload ka record, click karke files dekho) + Files (latest)
// Version delete ka option jaan-boojh kar nahi hai — versions kabhi delete nahi hote.

import { useEffect, useState } from "react";
import {
  ArrowLeft, Boxes, Calendar, FileArchive, FileText, GitBranch,
  Loader2, Puzzle, ShieldCheck, Trash2, Wrench,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileTree } from "@/components/studio/file-tree";
import { FileViewer } from "@/components/studio/file-viewer";
import { PackageIcon } from "@/components/studio/package-card";
import { UploadButton } from "@/components/studio/upload-button";
import type { FileNode, PackageEntry, UploadVersion } from "@/lib/studio/types";

interface Props {
  pkgId: string;
  onBack: () => void;
  onChanged: (pkg: PackageEntry | null) => void; // null = deleted
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function PackageDetail({ pkgId, onBack, onChanged }: Props) {
  const [pkg, setPkg] = useState<PackageEntry | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // version control state
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [versionTrees, setVersionTrees] = useState<Record<number, FileNode[]>>({});
  const [versionLoading, setVersionLoading] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cs/packages/${pkgId}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setPkg(j.package as PackageEntry);
      setTree(j.tree as FileNode[]);
    } catch (e) {
      toast.error("Skill load failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pkgId]);

  const togglePackage = async (enabled: boolean) => {
    if (!pkg) return;
    try {
      const res = await fetch(`/api/cs/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPkg(j.package);
      onChanged(j.package);
      toast.success(enabled ? "Skill enabled — agent use kar sakta hai" : "Skill disabled");
    } catch (e) {
      toast.error("Toggle failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const deletePackage = async () => {
    if (!pkg) return;
    try {
      const res = await fetch(`/api/cs/packages/${pkg.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${pkg.name} deleted`);
      onChanged(null);
      onBack();
    } catch (e) {
      toast.error("Delete failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  // version accordion expand — us version ki file tree fetch (cache ke saath)
  const toggleVersion = async (n: number) => {
    if (expandedVersion === n) {
      setExpandedVersion(null);
      return;
    }
    setExpandedVersion(n);
    if (versionTrees[n]) return;
    setVersionLoading(n);
    try {
      const res = await fetch(`/api/cs/packages/${pkgId}/versions/${n}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Load failed");
      setVersionTrees((prev) => ({ ...prev, [n]: (j.tree as FileNode[]) ?? [] }));
    } catch (e) {
      toast.error("Version files load failed", { description: e instanceof Error ? e.message : "" });
      setExpandedVersion(null);
    } finally {
      setVersionLoading(null);
    }
  };

  // version tree ke relative path ko file API path me convert karo
  const openVersionFile = (n: number, node: FileNode) => {
    setSelectedFile({ ...node, path: `versions/v${n}/${node.path}` });
  };

  // selected file is version ke tree me hai to highlight karne ke liye relative path
  const versionSelectedRel = (n: number): string | null => {
    const prefix = `versions/v${n}/`;
    return selectedFile?.path.startsWith(prefix) ? selectedFile.path.slice(prefix.length) : null;
  };

  if (loading || !pkg) {
    return (
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-1.5 border-b px-2 py-2.5">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <p className="text-[15px] font-semibold text-muted-foreground">Loading…</p>
        </header>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading skill…
        </div>
      </div>
    );
  }

  const uploads = pkg.uploads?.length ? pkg.uploads : [{ n: 1, addedAt: pkg.installedAt, fileName: pkg.originalFileName, fileCount: pkg.fileCount } as UploadVersion];
  const latestN = uploads[uploads.length - 1].n;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* full-screen page top bar */}
      <header className="z-40 flex shrink-0 items-center gap-1 border-b bg-background/95 px-2 py-2 pt-[max(env(safe-area-inset-top),8px)] backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" className="h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{pkg.name}</p>
        </div>
        <Badge variant="secondary" className="mr-2 shrink-0 font-mono text-[11px]">V{latestN}</Badge>
      </header>

      {/* scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8">
        {/* skill header */}
        <div className="flex items-start gap-3">
          <PackageIcon pkg={pkg} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold leading-snug">{pkg.name}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {pkg.manifestId ? `id: ${pkg.manifestId}` : `file: ${pkg.originalFileName}`}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{pkg.description}</p>

        {/* meta chips — files / type / date (skills count wala badge hataya) */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-[11px] capitalize">
            <Puzzle className="h-3 w-3" /> {pkg.type}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Boxes className="h-3 w-3" /> {pkg.fileCount} files
          </Badge>
          <Badge variant="outline" className="gap-1 text-[11px]">
            <GitBranch className="h-3 w-3" /> {uploads.length} version{uploads.length === 1 ? "" : "s"}
          </Badge>
          {pkg.mcpToolsCount > 0 && (
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Wrench className="h-3 w-3" /> {pkg.mcpToolsCount} MCP
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-[11px]">
            <Calendar className="h-3 w-3" /> {new Date(pkg.installedAt).toLocaleDateString()}
          </Badge>
          {pkg.permissions.length > 0 && (
            <Badge variant="outline" className="gap-1 text-[11px]">
              <ShieldCheck className="h-3 w-3" /> {pkg.permissions.length} permissions
            </Badge>
          )}
        </div>

        {/* enable + delete row */}
        <div className="mt-4 flex items-center justify-between rounded-xl border bg-card px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <Switch checked={pkg.enabled} onCheckedChange={togglePackage} aria-label="Enable skill" />
            <div>
              <p className="text-sm font-medium">{pkg.enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-[11px] text-muted-foreground">
                {pkg.enabled ? "Agent ise use kar sakta hai" : "Agent ke liye band hai"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>

        {/* tabs — Version Control | Files */}
        <Tabs defaultValue="versions" className="mt-4">
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="versions">Version Control ({uploads.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({pkg.fileCount})</TabsTrigger>
          </TabsList>

          {/* version control tab */}
          <TabsContent value="versions" className="mt-3 space-y-3">
            {/* naya version upload — isi skill ke andar */}
            <UploadButton
              packageId={pkg.id}
              label="Upload new version"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-[13px] font-semibold text-primary transition-colors active:bg-primary/20"
              onUploaded={(updated) => {
                setExpandedVersion(null);
                setVersionTrees({});
                load();
                onChanged(updated); // page-level skill list bhi refresh ho (naam/version/badges)
              }}
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Nayi ZIP/file upload karo — purana version apne aap snapshot ho jayega. Versions kabhi delete nahi hote.
            </p>

            {/* versions list — Version 1 se neeche ki taraf */}
            <div className="space-y-2">
              {uploads.map((u) => {
                const active = u.n === latestN;
                const expanded = expandedVersion === u.n;
                return (
                  <Card key={u.n} className="p-0">
                    <button
                      type="button"
                      onClick={() => toggleVersion(u.n)}
                      aria-expanded={expanded}
                      className="block w-full p-0 text-left"
                    >
                      <CardContent className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <GitBranch className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[14px] font-semibold">Version {u.n}</span>
                              {active ? (
                                <Badge variant="outline" className="border-emerald-400/50 px-1.5 py-0 text-[10px] text-emerald-400">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              Added: {fmtDateTime(u.addedAt)}
                              {!active && u.disabledAt ? ` • Disabled: ${fmtDateTime(u.disabledAt)}` : ""}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                              <FileArchive className="h-3 w-3 shrink-0" /> {u.fileName} • {u.fileCount} files
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </button>
                    {/* expanded: is version ki files */}
                    {expanded && (
                      <div className="border-t px-3 py-2">
                        {versionLoading === u.n ? (
                          <div className="flex items-center gap-2 py-4 text-[12px] text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Files load ho rahi hain…
                          </div>
                        ) : (versionTrees[u.n]?.length ?? 0) === 0 ? (
                          <p className="py-4 text-[12px] text-muted-foreground">
                            Is version ki files snapshot me nahi mili (purana data).
                          </p>
                        ) : (
                          <>
                            <div className="max-h-[300px] overflow-auto py-1">
                              <FileTree
                                nodes={versionTrees[u.n]}
                                selectedPath={versionSelectedRel(u.n)}
                                onSelect={(node) => node.type === "file" && openVersionFile(u.n, node)}
                              />
                            </div>
                            <p className="border-t pt-2 text-[11px] text-muted-foreground">
                              Kisi bhi file par tap karo — puri file khul jayegi
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* files tab — latest version ki files, tap → full-screen viewer */}
          <TabsContent value="files" className="mt-3">
            <Card className="p-0">
              <div className="flex items-center justify-between border-b px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Skill files
                </p>
                <Badge variant="outline" className="text-[10px]">{pkg.fileCount}</Badge>
              </div>
              <div className="max-h-[calc(100dvh-380px)] min-h-[220px] overflow-auto py-1">
                <FileTree nodes={tree} selectedPath={selectedFile?.path || null} onSelect={setSelectedFile} />
              </div>
              <p className="border-t px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                Latest version ki files hain — kisi bhi file par tap karo, puri file khul jayegi
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* full-screen file viewer (bottom sheet) — latest + purane versions dono */}
      <Sheet open={!!selectedFile} onOpenChange={(o) => { if (!o) setSelectedFile(null); }}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[92dvh] w-full max-w-[480px] flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetTitle className="sr-only">File viewer</SheetTitle>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-white/20" />
          {selectedFile && (
            <div className="min-h-0 flex-1">
              <FileViewer key={selectedFile.path} pkgId={pkg.id} node={selectedFile} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pkg.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Skill ki saari extracted files, {uploads.length} versions aur unki history delete ho jayegi.
              Ye undo nahi ho sakta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={deletePackage}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
