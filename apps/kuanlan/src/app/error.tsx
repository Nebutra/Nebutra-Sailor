"use client";

import { useEffect } from "react";

/**
 * A route threw. The root layout still stands, so this page keeps the brand.
 *
 * `reset` re-renders the segment rather than reloading, which is what a reader
 * wants when the shot itself was fine and the page around it was not.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server already logged this with its step and timing. This is the
    // browser half, and the digest is what ties the two together.
    console.error("[kuanlan] route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="shell">
      <main className="page-main">
        <h1>这一步没走通。</h1>
        <p className="lede">观澜这边出了点问题，不是你的照片的问题。再试一次通常就好了。</p>
        <div className="hero-actions">
          <button type="button" className="pill pill-ink" onClick={reset}>
            再试一次
          </button>
          <a className="pill pill-ghost" href="/">
            回首页
          </a>
        </div>
        {error.digest ? <p className="note">编号 {error.digest}</p> : null}
      </main>
    </div>
  );
}
