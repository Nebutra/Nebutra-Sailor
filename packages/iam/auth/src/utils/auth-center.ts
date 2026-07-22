/**
 * Login-center URL helpers (auth.nebutra.com).
 *
 * Auth center owns Better Auth baseURL + sign-in UI. Product apps are RPs:
 * they redirect unauthenticated users here with a safe returnTo.
 */

const LOCAL_AUTH_ORIGIN = "http://localhost:3101";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Public origin of the login center.
 * Prefer NEXT_PUBLIC_AUTH_URL, then BETTER_AUTH_URL, then app URL (legacy).
 */
export function getAuthCenterOrigin(env: Record<string, string | undefined> = process.env): string {
  const raw =
    env.NEXT_PUBLIC_AUTH_URL?.trim() ||
    env.BETTER_AUTH_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    LOCAL_AUTH_ORIGIN;
  return stripTrailingSlash(raw);
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
  hosts.add("app.nebutra.com");
  hosts.add("auth.nebutra.com");
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
