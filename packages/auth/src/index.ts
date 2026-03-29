/**
 * @nebutra/auth — Provider-agnostic auth abstraction layer.
 *
 * Unified interface for Clerk and Better Auth.
 *
 * For server-side use:
 * ```ts
 * import { createAuth } from "@nebutra/auth";
 * const auth = await createAuth({ provider: "better-auth" });
 * const session = await auth.getSession(request);
 * ```
 *
 * For client-side use:
 * ```ts
 * import { useAuth } from "@nebutra/auth/client";
 * const { user, signOut } = useAuth();
 * ```
 *
 * For setting up providers:
 * ```tsx
 * import { AuthProvider } from "@nebutra/auth/react";
 * <AuthProvider provider="better-auth">
 *   <App />
 * </AuthProvider>
 * ```
 */

// Middleware factory
export { createAuthMiddleware } from "./middleware";
// Server-side factory
export { createAuth } from "./server";

// Canonical types (shared across all layers)
export type {
  AuthConfig,
  AuthProvider,
  AuthProviderId,
  CreateOrgInput,
  CreateUserInput,
  Organization,
  Session,
  SignInMethod,
  User,
} from "./types";
