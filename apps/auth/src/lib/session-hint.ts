/**
 * Cross-subdomain "session exists" hint for landing / other first-party sites.
 * Mirrors apps/web session-hint: non-sensitive presence cookie only.
 */

export const SESSION_HINT_COOKIE = "nebutra_session_hint";

function resolveHintDomain(): string | undefined {
  const explicit = process.env.NEBUTRA_SESSION_HINT_DOMAIN?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return ".nebutra.com";
  return undefined;
}

export function applySessionHint(response: Response, path: string, status: number): Response {
  const success = status >= 200 && status < 400;
  const isAuthPath =
    path.includes("/sign-in") ||
    path.includes("/sign-up") ||
    path.includes("/callback") ||
    path.includes("/sign-out") ||
    path.endsWith("/session");

  if (!isAuthPath) return response;

  const headers = new Headers(response.headers);
  const domain = resolveHintDomain();
  const domainPart = domain ? `; Domain=${domain}` : "";

  if (path.includes("/sign-out")) {
    headers.append(
      "Set-Cookie",
      `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${domainPart}`,
    );
  } else if (success && status !== 204) {
    headers.append(
      "Set-Cookie",
      `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax${domainPart}`,
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
