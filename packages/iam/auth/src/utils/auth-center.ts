/**
 * Login-center URL helpers (auth.nebutra.com).
 *
 * Auth center owns Better Auth baseURL + sign-in UI. Product apps are RPs:
 * they redirect unauthenticated users here with a safe returnTo.
 */

const LOCAL_AUTH_ORIGIN = "http://localhost:3101";
const PRODUCTION_AUTH_ORIGIN = "https://auth.nebutra.com";

/**
 * Default relative path after successful sign-in on the product app
 * (`app.nebutra.com`).
 *
 * Product home is `/workspace` (Startup OS when the prototype is on,
 * Connectors otherwise). Do **not** use `/dashboard` — that route is only an
 * alias, and sending OAuth there used to 404 and look like "login did nothing".
 */
export const DEFAULT_POST_LOGIN_PATH = "/workspace" as const;

/** Absolute post-login URL for a product origin (no trailing slash). */
export function buildDefaultPostLoginUrl(appOrigin: string): string {
  const origin = appOrigin.replace(/\/$/, "");
  return `${origin}${DEFAULT_POST_LOGIN_PATH}`;
}

function stripTrailingSlash(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47 /* / */) end -= 1;
  return end === value.length ? value : value.slice(0, end);
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const host = new URL(origin.includes("://") ? origin : `https://${origin}`).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return /localhost|127\.0\.0\.1/.test(origin);
  }
}

/** True when the browser is on a first-party Nebutra production host. */
function isBrowserOnNebutraProductHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "nebutra.com" || host.endsWith(".nebutra.com");
}

/**
 * Public origin of the login center.
 * Prefer NEXT_PUBLIC_AUTH_URL, then BETTER_AUTH_URL, then app URL (legacy).
 *
 * Safety: when a client bundle was built without NEXT_PUBLIC_AUTH_URL (common
 * on misconfigured ECS builds), the old fallback was localhost:3101 — which
 * breaks production Sign-in links. On *.nebutra.com we always force the
 * production auth center instead of localhost.
 */
export function getAuthCenterOrigin(env: Record<string, string | undefined> = process.env): string {
  const raw =
    env.NEXT_PUBLIC_AUTH_URL?.trim() ||
    env.BETTER_AUTH_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    LOCAL_AUTH_ORIGIN;

  let origin = stripTrailingSlash(raw);

  // Never send production users to a localhost login center.
  if (isBrowserOnNebutraProductHost() && isLocalhostOrigin(origin)) {
    origin = PRODUCTION_AUTH_ORIGIN;
  }

  // Also: if APP_URL was used as fallback and points at forge/router/app,
  // that is not the auth center — correct to production auth on product hosts.
  if (isBrowserOnNebutraProductHost()) {
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (host !== "auth.nebutra.com" && host.endsWith(".nebutra.com")) {
        // Prefer explicit env when it already targets auth.*; otherwise force.
        const explicit = env.NEXT_PUBLIC_AUTH_URL?.trim() || env.BETTER_AUTH_URL?.trim() || "";
        if (!explicit || isLocalhostOrigin(explicit)) {
          origin = PRODUCTION_AUTH_ORIGIN;
        } else {
          origin = stripTrailingSlash(explicit);
        }
      }
    } catch {
      origin = PRODUCTION_AUTH_ORIGIN;
    }
  }

  return origin;
}

/**
 * Hosts allowed as absolute returnTo targets after login.
 * Always includes auth center + app; extend via AUTH_RETURN_ALLOWED_HOSTS.
 */
export function getAuthReturnAllowedHosts(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const hosts = new Set<string>();

  for (const raw of [
    env.NEXT_PUBLIC_AUTH_URL,
    env.BETTER_AUTH_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.NEXT_PUBLIC_SITE_URL,
    env.NEBUTRA_LANDING_ORIGIN,
    ...(env.AUTH_RETURN_ALLOWED_HOSTS?.split(",") ?? []),
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      hosts.add(new URL(value.includes("://") ? value : `https://${value}`).host.toLowerCase());
    } catch {
      // ignore malformed
    }
  }

  // Multi-app defaults for local + production
  hosts.add("localhost:3000");
  hosts.add("localhost:3001");
  hosts.add("localhost:3101");
  hosts.add("localhost:3100");
  hosts.add("localhost:3106");
  hosts.add("localhost:3105");
  hosts.add("localhost:3120");
  hosts.add("app.nebutra.com");
  hosts.add("auth.nebutra.com");
  hosts.add("router.nebutra.com");
  hosts.add("forge.nebutra.com");
  hosts.add("kuanlan.nebutra.com");
  hosts.add("nebutra.com");

  return Array.from(hosts);
}

export function buildAuthCenterSignInUrl(
  returnTo?: string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  const origin = getAuthCenterOrigin(env);
  const url = new URL("/sign-in", `${origin}/`);
  if (returnTo && returnTo.trim()) {
    url.searchParams.set("returnTo", returnTo.trim());
  }
  return url.toString();
}

export function buildAuthCenterSignUpUrl(
  returnTo?: string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  const origin = getAuthCenterOrigin(env);
  const url = new URL("/sign-up", `${origin}/`);
  if (returnTo && returnTo.trim()) {
    url.searchParams.set("returnTo", returnTo.trim());
  }
  return url.toString();
}
