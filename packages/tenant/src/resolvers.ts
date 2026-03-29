import { logger } from "@nebutra/logger";
import type { TenantResolver } from "./types.js";

// =============================================================================
// Tenant Resolution Strategies
// =============================================================================

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
    if (!req.headers) return null;

    const value = req.headers[headerName.toLowerCase()];

    if (typeof value === "string") {
      logger.debug("Tenant resolved from header", { headerName, tenantId: value });
      return value;
    }

    if (Array.isArray(value)) {
      const first = value[0];
      if (first) {
        logger.debug("Tenant resolved from header array", { headerName, tenantId: first });
        return first;
      }
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
    if (!req.url) return null;

    try {
      const url = new URL(req.url);
      const hostname = url.hostname;
      const match = hostname.match(regex);

      if (match && match[1]) {
        logger.debug("Tenant resolved from subdomain", { hostname, tenantId: match[1] });
        return match[1];
      }
    } catch (err) {
      logger.warn("Failed to parse URL for subdomain extraction", { url: req.url });
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
    if (!req.url) return null;

    try {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const match = pathname.match(regex);

      if (match && match[1]) {
        logger.debug("Tenant resolved from path", { pathname, tenantId: match[1] });
        return match[1];
      }
    } catch (err) {
      logger.warn("Failed to parse URL for path extraction", { url: req.url });
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
    if (!req.token) return null;

    try {
      // Decode JWT without verification (signature should be verified upstream)
      const parts = req.token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1]!, "base64").toString("utf8"));
      const value = payload[claimName];

      if (typeof value === "string") {
        logger.debug("Tenant resolved from JWT claim", { claimName, tenantId: value });
        return value;
      }
    } catch (err) {
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
    if (!req.apiKey) return null;

    try {
      const tenantId = await lookupFn(req.apiKey);
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
