/**
 * The zone's basePath, available at runtime (client and server).
 *
 * `next.config.ts`'s `basePath` only rewrites URLs Next itself generates
 * (`next/link`, `next/navigation`, framework-emitted asset URLs). A raw
 * string handed to `fetch()` — the static search index, the "copy as
 * Markdown" button — is NOT basePath-aware; Next does not touch it. Both of
 * those already built their URL as a hand-written absolute string (`/api/
 * search`, `/llms.mdx/docs/...`), so under this zone's `basePath: "/docs"`
 * they were requesting `<site>/api/search` instead of `<site>/docs/api/
 * search`. `NEXT_PUBLIC_DOCS_BASE_PATH` is injected by next.config.ts's
 * `env` field so both server and client bundles see the same value the
 * config actually used to build.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? "";
