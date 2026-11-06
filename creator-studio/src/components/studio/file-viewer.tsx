"use client";

import { useEffect, useState } from "react";
import { Download, FileQuestion, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/studio/markdown";
import { apiFetch, downloadResponse, resolveLocalUrl } from "@/lib/studio/api-client";
import type { FileContentResult, FileNode } from "@/lib/studio/types";

interface ViewerState {
  loading: boolean;
  data?: FileContentResult;
  error?: string;
}

export function FileViewer({ pkgId, node }: { pkgId: string; node: FileNode }) {
  // parent remounts this component per file (key=node.path), so initial state is per-file
  const [state, setState] = useState<ViewerState>({ loading: true });
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await apiFetch(`/api/cs/packages/${pkgId}/file?path=${encodeURIComponent(node.path)}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Cannot read file");
        if (alive) setState({ loading: false, data: j as FileContentResult });
      } catch (e) {
        if (alive) setState({ loading: false, error: e instanceof Error ? e.message : "Cannot read file" });
      }
    };
    load();
    return () => { alive = false; };
  }, [pkgId, node.path]);

  // image preview — raw bytes ko object URL me resolve karo (static engine)
  useEffect(() => {
    let alive = true;
    const data = state.data;
    if (!data?.isImage) { setImgUrl(null); return; }
    const marker = data.content?.startsWith("local-raw:")
      ? data.content
      : `local-raw:/api/cs/packages/${pkgId}/raw?path=${encodeURIComponent(node.path)}`;
    resolveLocalUrl(marker).then((url) => { if (alive) setImgUrl(url); });
    return () => { alive = false; };
  }, [pkgId, node.path, state.data]);

  if (state.loading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <FileQuestion className="h-8 w-8" />
        <p className="text-sm">{state.error}</p>
      </div>
    );
  }
  const data = state.data;
  if (!data) return null;

  const downloadName = node.name || "file";
  const startDownload = async () => {
    try {
      const r = await apiFetch(`/api/cs/packages/${pkgId}/file?download=1&path=${encodeURIComponent(node.path)}`);
      await downloadResponse(r, downloadName);
    } catch { /* user visible nahi — chhota feature */ }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b py-2.5 pl-4 pr-14">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{node.path}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(data.size)}
            {data.truncated && " · truncated preview (512 KB limit)"}
            {!data.isText && !data.isImage && " · binary file"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={startDownload}>
          <Download className="mr-1.5 h-4 w-4" /> Download
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {data.isImage ? (
          <div className="flex items-center justify-center rounded-lg border bg-[#181818] p-6">
            <img
              src={imgUrl ?? undefined}
              alt={node.name}
              className="max-h-[420px] max-w-full rounded object-contain"
            />
          </div>
        ) : data.isText && node.name.toLowerCase().endsWith(".md") ? (
          <Markdown content={stripFrontmatter(data.content || "")} />
        ) : data.isText ? (
          <pre className="overflow-x-auto rounded-lg border bg-[#181818] p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
            {data.content}
          </pre>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-muted-foreground">
            <FileQuestion className="h-10 w-10" />
            <p className="text-sm">Binary file — preview available nahi hai</p>
            <Button variant="secondary" size="sm" onClick={startDownload}>Download to view</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// hide YAML frontmatter in markdown preview (editor still shows it raw)
function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}
