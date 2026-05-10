"use client";

/**
 * @nebutra/auth/client — Provider-agnostic auth hooks for React.
 *
 * Re-exports hooks and types from the react subpackage. These hooks are
 * built on a unified AuthContext that normalizes state across Clerk
 * and Better Auth providers.
 *
 * @example
 * ```tsx
 * import { useAuth, useUser } from "@nebutra/auth/client";
 *
 * function Dashboard() {
 *   const { user, isSignedIn, signOut } = useAuth();
 *   const { session } = useSession();
 *
 *   if (!isSignedIn) return <Redirect to="/sign-in" />;
 *   return <div>Welcome, {user?.name}</div>;
 * }
 * ```
 */

// Re-export context for advanced use cases
export { type AuthContextValue, useAuthContext } from "./react/context";
// Re-export auth hooks from react subpackage
export { useAuth, useOrganization, useSession, useUser } from "./react/hooks";

// Re-export sign-in method type for convenience
export type { SignInMethod } from "./types";
