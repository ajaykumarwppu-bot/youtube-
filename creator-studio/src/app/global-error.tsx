"use client";

// Root-level error boundary (root layout tak crash hone par). Ye apna html/body
// render karta hai — Tailwind available nahi hota, isliye inline styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#000",
          color: "#fff",
          fontFamily: "ui-monospace, monospace",
          padding: 24,
          margin: 0,
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12, fontFamily: "sans-serif" }}>
          Studio UI crash hua
        </h2>
        <pre
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "#fca5a5",
            maxHeight: 300,
            overflow: "auto",
            margin: 0,
          }}
        >
          {error.message || "Unknown error"}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: 16,
            padding: "10px 18px",
            background: "#fff",
            color: "#000",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </body>
    </html>
  );
}
