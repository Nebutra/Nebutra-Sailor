"use client";

/**
 * Minimal global-error — must not depend on root layout / next-intl.
 * Hardcoded styles OK: renders outside the token tree (see Claude.md).
 */
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
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "#a3a3a3", margin: "0 0 20px" }}>
            {error.digest ? `Error id: ${error.digest}` : "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "10px 16px",
              background: "#0033FE",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
