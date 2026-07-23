/**
 * Lightweight route-level loading skeleton.
 *
 * Rendered by each long-tail dynamic route's `loading.tsx` so that navigating
 * to an on-demand (non-prebuilt locale) page shows immediate feedback instead
 * of a blank hard wait for the server — the recommended Next.js App Router
 * pattern for dynamic routes (instant navigation + streaming).
 *
 * Intentionally dependency-free (no @nebutra/ui barrel, no client JS) so the
 * per-route loading chunk stays tiny and never re-introduces build-time
 * module-graph weight. Tokens come from @nebutra/tokens; `animate-pulse` is
 * disabled under prefers-reduced-motion by the global rule in globals.css.
 */
export default function RouteSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] animate-pulse px-4 py-16 md:px-6"
      aria-busy="true"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-2/3 rounded-md bg-muted" />
      <div className="mt-4 h-5 w-1/2 rounded-md bg-muted" />
      <div className="mt-10 grid gap-4">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-11/12 rounded bg-muted" />
        <div className="h-4 w-10/12 rounded bg-muted" />
        <div className="h-4 w-9/12 rounded bg-muted" />
      </div>
    </div>
  );
}
