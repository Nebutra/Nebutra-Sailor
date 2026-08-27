import { getBrandCookieDomain } from "@nebutra/brand/metadata-helpers";

/**
 * Cross-subdomain "session exists" hint for landing / other first-party sites.
 *
 * Non-sensitive presence flag only. Real session cookies stay HttpOnly on the
 * auth/app hosts. Must **not** set the hint on OAuth *start* responses (which
 * are 2xx under /sign-in/social or /oauth/*) — only when a real session cookie
 * is established or a sign-out clears one. Mirrors apps/web session-hint.
 */

export const SESSION_HINT_COOKIE = "nebutra_session_hint";
const SESSION_HINT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// better-auth `*.session_token`, NextAuth `*.session-token` / `authjs.session-token`
const SESSION_COOKIE_NAME_RE = /session[._-]token/i;

function resolveHintDomain(): string | undefined {
  const explicit = process.env.NEBUTRA_SESSION_HINT_DOMAIN?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return getBrandCookieDomain();
  return undefined;
}

function buildSessionHintCookie(value: "1" | "", maxAge: number): string {
  const parts = [`${SESSION_HINT_COOKIE}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  const domain = resolveHintDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function getSetCookieValues(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

/** Did this response establish or clear a real session cookie? */
export function inspectSessionCookie(response: Response): "set" | "cleared" | "none" {
  let result: "set" | "cleared" | "none" = "none";
  for (const raw of getSetCookieValues(response)) {
    const semi = raw.indexOf(";");
    const pair = semi >= 0 ? raw.slice(0, semi) : raw;
    const eq = pair.indexOf("=");
    const name = (eq >= 0 ? pair.slice(0, eq) : pair).trim();
    if (!SESSION_COOKIE_NAME_RE.test(name)) continue;
    const value = eq >= 0 ? pair.slice(eq + 1).trim() : "";
    const attrs = (semi >= 0 ? raw.slice(semi + 1) : "").toLowerCase();
    const cleared =
      value === "" || /max-age=0(?:\b|;|$)/.test(attrs) || attrs.includes("max-age=-");
    if (cleared) return "cleared";
    result = "set";
  }
  return result;
}

function isSignOutPath(path: string): boolean {
  return path.endsWith("/sign-out") || path.includes("/sign-out/");
}

/**
 * Append or clear the non-sensitive session-hint cookie based on the auth
 * response. Primary signal: real session cookie set/cleared (covers OAuth
 * callback 3xx). Never set the hint merely because the path contains "sign-in"
 * — OAuth start would falsely mark the user signed-in on marketing.
 */
export function applySessionHint(response: Response, path: string, _status: number): Response {
  const sessionCookie = inspectSessionCookie(response);
  const headers = new Headers(response.headers);

  if (sessionCookie === "cleared" || isSignOutPath(path)) {
    headers.append("Set-Cookie", buildSessionHintCookie("", 0));
  } else if (sessionCookie === "set") {
    headers.append("Set-Cookie", buildSessionHintCookie("1", SESSION_HINT_MAX_AGE));
  }
  // else: leave cookies alone (OAuth start, failed callbacks, health, etc.)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
