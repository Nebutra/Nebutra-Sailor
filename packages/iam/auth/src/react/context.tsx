"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { AuthProviderId } from "../types";

/**
 * Auth context value shape — shared across all providers.
 *
 * This interface represents the normalized state that any auth provider
 * must supply to client components, hiding provider-specific details.
 */
export interface AuthContextValue {
  /** Which auth provider this context is wrapping. */
  provider: AuthProviderId;

  /** The currently authenticated user, or null if not signed in. */
  user: {
    id: string;
    email?: string | undefined;
    name?: string | undefined;
    imageUrl?: string | undefined;
  } | null;

  /** The current session, or null if not authenticated. */
  session: {
    userId: string;
    organizationId?: string | undefined;
    role?: string | undefined;
  } | null;

  /** The active organization, if any. */
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;

  /** The user's role/membership in the active organization. */
  membership: {
    role: string;
  } | null;

  /** True when the provider has finished loading initial state. */
  isLoaded: boolean;

  /** True if the user is currently authenticated. */
  isSignedIn: boolean;

  /** Retrieve a valid auth token (JWT, session token, etc.). */
  getToken: () => Promise<string | null>;

  /** Sign the user out. */
  signOut: () => Promise<void>;

  /** Switch to a different organization. */
  setActiveOrganization: (orgId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function createUnauthenticatedAuthContext(
  provider: AuthProviderId,
  isLoaded = false,
): AuthContextValue {
  return {
    provider,
    user: null,
    session: null,
    organization: null,
    membership: null,
    isLoaded,
    isSignedIn: false,
    getToken: async () => null,
    signOut: async () => {},
    setActiveOrganization: async () => {},
  };
}

/**
 * Hook to access the auth context.
 *
 * Must be used within a component tree wrapped by an AuthProvider.
 * Throws if called outside the provider boundary.
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuthContext must be used within an <AuthProvider>. " +
        "Make sure your component tree is wrapped with the appropriate provider.",
    );
  }
  return ctx;
}

/**
 * Provider component that supplies AuthContextValue to its children.
 *
 * This is an internal component — typically not used directly by applications.
 * Instead, use the factory provider (AuthProvider) which selects the correct
 * provider wrapper based on the configured provider.
 */
export function AuthContextProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
