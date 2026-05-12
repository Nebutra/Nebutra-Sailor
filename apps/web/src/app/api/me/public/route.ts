/**
 * GET /api/me/public — minimal cross-origin user info for marketing surfaces.
 *
 * Returns a tightly-scoped subset of the current user's profile that the
 * landing-page navbar uses to render an avatar dropdown for signed-in
 * visitors. CORS-allows `NEXT_PUBLIC_SITE_URL` only.
 *
 * Privacy contract: this endpoint NEVER returns sensitive data — no user
 * IDs, no plan / billing, no roles, no audit context. If a field below
 * starts to look risky, gate it behind a feature flag or remove it.
 *
 * Response (200, authed):
 *   {
 *     name: string,
 *     email: string,
 *     avatarUrl: string | null,
 *     activeOrganization: { name: string; slug: string } | null
 *   }
 *
 * Response (401, anon): empty body. Landing-page falls back to the
 * Sign-In / Get-Sailed CTA.
 *
 * Caching: always `Cache-Control: private, no-store`. The response is
 * user-specific and must never be edge-cached.
 */

import { getAuth } from "@/lib/auth";
import { env } from "@/lib/env";

const ALLOWED_ORIGIN = (() => {
  // CORS allowlist is the LANDING origin (nebutra.com), NOT
  // NEXT_PUBLIC_SITE_URL — that variable in apps/web means "this web app's
  // own URL" (app.nebutra.com), which is same-origin and doesn't need CORS.
  // Unset in dev/preview → no Origin echoed → browser blocks any cross-origin
  // probe by default. Production: NEBUTRA_LANDING_ORIGIN=https://nebutra.com.
  const raw = env.NEBUTRA_LANDING_ORIGIN;
  return raw ? raw.replace(/\/+$/, "") : null;
})();

function buildCorsHeaders(origin: string | null): HeadersInit {
  // Only echo back the origin if it matches our allowlist — never reflect
  // arbitrary Origin headers (would defeat the CORS check). If
  // NEBUTRA_LANDING_ORIGIN is unset (dev/preview), no headers are emitted.
  if (!ALLOWED_ORIGIN) return {};
  const allowed = origin && origin.replace(/\/+$/, "") === ALLOWED_ORIGIN ? origin : null;
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

function withSafeHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get("origin");
  const cors = buildCorsHeaders(origin);
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function OPTIONS(request: Request): Promise<Response> {
  return withSafeHeaders(new Response(null, { status: 204 }), request);
}

export async function GET(request: Request): Promise<Response> {
  const auth = await getAuth(request);

  if (!auth.userId) {
    return withSafeHeaders(
      new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      request,
    );
  }

  // Pull the minimal user + org slice. `getAuth` already hydrates the
  // canonical session via @nebutra/auth — we just re-fetch the user record
  // here to surface display name + email + avatar URL.
  let name = "";
  let email = "";
  let avatarUrl: string | null = null;
  let activeOrganization: { name: string; slug: string } | null = null;

  try {
    const { createAuth } = await import("@nebutra/auth/server");
    const { getConfiguredAuthProvider } = await import("@nebutra/auth");
    const provider = getConfiguredAuthProvider();
    const sdk = await createAuth({ provider });
    const user = await sdk.getUser(auth.userId);

    if (user) {
      name = user.name ?? "";
      email = user.email ?? "";
      avatarUrl = user.imageUrl ?? null;
    }

    if (auth.orgId && sdk.organizations) {
      // Best-effort active-org name. If list() fails (provider can't serve
      // orgs, network error, etc.) we degrade to null — the avatar still
      // renders, just without an org subtitle.
      try {
        const orgs = await sdk.organizations.list(auth.userId);
        const match = orgs.find((o) => o.id === auth.orgId);
        if (match) activeOrganization = { name: match.name, slug: match.slug };
      } catch {
        // Swallow — degraded read is acceptable for an avatar header.
      }
    }
  } catch (error) {
    // Total failure: return 401 so the marketing site shows the public CTA
    // instead of a broken half-loaded avatar. Real errors are server-side
    // and ops-visible via logger; this branch only matters for the UI fallback.
    const { logger } = await import("@nebutra/logger");
    logger.error("[me/public] failed to resolve user", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return withSafeHeaders(
      new Response(JSON.stringify({ error: "Unable to resolve user" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
      request,
    );
  }

  return withSafeHeaders(
    new Response(JSON.stringify({ name, email, avatarUrl, activeOrganization }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
    request,
  );
}
