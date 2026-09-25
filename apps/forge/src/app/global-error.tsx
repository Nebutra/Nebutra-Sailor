// @brand-exempt: global-error.tsx renders OUTSIDE the root layout, so no stylesheet and no CSS
// custom properties are available. Colours come from @nebutra/tokens/values as literal strings.

"use client";

import { tokenColor } from "@nebutra/tokens/values";

/**
 * Minimal global-error — must not depend on root layout / next-intl.
 * Inline styles: renders outside the token tree, so values are read as strings.
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
          background: tokenColor("--background", "dark"),
          color: tokenColor("--foreground", "dark"),
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h1>
          <p
            style={{
              fontSize: 14,
              color: tokenColor("--muted-foreground", "dark"),
              margin: "0 0 20px",
            }}
          >
            {error.digest ? `Error id: ${error.digest}` : "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "10px 16px",
              background: tokenColor("--primary", "dark"),
              color: tokenColor("--primary-foreground", "dark"),
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
