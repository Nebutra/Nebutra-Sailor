/**
 * First-party CORS for the auth-edge Worker.
 *
 * Better Auth does not emit Access-Control-* headers. The Next catch-all
 * (`applyAuthCors`) only runs on ECS. Production `/api/auth/*` is this Worker,
 * so GET /get-session must carry CORS here or product RPs cannot read the
 * session after login (preflight 204s, the actual GET is opaque, UI stays
 * signed-out).
 *
 * Only first-party product hosts. Reflecting an arbitrary Origin with
 * credentials would be a hole. Apex comes from brand.domains.landing.
 */

import { brand } from "@nebutra/brand/metadata";

function firstPartyApex(): string {
  return brand.domains.landing
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function isFirstPartyAuthOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    const apex = firstPartyApex();
    return (
      host === apex || host.endsWith(`.${apex}`) || host === "localhost" || host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function withCopiedCookies(source: Response, headers: Headers): Response {
  if (typeof source.headers.getSetCookie === "function") {
    const seen = new Set(typeof headers.getSetCookie === "function" ? headers.getSetCookie() : []);
    for (const cookie of source.headers.getSetCookie()) {
      if (!seen.has(cookie)) {
        headers.append("Set-Cookie", cookie);
      }
    }
  }
  return new Response(source.body, {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}

function withoutCredentialCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Credentials");
  return withCopiedCookies(response, headers);
}

export function applyEdgeAuthCors(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin")?.trim() || request.headers.get("origin")?.trim();
  if (!origin || !isFirstPartyAuthOrigin(origin)) {
    if (request.method.toUpperCase() === "OPTIONS") {
      return new Response(null, { status: 204 });
    }
    return withoutCredentialCors(response);
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers") ||
      request.headers.get("access-control-request-headers") ||
      "Content-Type, Authorization, X-Captcha-Response, X-Requested-With",
  );
  headers.set("Access-Control-Max-Age", "86400");
  if (!headers.get("Vary")?.toLowerCase().includes("origin")) {
    headers.append("Vary", "Origin");
  }

  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return withCopiedCookies(response, headers);
}
