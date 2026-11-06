"use client";

// UploadButton — phone-first compact upload button (bade drag-drop box ki jagah)
// - bina packageId: NAYA skill upload hota hai (file picker khulta hai)
// - packageId ke saath: us skill me NAYA VERSION add hota hai (version control)

import { useCallback, useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { PackageEntry } from "@/lib/studio/types";

interface Props {
  packageId?: string; // diya to naya version upload hoga
  label?: string;
  className?: string; // size/style override
  onUploaded: (pkg: PackageEntry, wasVersion: boolean) => void;
}

export function UploadButton({ packageId, label, className, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      for (const file of Array.from(files)) {
        const t = toast.loading(packageId ? `Version upload: ${file.name}…` : `Uploading ${file.name}…`);
        try {
          const fd = new FormData();
          fd.append("file", file);
          if (packageId) fd.append("packageId", packageId);
          const res = await fetch("/api/cs/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed");
          const pkg = data.package as PackageEntry;
          const wasVersion = !!data.updatedVersion;
          toast.success(
            wasVersion
              ? `${pkg.name} — Version ${pkg.uploads[pkg.uploads.length - 1].n} add ho gaya ✓`
              : `${pkg.name} — skill add ho gaya ✓ (${pkg.fileCount} files)`,
            { id: t, description: pkg.description.slice(0, 120) }
          );
          onUploaded(pkg, wasVersion);
        } catch (err) {
          toast.error(`${file.name} failed`, {
            id: t,
            description: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
      setBusy(false);
    },
    [packageId, onUploaded]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple={!packageId}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={label ?? (packageId ? "Upload new version" : "Upload skill")}
        className={
          className ??
          "flex h-full min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl bg-primary text-primary-foreground transition-colors active:bg-primary/85 disabled:opacity-60"
        }
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        <span className="text-[11px] font-semibold leading-none">
          {busy ? "Uploading…" : (label ?? (packageId ? "New version" : "Upload"))}
        </span>
      </button>
    </>
  );
}
