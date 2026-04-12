"use client";

/**
 * global-error.tsx — root-level Next.js error boundary.
 *
 * Catches catastrophic errors that bubble past all segment-level error.tsx
 * boundaries (RSC errors, layout crashes, hydration mismatches).
 * Must render its own <html> and <body> since the root layout is bypassed.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "var(--background, #09090b)",
          color: "var(--foreground, #fafafa)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480, padding: "2rem" }}>
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              background: "var(--brand-gradient, linear-gradient(135deg, #0033FE, #0BF1C3))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Nebutra
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--neutral-11, #a1a1aa)", marginBottom: "2rem", lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified automatically.
            {error.digest && (
              <span
                style={{
                  display: "block",
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              >
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "var(--brand-gradient, linear-gradient(135deg, #0033FE, #0BF1C3))",
              color: "var(--neutral-1, #ffffff)",
              border: "none",
              borderRadius: "8px",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
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
