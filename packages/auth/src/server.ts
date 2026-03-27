/**
 * @nebutra/auth/server — Factory for creating a provider-specific AuthProvider.
 *
 * Usage:
 * ```ts
 * import { createAuth } from "@nebutra/auth/server";
 *
 * const auth = await createAuth({ provider: "clerk" });
 * const session = await auth.getSession(request);
 * ```
 */

import type { AuthConfig, AuthProvider } from "./types.js";

/**
 * Dynamically import and instantiate the selected auth provider.
 *
 * The provider modules are loaded lazily so that unused providers
 * (and their dependencies) are never bundled.
 */
export async function createAuth(config: AuthConfig): Promise<AuthProvider> {
  switch (config.provider) {
    case "clerk":
      return (await import("./providers/clerk.js")).createClerkAuth(config);
    case "better-auth":
      return (await import("./providers/better-auth.js")).createBetterAuthProvider(config);
    case "nextauth":
      return (await import("./providers/nextauth.js")).createNextAuthProvider(config);
    default:
      throw new Error(`Unknown auth provider: ${String((config as AuthConfig).provider)}`);
  }
}
