"use client";

// @primitive-exempt: Pebble's marketing site does not depend on @nebutra/ui; .btn is its own button style.

import { useEffect } from "react";

/**
 * A page threw. The site header and footer still stand; `reset` re-renders
 * the page in place rather than reloading.
 */
export default function RouteError({
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
    <main>
      <section className="hero" role="alert">
        <div>
          <p className="eyebrow">Error</p>
          <h1>This page didn't load.</h1>
          <p className="lead">
            Something went wrong on our side. Try again; it usually works the second time.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={reset}>
              Try again
            </button>
            <a className="btn" href="/">
              Go home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
