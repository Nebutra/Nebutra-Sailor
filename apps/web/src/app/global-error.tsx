"use client";

/**
 * global-error.tsx — root-level Next.js error boundary.
 *
 * Renders outside the root layout: no globals.css, no design tokens, no @nebutra/ui.
 * Inline styles only. light-dark() handles theme without media queries.
 * Hardcoded hex is permitted here per CLAUDE.md "Exception: global-error.tsx".
 */

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const SYSTEM_STACK =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK = 'ui-monospace, "SF Mono", Menlo, Consolas, "Roboto Mono", monospace';

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SYSTEM_STACK,
          background: "light-dark(#fafafa, #0a0a0a)",
          color: "light-dark(#0a0a0a, #fafafa)",
          colorScheme: "light dark",
          padding: "24px",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <main role="alert" style={{ width: "100%", maxWidth: 480 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: 16,
              fontFamily: MONO_STACK,
            }}
          >
            Error 500
          </div>

          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 36px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: "0 0 12px",
            }}
          >
            Something went wrong.
          </h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              opacity: 0.7,
              margin: "0 0 32px",
              maxWidth: "52ch",
            }}
          >
            An unexpected error occurred. Our team has been notified automatically. You can try
            again, or return to the dashboard.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)",
                color: "#ffffff",
                border: 0,
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "inherit",
                textDecoration: "none",
                border: "1px solid light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.16))",
                background: "transparent",
              }}
            >
              Return home
            </a>
          </div>

          <div
            style={{
              marginTop: 40,
              paddingTop: 20,
              borderTop: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.1))",
              fontSize: 12,
              fontFamily: MONO_STACK,
              opacity: 0.55,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span>{error.digest ? `Error ID: ${error.digest}` : "Error ID: unavailable"}</span>
            <a
              href="https://status.nebutra.com"
              style={{ color: "inherit", textDecoration: "none", opacity: 0.8 }}
            >
              status.nebutra.com →
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
