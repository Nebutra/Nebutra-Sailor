import { cors } from "hono/cors";
import { DOMAINS, env } from "../../config/env.js";

/**
 * CORS allowlist for the public docs-only routes (chat, feedback).
 *
 * Deliberately NOT the app's global `corsOrigins` list in app.ts: that list
 * includes the credentialed app/landing/studio origins (`credentials: true`),
 * and these routes are anonymous, public, rate-limited-by-IP endpoints called
 * cross-origin from the statically-exported docs bundle (a separate Workers
 * deployment — see apps/sailor-docs/wrangler.jsonc). Reusing the wide
 * allowlist would let any of those credentialed origins piggyback on it for
 * no reason; a narrower, credential-less list is the correct scope.
 */
/** A browser `Origin` header is scheme+host+port only — strip DOMAINS.docs's `/docs` path. */
function toOrigin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function docsCorsOrigins(): string[] {
  return [
    toOrigin(DOMAINS.docs),
    // The public docs URL is a path (`<landing>/docs`) fronted by the landing
    // proxy (apps/landing/src/lib/docs-routing.ts) — same-origin as landing
    // itself once mounted, but the docs bundle also calls this endpoint
    // directly from its own Workers origin in preview/local builds.
    toOrigin(env.DOCS_ORIGIN),
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3004", "http://localhost:8788", "http://localhost:8791"]
      : []),
    ...(env.DOCS_CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
  ].filter((origin): origin is string => Boolean(origin));
}

/** No credentials: these routes take no cookies/auth, only a JSON body. */
export const docsCors = () => cors({ origin: docsCorsOrigins(), credentials: false });
