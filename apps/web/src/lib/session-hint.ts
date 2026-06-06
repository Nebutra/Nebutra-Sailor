/**
 * Cross-subdomain session-hint cookie.
 *
 * Non-sensitive flag the landing page (`nebutra.com`) reads to redirect
 * signed-in users into the app (`app.nebutra.com`). Encodes only the
 * boolean "session exists somewhere on .nebutra.com"; the real HttpOnly
 * session cookie stays host-scoped on the web app for defense-in-depth.
 *
 * Pattern: a wide non-sensitive flag cookie pairs with a narrow sensitive
 * session cookie.
 *
 * Wiring:
 *  - `apps/web/src/app/api/auth/[...all]/route.ts` calls `applySessionHint`
 *    on every response; success paths under /sign-in, /sign-up, /callback
 *    set it, /sign-out clears it.
 *  - `apps/landing-page/src/proxy.ts` reads `nebutra_session_hint` and
 *    redirects root + bare-locale roots to `${NEXT_PUBLIC_APP_URL}/dashboard`
 *    when the value is `"1"`.
 *
 * Dev/preview: `NEBUTRA_SESSION_HINT_DOMAIN` is undefined, so the cookie
 * is host-scoped and won't traverse to a separate localhost port. Landing
 * page keeps its normal behavior at root in dev — expected.
 */

export const SESSION_HINT_COOKIE = "nebutra_session_hint";
const SESSION_HINT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getCookieDomain(): string | undefined {
  return process.env.NEBUTRA_SESSION_HINT_DOMAIN;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function buildSessionHintCookie(value: "1" | "", maxAge: number): string {
  const parts = [`${SESSION_HINT_COOKIE}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  const domain = getCookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  if (isProduction()) parts.push("Secure");
  return parts.join("; ");
}

export function isSignInSuccessPath(path: string, status: number): boolean {
  if (status < 200 || status >= 300) return false;
  return (
    path.endsWith("/sign-in") ||
    path.includes("/sign-in/") ||
    path.endsWith("/sign-up") ||
    path.includes("/sign-up/") ||
    path.endsWith("/callback") ||
    path.includes("/callback/")
  );
}

export function isSignOutSuccessPath(path: string, status: number): boolean {
  if (status < 200 || status >= 300) return false;
  return path.endsWith("/sign-out") || path.includes("/sign-out");
}

// Real session cookie names across providers: better-auth `*.session_token`,
// NextAuth `*.session-token` / `authjs.session-token` (with optional __Secure-/
// __Host- prefixes). The hint cookie (`nebutra_session_hint`) deliberately does
// NOT match, so it's never mistaken for the session cookie.
const SESSION_COOKIE_NAME_RE = /session[._-]token/i;

function getSetCookieValues(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * Did this response establish or clear a real session cookie? This is the
 * authoritative signal — OAuth / Google One Tap callbacks SET the session
 * cookie inside a 3xx redirect to the dashboard, which a status+path check
 * misses entirely.
 */
function inspectSessionCookie(response: Response): "set" | "cleared" | "none" {
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
    if (cleared) return "cleared"; // a clear (sign-out) is decisive
    result = "set";
  }
  return result;
}

/**
 * Inspect a finished auth response and append the session-hint cookie when the
 * user's session was just established (set "1") or torn down (clear). No-op for
 * everything else.
 *
 * The primary signal is whether the response set/cleared a REAL session cookie
 * (`inspectSessionCookie`), so redirect-based OAuth / Google One Tap callbacks
 * are covered — without it the hint only fired on 2xx email/password sign-in and
 * the landing page never reflected a Google sign-in. The path/status checks stay
 * as a fallback for flows that 2xx without an inline Set-Cookie.
 *
 * Pure side effect: mutates `response.headers` (intentional — Response is
 * non-cloneable cheap; rewriting would force a copy).
 */
export function applySessionHint(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname;
  const sessionCookie = inspectSessionCookie(response);

  if (sessionCookie === "cleared" || isSignOutSuccessPath(path, response.status)) {
    response.headers.append("Set-Cookie", buildSessionHintCookie("", 0));
  } else if (sessionCookie === "set" || isSignInSuccessPath(path, response.status)) {
    response.headers.append("Set-Cookie", buildSessionHintCookie("1", SESSION_HINT_MAX_AGE));
  }
  return response;
}
