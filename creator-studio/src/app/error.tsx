"use client";

// Route-level error boundary — React render crash par black screen ke bajaye
// error ka poora text dikhta hai (reset = component tree dobara render karo).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black p-6 text-foreground">
      <div className="w-full max-w-md space-y-3 text-center">
        <h2 className="text-base font-bold">Studio UI me error aaya</h2>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-red-950/40 p-3 text-left text-[11px] leading-relaxed text-red-300">
          {error.message || "Unknown render error"}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <button
          onClick={reset}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black active:opacity-80"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
