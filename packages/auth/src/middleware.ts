/**
 * @nebutra/auth/middleware — Factory for auth middleware.
 *
 * Creates the appropriate middleware handler based on the configured provider.
 * Used in apps/web/src/proxy.ts (or equivalent edge middleware).
 */

import type { AuthConfig } from "./types.js";

/**
 * Create a provider-specific auth middleware handler.
 *
 * For Clerk, callers should use `clerkMiddleware()` directly — this factory
 * will be useful once Better Auth and NextAuth providers are implemented.
 */
export async function createAuthMiddleware(
  config: AuthConfig,
): Promise<(req: Request) => Promise<Response | undefined>> {
  switch (config.provider) {
    case "clerk":
      throw new Error(
        "For Clerk, use clerkMiddleware() from @clerk/nextjs/server directly in proxy.ts",
      );
    case "better-auth":
      // Phase 2: will return better-auth's handler
      throw new Error(
        "Better Auth middleware is not yet implemented. See Phase 2 in the auth design doc.",
      );
    case "nextauth":
      // Phase 3: will return NextAuth's auth middleware
      throw new Error(
        "NextAuth middleware is not yet implemented. See Phase 3 in the auth design doc.",
      );
    default:
      throw new Error(`Unknown auth provider: ${String((config as AuthConfig).provider)}`);
  }
}
