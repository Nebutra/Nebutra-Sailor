/**
 * @nebutra/auth/react — Provider-agnostic React auth hooks and providers.
 *
 * Exports auth hooks (useAuth, useUser, useSession, useOrganization) that read
 * from a unified AuthContext, plus provider wrappers for Clerk, Better Auth,
 * Provider-specific dependencies are loaded lazily.
 *
 * @example
 * ```tsx
 * import { AuthProvider, useAuth } from "@nebutra/auth/react";
 *
 * const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <AuthProvider provider={provider as any}>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 *
 * function UserProfile() {
 *   const { user, signOut } = useAuth();
 *   return (
 *     <div>
 *       <p>{user?.name}</p>
 *       <button onClick={() => signOut()}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */

// Factory provider
export { AuthProvider, type AuthProviderProps } from "./auth-provider";
// Auth context
export { AuthContextProvider, type AuthContextValue, useAuthContext } from "./context";
// React hooks
export { useAuth, useOrganization, useSession, useUser } from "./hooks";
// Provider-specific wrappers (for manual composition if needed)
export { BetterAuthProvider } from "./providers/better-auth-provider";
export { ClerkProvider } from "./providers/clerk-provider";
