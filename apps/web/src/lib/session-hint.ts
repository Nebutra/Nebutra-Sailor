/**
 * Cross-subdomain session-hint cookie.
 *
 * Non-sensitive flag the landing page (`nebutra.com`) reads to redirect
 * signed-in users into the app (`app.nebutra.com`). Encodes only the
 * boolean "session exists somewhere on .nebutra.com"; the real HttpOnly
 * session cookie stays host-scoped on the web app for defense-in-depth.
 *
 * Pattern: Notion-style. Wide non-sensitive flag + narrow sensitive
 * session.
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

/**
 * Inspect a finished auth response and append the session-hint cookie if the
 * path indicates sign-in success (set "1") or sign-out success (clear).
 * No-op for all other paths/statuses.
 *
 * Pure side effect: mutates `response.headers` (intentional — Response is
 * non-cloneable cheap; rewriting would force a copy).
 */
export function applySessionHint(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname;
  if (isSignInSuccessPath(path, response.status)) {
    response.headers.append("Set-Cookie", buildSessionHintCookie("1", SESSION_HINT_MAX_AGE));
  } else if (isSignOutSuccessPath(path, response.status)) {
    response.headers.append("Set-Cookie", buildSessionHintCookie("", 0));
  }
  return response;
}
