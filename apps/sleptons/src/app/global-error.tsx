"use client";

// @primitive-exempt: renders in place of the root layout, so the Button primitive's styles are not loaded.

import { useEffect } from "react";

/**
 * The root layout itself threw, so this renders in its place: no app CSS, no
 * tokens. CSS system colours (Canvas, CanvasText, ButtonFace…) follow the OS
 * light/dark setting without a hard-coded palette.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "Canvas",
          color: "CanvasText",
          colorScheme: "light dark",
        }}
      >
        <main role="alert" style={{ maxWidth: "30rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>This page didn't load.</h1>
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.6 }}>
            Something went wrong on our side. Try again; it usually works the second time.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid ButtonBorder",
              background: "ButtonFace",
              color: "ButtonText",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontFamily: "ui-monospace, monospace", opacity: 0.7 }}>
              Error ID: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
