import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext Cloudflare adapter for the docs origin served at <site>/docs.
 *
 * `defineCloudflareConfig({})`'s default `incrementalCache` is the literal
 * string "dummy" — not an in-memory cache, a no-op. `get()` always returns
 * `null`, so every prerendered/SSG page (all 228 docs routes) was re-rendered
 * from scratch, on every request, by the Worker: full MDX compile + the docs
 * component tree, for a page that `next build` had already rendered once at
 * build time into `.open-next/cache` (never deployed anywhere with the dummy
 * cache — 141 MB of build output, discarded). That per-request render cost
 * intermittently tripped Cloudflare's Worker CPU/resource ceiling — surfaced
 * to callers as HTTP 503 with body `error code: 1102` ("Worker exceeded
 * resource limits"), landing on whichever isolate/PoP handled the request
 * (so the SAME url flipped between 200/503 request to request). The outer
 * layout had usually already started streaming by then, which is why the 503
 * still carried docs-shell HTML.
 *
 * `static-assets-incremental-cache` reads prerendered pages back out of the
 * `ASSETS` binding already declared in wrangler.jsonc — no new Cloudflare
 * resource (R2/KV/D1) needed, matching the "workers_dev only, minimal infra"
 * shape of this deploy. It is read-only (no revalidation), which is exactly
 * right for a docs site that redeploys on every content change instead of
 * revalidating at runtime. The deploy workflow's `opennextjs-cloudflare
 * populateCache local` step copies `.open-next/cache` into
 * `.open-next/assets/cdn-cgi/_next_cache` so this cache can actually find
 * what `next build` already rendered.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
