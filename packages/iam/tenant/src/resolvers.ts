import { logger } from "@nebutra/logger";
import type { TenantResolver } from "./types";

// =============================================================================
// Tenant Resolution Strategies
// =============================================================================

type HeaderMap = Record<string, string | string[] | undefined>;
type ResolverInput = Parameters<TenantResolver>[0];

function isRequest(req: ResolverInput): req is Request {
  return typeof Request !== "undefined" && req instanceof Request;
}

function getHeader(headers: Headers | HeaderMap | undefined, headerName: string): string | null {
  if (!headers) return null;

  if (headers instanceof Headers) {
    return headers.get(headerName);
  }

  const normalizedHeaderName = headerName.toLowerCase();
  const entry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === normalizedHeaderName,
  );

  const value = entry?.[1];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;

  return null;
}

function getUrlString(req: ResolverInput): string | null {
  const url = req.url;
  if (!url) return null;
  return url instanceof URL ? url.toString() : url;
}

function getJwtToken(req: ResolverInput): string | null {
  const explicitToken = isRequest(req) ? null : req.token;
  if (explicitToken) return explicitToken;

  const authorization = getHeader(req.headers, "authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;

  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
}

/**
 * Extract tenant ID from an HTTP header.
 *
 * Default strategy for API gateways. Header name is configurable.
 *
 * @param headerName The header name to look for (default: "x-tenant-id")
 * @returns A resolver function
 *
 * @example
 * ```ts
 * const resolver = fromHeader("x-tenant-id");
 * const tenantId = await resolver({ headers: { "x-tenant-id": "org_123" } });
 * ```
 */
export function fromHeader(headerName: string = "x-tenant-id"): TenantResolver {
  return (req) => {
    const value = getHeader(req.headers, headerName);

    if (typeof value === "string") {
      logger.debug("Tenant resolved from header", { headerName, tenantId: value });
      return value;
    }

    return null;
  };
}

/**
 * Extract tenant ID from a subdomain using a regex pattern.
 *
 * Useful for SaaS products with tenant subdomains (e.g., `acme.app.nebutra.com`).
 *
 * @param pattern A regex pattern with a capture group for tenant ID
 * @returns A resolver function
 *
 * @example
 * ```ts
 * // Extract "acme" from "acme.app.nebutra.com"
 * const resolver = fromSubdomain("^([a-z0-9-]+)\\.app\\.nebutra\\.com$");
 * const tenantId = await resolver({ url: "https://acme.app.nebutra.com/api" });
 * ```
 */
export function fromSubdomain(pattern: string): TenantResolver {
  const regex = new RegExp(pattern, "i");

  return (req) => {
    const urlString = getUrlString(req);
    if (!urlString) return null;

    try {
      const url = new URL(urlString);
      const hostname = url.hostname;
      const match = hostname.match(regex);

      if (match?.[1]) {
        logger.debug("Tenant resolved from subdomain", { hostname, tenantId: match[1] });
        return match[1];
      }
    } catch (_err) {
      logger.warn("Failed to parse URL for subdomain extraction", { url: urlString });
    }

    return null;
  };
}

/**
 * Extract tenant ID from a URL path prefix.
 *
 * Useful for multi-tenant apps with path-based routing (e.g., `/org/acme/...`).
 *
 * @param prefix The path prefix pattern (e.g., "/org/:tenantId" or "/org/([^/]+)")
 * @returns A resolver function
 *
 * @example
 * ```ts
 * // Extract tenant ID from "/org/acme/..."
 * const resolver = fromPath("/org/:tenantId");
 * const tenantId = await resolver({ url: "https://app.nebutra.com/org/acme/dashboard" });
 * ```
 */
export function fromPath(prefix: string): TenantResolver {
  // Convert Next.js-style `:tenantId` to regex capture group
  const pattern = prefix.replace(/:tenantId/g, "([^/?]+)");
  const regex = new RegExp(`^${pattern}`);

  return (req) => {
    const urlString = getUrlString(req);
    if (!urlString) return null;

    try {
      const url = new URL(urlString);
      const pathname = url.pathname;
      const match = pathname.match(regex);

      if (match?.[1]) {
        logger.debug("Tenant resolved from path", { pathname, tenantId: match[1] });
        return match[1];
      }
    } catch (_err) {
      logger.warn("Failed to parse URL for path extraction", { url: urlString });
    }

    return null;
  };
}

/**
 * Extract tenant ID from a JWT token claim.
 *
 * Useful for authentication services that embed tenant info in the token.
 *
 * @param claimName The JWT claim name (e.g., "tenant_id", "org_id")
 * @returns A resolver function
 *
 * @example
 * ```ts
 * // Extract from decoded JWT { sub: "user_123", tenant_id: "org_456" }
 * const resolver = fromJwtClaim("tenant_id");
 * const tenantId = await resolver({ token: "eyJhbGc..." });
 * ```
 */
export function fromJwtClaim(claimName: string): TenantResolver {
  return (req) => {
    const token = getJwtToken(req);
    if (!token) return null;

    try {
      // Decode JWT without verification (signature should be verified upstream)
      const payload = decodeJwtPayload(token);
      if (!payload) return null;

      const value = payload[claimName];

      if (typeof value === "string") {
        logger.debug("Tenant resolved from JWT claim", { claimName, tenantId: value });
        return value;
      }
    } catch (_err) {
      logger.warn("Failed to extract JWT claim", { claimName });
    }

    return null;
  };
}

/**
 * Resolve tenant ID from an API key by looking it up in a function (e.g., database).
 *
 * Useful for service-to-service authentication or API clients.
 *
 * @param lookupFn Async function that takes an API key and returns the tenant ID
 * @returns A resolver function
 *
 * @example
 * ```ts
 * // Look up API key in database
 * const resolver = fromApiKey(async (apiKey) => {
 *   const key = await db.apiKey.findUnique({ where: { key: apiKey } });
 *   return key?.tenantId ?? null;
 * });
 * const tenantId = await resolver({ apiKey: "sk_123" });
 * ```
 */
export function fromApiKey(lookupFn: (apiKey: string) => Promise<string | null>): TenantResolver {
  return async (req) => {
    const apiKey = isRequest(req) ? null : req.apiKey;
    if (!apiKey) return null;

    try {
      const tenantId = await lookupFn(apiKey);
      if (tenantId) {
        logger.debug("Tenant resolved from API key");
        return tenantId;
      }
    } catch (err) {
      logger.warn("Failed to lookup API key", { error: err });
    }

    return null;
  };
}

/**
 * Compose multiple tenant resolvers with fallback behavior.
 *
 * Tries each resolver in order; returns the first successful match.
 * If all resolvers return null, returns null.
 *
 * @param resolvers Array of resolver functions
 * @returns A composite resolver function
 *
 * @example
 * ```ts
 * // Try header first, then subdomain, then path
 * const resolver = compose(
 *   fromHeader("x-tenant-id"),
 *   fromSubdomain("^([a-z0-9-]+)\\.app\\.nebutra\\.com$"),
 *   fromPath("/org/:tenantId")
 * );
 *
 * const tenantId = await resolver({
 *   headers: { "x-tenant-id": "org_123" },
 *   url: "https://acme.app.nebutra.com/org/xyz/dashboard"
 * });
 * // Returns "org_123" (first match)
 * ```
 */
export function compose(...resolvers: TenantResolver[]): TenantResolver {
  return async (req) => {
    for (const resolver of resolvers) {
      try {
        const result = await Promise.resolve(resolver(req));
        if (result) {
          logger.debug("Tenant resolved via composed resolver", { tenantId: result });
          return result;
        }
      } catch (err) {
        logger.warn("Resolver in chain failed", { error: err });
        // Continue to next resolver
      }
    }

    return null;
  };
}
