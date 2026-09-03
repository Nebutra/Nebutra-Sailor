"use client";

/**
 * The root layout itself failed, so this renders in its place — no
 * `globals.css`, no Cosmos skin, no Fraunces.
 *
 * Every value below is therefore written out rather than taken from a token,
 * which is the one place this codebase allows it. They are the real Cosmos
 * values (Linen Canvas, Ink Black, Stone, the single 16px radius), and the type
 * falls back to Georgia — the substitute the design reference names for exactly
 * this case. No webfont link: an error page should not wait on a network.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#f7f5f3",
          color: "#0d0d0d",
          fontFamily: "Georgia, 'Times New Roman', ui-serif, serif",
          letterSpacing: "-0.011em",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "33px",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
            }}
          >
            观澜这一刻没能站起来。
          </h1>
          <p style={{ margin: "0 0 28px", fontSize: "16px", color: "#6e6a69" }}>
            重新加载通常就好了。如果一直这样，稍后再来。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "36px",
              padding: "0 16px",
              border: "1px solid transparent",
              borderRadius: "16px",
              background: "#0d0d0d",
              color: "#f7f5f3",
              font: "inherit",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            重新加载
          </button>
          {error.digest ? (
            <p style={{ marginTop: "24px", fontSize: "13px", color: "#9a9796" }}>
              编号 {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
