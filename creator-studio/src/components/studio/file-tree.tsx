"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, File, FileCode, FileImage, FileText,
  Folder, FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/studio/types";

function iconElFor(node: FileNode) {
  const name = node.name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|ico|svg)$/.test(name)) {
    return <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (/\.(md|markdown|txt)$/.test(name)) {
    return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  if (/\.(js|mjs|cjs|ts|tsx|jsx|json|css|html|xml|ya?ml|sh|py|go|kt|java)$/.test(name)) {
    return <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (n: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  if (node.type === "dir") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm text-foreground/90 hover:bg-secondary active:bg-secondary/70"
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          {open ? <FolderOpen className="h-4 w-4 shrink-0 text-primary/80" /> : <Folder className="h-4 w-4 shrink-0 text-primary/80" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map((c) => (
          <TreeNode key={c.path} node={c} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-left text-sm active:bg-secondary",
        selectedPath === node.path ? "bg-secondary font-medium text-foreground" : "text-foreground/80"
      )}
      style={{ paddingLeft: `${depth * 14 + 24}px` }}
    >
      {iconElFor(node)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (n: FileNode) => void;
}) {
  return (
    <div className="py-1">
      {nodes.map((n) => (
        <TreeNode key={n.path} node={n} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}
