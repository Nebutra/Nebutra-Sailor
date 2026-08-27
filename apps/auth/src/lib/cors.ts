// @brand-exempt: the only literal is a hostname inside the header comment explaining which
// origin this CORS policy is for. The policy itself resolves trusted origins through
// resolveBetterAuthTrustedOrigins — nothing is hardcoded at runtime.

import "server-only";

import { resolveBetterAuthTrustedOrigins } from "@nebutra/auth";

/**
 * Apply first-party CORS for product RPs (forge/router/app) that call
 * auth.nebutra.com `/api/auth/*` with credentials.
 *
 * Better Auth validates trustedOrigins for CSRF on mutations but does **not**
 * emit Access-Control-* response headers. Without these, browsers block
 * `createAuthClient({ baseURL: auth }).getSession()` on forge after login.
 */
export function applyAuthCors(request: Request, response: Response): Response {
  const origin = request.headers.get("Origin")?.trim();
  if (!origin) return response;

  const trusted = new Set(resolveBetterAuthTrustedOrigins());
  // Always allow the auth center's own origin when present.
  const base = process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_AUTH_URL?.trim();
  if (base) {
    try {
      trusted.add(new URL(base).origin);
    } catch {
      // ignore malformed
    }
  }

  if (!trusted.has(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers") ||
      "Content-Type, Authorization, X-Captcha-Response, X-Requested-With",
  );
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");

  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
