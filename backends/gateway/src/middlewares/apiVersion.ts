import { createMiddleware } from "hono/factory";

/**
 * API versioning middleware.
 * - Sets `API-Version` response header
 * - Supports `Sunset` header for deprecated endpoints
 * - Reads version from URL path prefix (/api/v1/, /api/v2/)
 */

interface VersionConfig {
  /** API versions that are deprecated, with their sunset dates */
  deprecated?: Record<string, string>; // e.g. { "v1": "2026-12-31" }
}

export const apiVersionMiddleware = (config: VersionConfig = {}) =>
  createMiddleware(async (c, next) => {
    const path = new URL(c.req.url).pathname;
    const versionMatch = path.match(/\/api\/(v\d+)\//);
    const version = versionMatch?.[1] ?? "v1";

    c.header("API-Version", version);

    if (config.deprecated?.[version]) {
      c.header("Sunset", config.deprecated[version]);
      c.header("Deprecation", "true");
      c.header("Link", `</api/v2/>; rel="successor-version"`);
    }

    await next();
  });
