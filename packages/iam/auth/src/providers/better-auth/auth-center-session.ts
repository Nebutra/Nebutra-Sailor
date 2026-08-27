/**
 * Product apps (app. / forge. / router.) are RPs. Sessions are minted on
 * auth.nebutra.com. Validating them through a second Better Auth + Prisma
 * on the product host fails when that host's DATABASE_URL or
 * BETTER_AUTH_SECRET drifts from the login center — OAuth "succeeds" and
 * requireAuth immediately bounces back to /sign-in.
 *
 * Ask the auth center, forwarding the browser cookies. The center unseals
 * with the secret that signed them and reads the session row it wrote.
 */

export function shouldResolveSessionAtAuthCenter(
  requestUrl: string,
  authBaseUrl: string | undefined,
): boolean {
  const base = authBaseUrl?.trim();
  if (!base) return false;
  try {
    return new URL(requestUrl).host !== new URL(base).host;
  } catch {
    return false;
  }
}

export function parseAuthCenterSessionPayload(
  data: unknown,
): { session: Record<string, unknown>; user: Record<string, unknown> } | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const session =
    record.session && typeof record.session === "object" && !Array.isArray(record.session)
      ? (record.session as Record<string, unknown>)
      : null;
  if (!session) return null;
  const user =
    record.user && typeof record.user === "object" && !Array.isArray(record.user)
      ? (record.user as Record<string, unknown>)
      : {};
  return { session, user };
}

export async function fetchAuthCenterSession(
  request: Request,
  authBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ session: Record<string, unknown>; user: Record<string, unknown> } | null> {
  const origin = authBaseUrl.replace(/\/$/, "");
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.trim()) return null;

  const headers = new Headers();
  headers.set("cookie", cookie);
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const res = await fetchImpl(`${origin}/api/auth/get-session`, {
    method: "GET",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (res.status >= 500) {
    throw new Error(`Auth center get-session failed (${res.status})`);
  }
  if (!res.ok) return null;

  const data: unknown = await res.json().catch(() => null);
  return parseAuthCenterSessionPayload(data);
}
