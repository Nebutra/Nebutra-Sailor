"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "../context";

type ClerkProviderRuntimeProps = {
  publishableKey?: string;
  clerkJSUrl?: string;
  children: ReactNode;
};

type ClerkAuthState = {
  userId?: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  getToken?: () => Promise<string | null>;
  signOut?: () => Promise<void>;
};

type ClerkUserState = {
  isLoaded?: boolean;
  user?: {
    id: string;
    emailAddresses?: Array<{ emailAddress?: string | null }> | null;
    fullName?: string | null;
    imageUrl?: string | null;
  } | null;
};

type ClerkOrganizationState = {
  organization?: {
    id: string;
    name: string;
    slug: string;
    setActive?: (input: { organization: string }) => Promise<void>;
  } | null;
  membership?: {
    role: string;
  } | null;
};

type ClerkAuthHook = () => ClerkAuthState;
type ClerkUserHook = () => ClerkUserState;
type ClerkOrganizationHook = () => ClerkOrganizationState | null | undefined;

type ClerkRuntime = {
  Provider: React.ComponentType<ClerkProviderRuntimeProps>;
  useAuth: ClerkAuthHook;
  useUser: ClerkUserHook;
  useOrganization: ClerkOrganizationHook;
};

const useEmptyClerkOrganization: ClerkOrganizationHook = () => null;

function ClerkContextBridge({
  children,
  useAuth,
  useUser,
  useOrganization,
}: {
  children: ReactNode;
  useAuth: ClerkAuthHook;
  useUser: ClerkUserHook;
  useOrganization: ClerkOrganizationHook;
}) {
  const auth = useAuth();
  const user = useUser();
  const organization = useOrganization();

  const contextValue: AuthContextValue = {
    provider: "clerk",
    user: user.user
      ? {
          id: user.user.id,
          email: user.user.emailAddresses?.[0]?.emailAddress ?? undefined,
          name: user.user.fullName ?? undefined,
          imageUrl: user.user.imageUrl ?? undefined,
        }
      : null,
    session: auth.userId
      ? {
          userId: auth.userId,
          organizationId: auth.orgId ?? undefined,
          role: auth.orgRole ?? undefined,
        }
      : null,
    organization: organization?.organization
      ? {
          id: organization.organization.id,
          name: organization.organization.name,
          slug: organization.organization.slug,
        }
      : null,
    membership: organization?.membership
      ? {
          role: organization.membership.role,
        }
      : null,
    isLoaded: user.isLoaded ?? false,
    isSignedIn: !!user.user,
    getToken: async () => {
      try {
        const token = await auth.getToken?.();
        return typeof token === "string" ? token : null;
      } catch {
        return null;
      }
    },
    signOut: async () => {
      try {
        await auth.signOut?.();
      } catch (error) {
        console.error("Clerk signOut failed:", error);
      }
    },
    setActiveOrganization: async (orgId: string) => {
      try {
        await organization?.organization?.setActive?.({ organization: orgId });
      } catch (error) {
        console.error("Clerk setActiveOrganization failed:", error);
      }
    },
  };

  return <AuthContextProvider value={contextValue}>{children}</AuthContextProvider>;
}

/**
 * Clerk provider wrapper for React.
 *
 * Maps Clerk's client-side state (from @clerk/nextjs hooks) to the unified
 * AuthContextValue. This wrapper dynamically imports Clerk to avoid hard
 * dependency on @clerk/nextjs.
 *
 * @example
 * ```tsx
 * import { ClerkProvider } from "@nebutra/auth/react";
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
 *       {children}
 *     </ClerkProvider>
 *   );
 * }
 * ```
 */
export function ClerkProvider({
  children,
  publishableKey,
  clerkJSUrl,
}: {
  children: ReactNode;
  /** Clerk publishable key (from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) */
  publishableKey?: string;
  /** Optional custom Clerk.js URL */
  clerkJSUrl?: string;
}) {
  const [fallbackContextValue, setFallbackContextValue] = useState<AuthContextValue>(() =>
    createUnauthenticatedAuthContext("clerk", false),
  );
  const [runtime, setRuntime] = useState<ClerkRuntime | null>(null);

  // Lazy load Clerk components and hooks
  useEffect(() => {
    let isMounted = true;

    const loadClerk = async () => {
      try {
        // Attempt to load @clerk/nextjs
        const clerks = (await import("@clerk/nextjs")) as Record<string, unknown>;
        const clerkReact = (await import("@clerk/react")) as Record<string, unknown>;

        const Provider = clerks.ClerkProvider as ClerkRuntime["Provider"] | undefined;
        const useAuth = clerkReact.useAuth as ClerkAuthHook | undefined;
        const useUser = clerkReact.useUser as ClerkUserHook | undefined;
        const useOrganization = clerkReact.useOrganization as ClerkOrganizationHook | undefined;

        if (!Provider || !useAuth || !useUser) {
          throw new Error("Clerk components not found");
        }

        if (isMounted) {
          setRuntime({
            Provider,
            useAuth,
            useUser,
            useOrganization: useOrganization ?? useEmptyClerkOrganization,
          });
        }
      } catch (error) {
        console.error("Failed to load @clerk/nextjs:", error);
        // Clerk is optional; continue without it
        if (isMounted) {
          setFallbackContextValue(createUnauthenticatedAuthContext("clerk", true));
        }
      }
    };

    loadClerk();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!runtime) {
    return <AuthContextProvider value={fallbackContextValue}>{children}</AuthContextProvider>;
  }

  const clerkProps: ClerkProviderRuntimeProps = {
    children: (
      <ClerkContextBridge
        useAuth={runtime.useAuth}
        useOrganization={runtime.useOrganization}
        useUser={runtime.useUser}
      >
        {children}
      </ClerkContextBridge>
    ),
  };
  if (publishableKey) clerkProps.publishableKey = publishableKey;
  if (clerkJSUrl) clerkProps.clerkJSUrl = clerkJSUrl;

  return <runtime.Provider {...clerkProps} />;
}
