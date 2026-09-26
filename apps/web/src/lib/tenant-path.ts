/**
 * Path-scoped tenancy: the workspace slug in the URL is the tenant, the way
 * `vercel.com/<team>` works.
 *
 * Before this, tenancy lived in a cookie and the slug was decoration. The
 * onboarding step promised `<app host>/<slug>` and that URL 404'd —
 * nothing in the router ever looked at a slug. Worse, one cookie means one
 * active tenant per browser: two tabs on two workspaces silently fought over
 * it, so a click in one could route the other's next request to the wrong
 * tenant. A path carries its own tenant and two tabs cannot collide.
 */

/**
 * Segments a workspace slug may never take, because a real route already
 * answers there and `/<slug>/…` would be ambiguous with `/<route>/…`.
 *
 * Kept as data rather than derived at runtime — this is consulted on the
 * request path and in a client-side form, neither of which can read the app
 * directory. `tenant-path.test.ts` asserts it still covers every top-level
 * route, so adding a route without adding it here fails there rather than
 * silently letting a workspace shadow it.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // (app) routes
  "admin",
  "atelier",
  "audit",
  "billing",
  "checkout",
  "checkout-return",
  "choose-plan",
  "cofounder",
  "dashboard",
  "feature-flags",
  "integrations",
  "notifications",
  "organization-invitation",
  "reel",
  "settings",
  "startup-os",
  "tenants",
  "theme-playground",
  "usage",
  "workspace",
  // (auth) routes — the group a hand-written list is most likely to miss,
  // which is exactly what tenant-path.test.ts caught on its first run.
  "desktop-auth",
  "email-change-confirm",
  "forgot-password",
  "reset-password",
  "sign-in",
  "sign-up",
  "verify-email",
  // root routes and framework-owned prefixes
  "api",
  "demo",
  "login",
  "onboarding",
  "providers",
  "select-org",
  "signup",
  "_next",
  "static",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "well-known",
]);

/** Shape a slug must satisfy: lowercase, no leading/trailing dash, 3-48 chars. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

export type SlugRejection = "reserved" | "malformed";

/**
 * Why a slug cannot be used, or null when it can.
 *
 * Reserved is checked first: "settings" is well-formed and still unusable, and
 * telling someone their input is malformed when it is not sends them to fix
 * the wrong thing.
 */
export function rejectSlug(slug: string): SlugRejection | null {
  const candidate = slug.trim().toLowerCase();
  if (RESERVED_SLUGS.has(candidate)) return "reserved";
  if (!SLUG_PATTERN.test(candidate)) return "malformed";
  return null;
}

export interface TenantCandidate {
  id: string;
  slug: string;
}

/**
 * Resolve a URL slug against the organizations this user belongs to.
 *
 * Deliberately scoped to the caller's own memberships rather than a global
 * lookup: a slug the user has no access to is simply not found, so the route
 * 404s and never reveals whether that workspace exists. Membership is the
 * lookup, not a second check that could be forgotten.
 */
export function resolveTenantSlug(
  slug: string | undefined,
  memberships: readonly TenantCandidate[],
): TenantCandidate | null {
  if (!slug) return null;
  const candidate = slug.trim().toLowerCase();
  return memberships.find((entry) => entry.slug.toLowerCase() === candidate) ?? null;
}

/** Prefix an in-app path with its tenant: ("acme", "/settings") → "/acme/settings". */
export function tenantPath(slug: string, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `/${slug}${suffix === "/" ? "" : suffix}`;
}

/**
 * Constrain a `next=` parameter to an in-app destination.
 *
 * `/api/tenant/enter` takes where to go after switching workspace, and a
 * redirect target that arrived over the wire is an open redirect unless it is
 * checked. `//evil.com` is the case a `startsWith("/")` test alone lets
 * through: a browser reads it as protocol-relative and leaves the site.
 *
 * Returns the fallback rather than throwing — a bad `next` should still land
 * the user somewhere sensible, not on an error page.
 */
export function safeInternalPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  // Protocol-relative, plus the backslash spelling browsers normalise to it.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
