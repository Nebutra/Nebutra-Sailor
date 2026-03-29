"use client";

import { useAuthContext } from "./context";

/**
 * Hook to get the authenticated user.
 *
 * Returns user details if signed in, null otherwise. The isLoaded flag
 * indicates whether the auth provider has finished its initialization.
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, isLoaded } = useUser();
 *   if (!isLoaded) return <div>Loading...</div>;
 *   if (!user) return <div>Not signed in</div>;
 *   return <div>Hello, {user.name}</div>;
 * }
 * ```
 */
export function useUser() {
  const ctx = useAuthContext();
  return {
    user: ctx.user,
    isLoaded: ctx.isLoaded,
  };
}

/**
 * Hook to get the current session.
 *
 * Returns session details if authenticated, null otherwise.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { session, isLoaded } = useSession();
 *   if (!isLoaded) return <div>Loading...</div>;
 *   if (!session) return <Redirect to="/sign-in" />;
 *   return <DashboardContent userId={session.userId} />;
 * }
 * ```
 */
export function useSession() {
  const ctx = useAuthContext();
  return {
    session: ctx.session,
    isLoaded: ctx.isLoaded,
  };
}

/**
 * Hook to get the active organization and user's membership/role.
 *
 * Useful for multi-tenant applications. Returns the active organization,
 * the user's role within it, and a function to switch organizations.
 *
 * @example
 * ```tsx
 * function OrgSelector() {
 *   const { organization, setActive, isLoaded } = useOrganization();
 *   if (!isLoaded) return <div>Loading...</div>;
 *   if (!organization) return <div>No organization selected</div>;
 *   return (
 *     <div>
 *       <p>Org: {organization.name}</p>
 *       <button onClick={() => setActive("other-org-id")}>
 *         Switch
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOrganization() {
  const ctx = useAuthContext();
  return {
    organization: ctx.organization,
    membership: ctx.membership,
    isLoaded: ctx.isLoaded,
    setActive: ctx.setActiveOrganization,
  };
}

/**
 * Hook to get the full auth state.
 *
 * Returns user, session, organization, sign-in status, and utility methods.
 * This is the most comprehensive auth hook; use more specific hooks (useUser,
 * useSession, useOrganization) if you only need particular pieces.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const {
 *     user,
 *     isSignedIn,
 *     isLoaded,
 *     signOut,
 *     getToken,
 *   } = useAuth();
 *
 *   if (!isLoaded) return <Skeleton />;
 *   if (!isSignedIn) return <SignInButton />;
 *
 *   return (
 *     <div>
 *       <span>{user?.name}</span>
 *       <button onClick={() => signOut()}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const ctx = useAuthContext();
  return {
    user: ctx.user,
    session: ctx.session,
    organization: ctx.organization,
    membership: ctx.membership,
    provider: ctx.provider,
    isSignedIn: ctx.isSignedIn,
    isLoaded: ctx.isLoaded,
    getToken: ctx.getToken,
    signOut: ctx.signOut,
  };
}
