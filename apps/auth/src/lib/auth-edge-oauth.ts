/**
 * Auth-edge OAuth helpers.
 *
 * Two browser-navigation bugs this file exists to close:
 *   1. Better Auth social start often returns 200 + JSON. Top-level <a href>
 *      only follows 3xx, so we rewrite to 302 and keep every Set-Cookie.
 *   2. A successful callback 302s straight to app.nebutra.com while setting
 *      the session cookie. Chrome/Safari bounce-tracking treats
 *      Google → auth → other-host as a tracker hop and drops the cookie.
 *      Dashboard requireAuth then bounces back to /sign-in?returnTo=… —
 *      "login did nothing". Serve a same-origin 200 first so the cookie
 *      commits, then navigate.
 */

const SESSION_COOKIE_NAME_RE = /session[._-]token/i;

export function isOAuthCallbackPath(path: string): boolean {
  return /\/callback\/[^/]+\/?$/u.test(path);
}

export function copySetCookieHeaders(target: Headers, source: unknown): void {
  if (!source) return;

  if (source instanceof Headers) {
    const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie?.bind(
      source,
    );
    if (typeof getSetCookie === "function") {
      for (const cookie of getSetCookie()) {
        if (cookie) target.append("Set-Cookie", cookie);
      }
      return;
    }
    const single = source.get("set-cookie");
    if (single) target.append("Set-Cookie", single);
    return;
  }

  if (typeof source !== "object") return;
  const record = source as Record<string, unknown>;
  const raw = record["set-cookie"] ?? record["Set-Cookie"];
  if (Array.isArray(raw)) {
    for (const cookie of raw) {
      if (typeof cookie === "string" && cookie) target.append("Set-Cookie", cookie);
    }
    return;
  }
  if (typeof raw === "string" && raw) target.append("Set-Cookie", raw);
}

function cookieName(setCookie: string): string {
  const semi = setCookie.indexOf(";");
  const pair = semi >= 0 ? setCookie.slice(0, semi) : setCookie;
  const eq = pair.indexOf("=");
  return (eq >= 0 ? pair.slice(0, eq) : pair).trim();
}

function setCookiesOf(headers: Headers): string[] {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

export function socialStartToRedirect(raw: unknown): Response {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const nested =
    record?.response && typeof record.response === "object"
      ? (record.response as Record<string, unknown>)
      : null;
  const authorizeUrl =
    (typeof nested?.url === "string" ? nested.url : undefined) ??
    (typeof record?.url === "string" ? record.url : undefined) ??
    (typeof nested?.redirect === "string" ? nested.redirect : undefined) ??
    (typeof record?.redirect === "string" ? record.redirect : undefined);
  if (!authorizeUrl || !authorizeUrl.startsWith("http")) {
    throw new Error("OAuth start did not return an authorize URL");
  }

  const headers = new Headers();
  headers.set("Location", authorizeUrl);
  copySetCookieHeaders(headers, record?.headers);
  return new Response(null, { status: 302, headers });
}

/**
 * Better Auth social start often returns **200 + JSON** `{ url, redirect: true }`
 * with a Location header and state cookie. Convert to 302 for top-level nav.
 */
export async function asBrowserOAuthRedirect(res: Response): Promise<Response> {
  let location = res.headers.get("location");
  if (!location) {
    try {
      const data = (await res.clone().json()) as { url?: string; redirect?: boolean };
      if (typeof data?.url === "string" && data.url.startsWith("http")) {
        location = data.url;
      }
    } catch {
      // not JSON
    }
  }
  if (!location) return res;
  if (res.status >= 300 && res.status < 400) return res;

  const headers = new Headers();
  headers.set("Location", location);
  copySetCookieHeaders(headers, res.headers);
  return new Response(null, { status: 302, headers });
}

export type OAuthCallbackSummary = {
  status: number;
  location: string | null;
  error: string | null;
  cookieNames: string[];
  hasSessionCookie: boolean;
};

export function summarizeAuthResponse(res: Response, requestUrl: string): OAuthCallbackSummary {
  const rawLocation = res.headers.get("location");
  let location: string | null = null;
  let error: string | null = null;
  if (rawLocation) {
    try {
      const parsed = new URL(rawLocation, requestUrl);
      location = `${parsed.origin}${parsed.pathname}`;
      error = parsed.searchParams.get("error");
    } catch {
      location = rawLocation.split("?")[0] ?? rawLocation;
    }
  }
  const cookieNames = setCookiesOf(res.headers).map(cookieName).filter(Boolean);
  return {
    status: res.status,
    location,
    error,
    cookieNames,
    hasSessionCookie: cookieNames.some((name) => SESSION_COOKIE_NAME_RE.test(name)),
  };
}

function isSafeContinueUrl(dest: URL): boolean {
  if (dest.protocol !== "https:" && dest.protocol !== "http:") return false;
  if (dest.username || dest.password) return false;
  if (dest.protocol === "http:") {
    return dest.hostname === "localhost" || dest.hostname === "127.0.0.1";
  }
  const host = dest.hostname.toLowerCase();
  return host === "nebutra.com" || host.endsWith(".nebutra.com");
}

export function shouldServeOAuthContinuePage(res: Response, requestUrl: string): string | null {
  if (res.status < 300 || res.status >= 400) return null;
  const raw = res.headers.get("location");
  if (!raw) return null;
  let dest: URL;
  try {
    dest = new URL(raw, requestUrl);
  } catch {
    return null;
  }
  let requestHost: string;
  try {
    requestHost = new URL(requestUrl).host;
  } catch {
    return null;
  }
  if (dest.host === requestHost) return null;
  if (!isSafeContinueUrl(dest)) return null;
  return dest.toString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderOAuthContinueHtml(destination: string): string {
  const href = escapeHtml(destination);
  const js = JSON.stringify(destination);
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Signing you in</title>
<meta http-equiv="refresh" content="0;url=${href}">
<body>
<p>Signing you in… <a href="${href}">Continue</a></p>
<script>location.replace(${js})</script>
</body>
</html>`;
}

export function finalizeOAuthCallback(res: Response, request: Request): Response {
  const summary = summarizeAuthResponse(res, request.url);
  console.error("[nebutra-auth] oauth-callback", JSON.stringify(summary));

  const destination = shouldServeOAuthContinuePage(res, request.url);
  if (!destination) return res;

  const headers = new Headers();
  copySetCookieHeaders(headers, res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  return new Response(renderOAuthContinueHtml(destination), { status: 200, headers });
}
