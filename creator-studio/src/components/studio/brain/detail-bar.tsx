"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Full-screen detail pages ka shared top bar (app-style back navigation)
export function DetailBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="z-20 flex shrink-0 items-center gap-1 border-b bg-background/95 px-2 py-2 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" className="h-10 w-10 shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
