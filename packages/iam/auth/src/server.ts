/**
 * @nebutra/auth/server — Factory for creating a provider-specific AuthProvider.
 *
 * Usage:
 * ```ts
 * import { createAuth } from "@nebutra/auth/server";
 *
 * const auth = await createAuth({ provider: "better-auth" });
 * const session = await auth.getSession(request);
 * ```
 */

import type { AuthConfig, AuthProvider } from "./types";

/**
 * Dynamically import and instantiate the selected auth provider.
 *
 * The provider modules are loaded lazily so that unused providers
 * (and their dependencies) are never bundled.
 */
export async function createAuth(config: AuthConfig): Promise<AuthProvider> {
  switch (config.provider) {
    case "better-auth":
      // Explicit extension: `providers/better-auth` is both a file and a
      // directory, and Node-side resolvers (tsx, the gateway's dev server)
      // pick the directory's index and fail.
      return (await import("./providers/better-auth.js")).createBetterAuthProvider(config);
    case "dev":
      return (await import("./providers/dev")).createDevAuthProvider(config);
    default:
      throw new Error(`Unknown auth provider: ${String((config as AuthConfig).provider)}`);
  }
}

export {
  type CanonicalUserResolver,
  canonicalUserId,
  canonicalUserIdOrNull,
  createCanonicalUserResolver,
  getCanonicalUserResolver,
} from "./canonical-user";
export { ensureUserRecordForSession } from "./identity-mirror";
