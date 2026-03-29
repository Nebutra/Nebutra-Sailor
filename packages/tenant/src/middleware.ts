import { logger } from "@nebutra/logger";
import { runWithTenant } from "./context.js";
import { fromHeader, fromJwtClaim, fromPath, fromSubdomain } from "./resolvers.js";
import type { TenantConfig, TenantResolver } from "./types.js";
import { TenantRequiredError } from "./types.js";

// =============================================================================
// Hono Middleware for Multi-Tenant Context
// =============================================================================

/**
 * Create a Hono middleware that extracts tenant from request and sets context.
 *
 * - Resolves tenant ID using configured strategy (header, subdomain, path, JWT, API key)
 * - Wraps handler execution with AsyncLocalStorage context
 * - Returns 400 if tenant is required but not resolved
 *
 * @param config Tenant configuration
 * @returns A Hono middleware function
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { tenantMiddleware } from "@nebutra/tenant/middleware";
 *
 * const app = new Hono();
 *
 * app.use(
 *   tenantMiddleware({
 *     headerName: "x-tenant-id",
 *     requireTenant: true,
 *   })
 * );
 *
 * app.get("/api/data", (c) => {
 *   const tenant = getCurrentTenant();
 *   return c.json({ tenantId: tenant.id });
 * });
 *
 * export default app;
 * ```
 */
export function tenantMiddleware(config: Partial<TenantConfig> = {}) {
  const mergedConfig = {
    headerName: "x-tenant-id",
    requireTenant: true,
    ...config,
  };

  // Determine which resolver to use
  let resolver: TenantResolver;

  if (mergedConfig.resolver) {
    resolver = mergedConfig.resolver as TenantResolver;
  } else if (mergedConfig.subdomainPattern) {
    resolver = fromSubdomain(mergedConfig.subdomainPattern);
  } else if (mergedConfig.pathPrefix) {
    resolver = fromPath(mergedConfig.pathPrefix);
  } else if (mergedConfig.jwtClaimName) {
    resolver = fromJwtClaim(mergedConfig.jwtClaimName);
  } else {
    // Default: header-based resolution
    resolver = fromHeader(mergedConfig.headerName);
  }

  return async (c: any, next: any) => {
    try {
      // Extract tenant ID from request
      const honoHeaders: Record<string, string | string[] | undefined> = {};
      const rawHeaders = c.req.raw.headers as Headers;
      rawHeaders.forEach((value: string, key: string) => {
        honoHeaders[key.toLowerCase()] = value;
      });

      const tenantId = await Promise.resolve(
        resolver({
          headers: honoHeaders,
          url: c.req.url,
          token: c.req.header("Authorization")?.replace(/^Bearer\s+/i, ""),
          apiKey: c.req.header("X-API-Key"),
        }),
      );

      if (!tenantId) {
        if (mergedConfig.requireTenant) {
          logger.warn("Tenant context required but not resolved", {
            url: c.req.url,
          });

          return c.json(
            {
              error: "Tenant context required",
              message: "No valid tenant ID found in request",
            },
            400,
          );
        }

        // Tenant is optional, proceed without context
        logger.debug("Tenant context not resolved (optional)");
        return next();
      }

      logger.debug("Tenant resolved in middleware", { tenantId });

      // Execute handler within tenant context
      return await runWithTenant({ id: tenantId }, async () => {
        return next();
      });
    } catch (err) {
      logger.error("Tenant middleware error", err);
      return c.json(
        {
          error: "Internal server error",
          message: "Failed to process tenant context",
        },
        500,
      );
    }
  };
}

// =============================================================================
// Next.js API Route / Server Action Wrapper
// =============================================================================

/**
 * Wrap a Next.js API route handler to extract and set tenant context.
 *
 * Uses the same resolver logic as Hono middleware but for Next.js.
 *
 * @param handler The API route handler
 * @param config Tenant configuration
 * @returns Wrapped handler that sets tenant context
 *
 * @example
 * ```ts
 * // pages/api/data.ts
 * import { withTenant } from "@nebutra/tenant/middleware";
 * import { getCurrentTenant } from "@nebutra/tenant";
 * import type { NextApiRequest, NextApiResponse } from "next";
 *
 * export default withTenant(
 *   async (req: NextApiRequest, res: NextApiResponse) => {
 *     const tenant = getCurrentTenant();
 *     res.json({ tenantId: tenant.id });
 *   },
 *   { headerName: "x-tenant-id" }
 * );
 * ```
 */
export function withTenant<T extends any[], R>(
  handler: (...args: T) => Promise<R> | R,
  config: Partial<TenantConfig> = {},
) {
  const mergedConfig = {
    headerName: "x-tenant-id",
    requireTenant: true,
    ...config,
  };

  return async (...args: T): Promise<R> => {
    // Extract req from args (Next.js convention: req is first arg)
    const req = args[0] as any;

    if (!req || !req.headers) {
      logger.warn("withTenant: No request object found");
      if (mergedConfig.requireTenant) {
        throw new TenantRequiredError("No request context available");
      }
      return handler(...args);
    }

    // Determine resolver
    let resolver: TenantResolver;

    if (mergedConfig.resolver) {
      resolver = mergedConfig.resolver as TenantResolver;
    } else if (mergedConfig.subdomainPattern) {
      resolver = fromSubdomain(mergedConfig.subdomainPattern);
    } else if (mergedConfig.pathPrefix) {
      resolver = fromPath(mergedConfig.pathPrefix);
    } else if (mergedConfig.jwtClaimName) {
      resolver = fromJwtClaim(mergedConfig.jwtClaimName);
    } else {
      resolver = fromHeader(mergedConfig.headerName);
    }

    // Resolve tenant ID
    const resolverInput = {
      headers: req.headers as Record<string, string | string[] | undefined> | undefined,
      url: req.url ? `${(req.headers.host as string) || ""}${req.url}` : undefined,
      token: (req.headers.authorization as string)?.replace(/^Bearer\s+/i, ""),
      apiKey: req.headers["x-api-key"] as string | undefined,
    };

    const tenantId = await Promise.resolve(resolver(resolverInput as any));

    if (!tenantId) {
      if (mergedConfig.requireTenant) {
        logger.warn("withTenant: Tenant required but not resolved");
        throw new TenantRequiredError("No tenant context found in request");
      }

      logger.debug("withTenant: Tenant context not resolved (optional)");
      return handler(...args);
    }

    logger.debug("withTenant: Tenant resolved", { tenantId });

    // Execute handler within tenant context
    return runWithTenant({ id: tenantId }, () => handler(...args));
  };
}

/**
 * Wrap a Next.js Server Action to extract and set tenant context.
 *
 * Server Actions don't have direct access to request headers, so tenant ID
 * should be passed explicitly or resolved from authentication context.
 *
 * @param handler The server action handler
 * @param getTenantId Function to extract tenant ID (e.g., from auth context)
 * @returns Wrapped handler that sets tenant context
 *
 * @example
 * ```ts
 * // lib/actions.ts
 * "use server";
 * import { withServerAction } from "@nebutra/tenant/middleware";
 * import { getSession } from "@/lib/auth";
 *
 * export const getUserData = withServerAction(
 *   async (userId: string) => {
 *     const tenant = getCurrentTenant();
 *     const user = await db.user.findUnique({
 *       where: { id: userId, tenantId: tenant.id },
 *     });
 *     return user;
 *   },
 *   async () => {
 *     const session = await getSession();
 *     return session?.tenantId || null;
 *   }
 * );
 * ```
 */
export function withServerAction<T extends any[], R>(
  handler: (...args: T) => Promise<R> | R,
  getTenantId: () => Promise<string | null> | string | null,
) {
  return async (...args: T): Promise<R> => {
    try {
      const tenantId = await Promise.resolve(getTenantId());

      if (!tenantId) {
        logger.warn("withServerAction: Tenant ID not available");
        throw new TenantRequiredError("No tenant context available in server action");
      }

      logger.debug("withServerAction: Tenant resolved", { tenantId });

      return runWithTenant({ id: tenantId }, () => handler(...args));
    } catch (err) {
      logger.error("withServerAction: Error setting tenant context", err);
      throw err;
    }
  };
}
