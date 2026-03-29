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
 * Dynamically selects the appropriate middleware based on the configured provider.
 * For Clerk, consider using clerkMiddleware() directly from @clerk/nextjs/server
 * in your middleware.ts file for best compatibility.
 *
 * For Better Auth, this factory returns a handler suitable for
 * Next.js middleware or edge functions.
 */
export async function createAuthMiddleware(
  config: AuthConfig,
): Promise<(req: Request) => Promise<Response | undefined>> {
  switch (config.provider) {
    case "clerk": {
      // Clerk: attempt to dynamically load clerkMiddleware, but warn about direct usage
      try {
        const { clerkMiddleware } = await import("@clerk/nextjs/server");
        console.warn(
          "Clerk middleware loaded via factory. For best performance, " +
            "import clerkMiddleware() directly in your middleware.ts file.",
        );
        return clerkMiddleware() as (req: Request) => Promise<Response | undefined>;
      } catch {
        console.error(
          "Failed to load @clerk/nextjs. " +
            "For Clerk, use clerkMiddleware() from @clerk/nextjs/server directly in middleware.ts",
        );
        // Return a pass-through handler if Clerk is not installed
        return async () => undefined;
      }
    }

    case "better-auth": {
      // Better Auth: delegate to the provider's middleware handler
      const auth = await (await import("./server")).createAuth(config);
      return auth.middleware();
    }

    default:
      throw new Error(`Unknown auth provider: ${String((config as AuthConfig).provider)}`);
  }
}
