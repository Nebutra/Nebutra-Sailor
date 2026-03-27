"use client";

/**
 * @nebutra/auth/client — Provider-agnostic auth hooks for React.
 *
 * These are placeholder type signatures. The actual implementation
 * depends on the active provider:
 *
 * - Clerk:       re-export from @clerk/nextjs
 * - Better Auth: use better-auth/react
 * - NextAuth:    use next-auth/react
 *
 * Full hook implementations will be added in Phases 2-4.
 */

// ─── Client-Side Types ───

/** Minimal user shape returned by client hooks. */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  imageUrl?: string;
}

/** Minimal session shape returned by client hooks. */
export interface AuthSession {
  userId: string;
  organizationId?: string;
  role?: string;
  expiresAt: Date;
}

/** Minimal organization shape returned by client hooks. */
export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

// ─── Hook Return Types ───

export interface UseUserReturn {
  user: AuthUser | null;
  isLoaded: boolean;
}

export interface UseSessionReturn {
  session: AuthSession | null;
  isLoaded: boolean;
}

export interface UseOrganizationReturn {
  organization: AuthOrganization | null;
  isLoaded: boolean;
}

export interface UseSignInReturn {
  signIn: (method: SignInMethod) => Promise<void>;
}

export interface UseSignOutReturn {
  signOut: () => Promise<void>;
}

// ─── Re-export sign-in method type for convenience ───

import type { SignInMethod } from "./types.js";

export type { SignInMethod };
