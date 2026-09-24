/**
 * @nebutra/auth/middleware — Factory for auth middleware.
 *
 * Creates the appropriate middleware handler based on the configured provider.
 * Used in apps/web/src/proxy.ts (or equivalent edge middleware).
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createAuthMiddleware } from "@nebutra/auth/middleware";
 *
 * const middleware = await createAuthMiddleware({
 *   provider: process.env.AUTH_PROVIDER || "better-auth",
 * });
 *
 * export default middleware;
 * ```
 */

import type { AuthConfig } from "./types";

/**
 * Create a provider-specific auth middleware handler.
 *
 * Delegates to the selected provider's normalized middleware handler.
 */
export async function createAuthMiddleware(
  config: AuthConfig,
): Promise<(req: Request) => Promise<Response | undefined>> {
  switch (config.provider) {
    case "better-auth":
    case "dev": {
      const auth = await (await import("./server")).createAuth(config);
      return auth.middleware();
    }

    default:
      throw new Error(`Unknown auth provider: ${String((config as AuthConfig).provider)}`);
  }
}
