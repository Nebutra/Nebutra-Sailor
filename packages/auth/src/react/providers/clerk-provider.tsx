"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContextProvider, type AuthContextValue } from "../context";

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
  const [contextValue, setContextValue] = useState<AuthContextValue | null>(null);
  const [ClerkProviderComponent, setClerkProviderComponent] =
    useState<React.ComponentType<any> | null>(null);
  const [useAuthHook, setUseAuthHook] = useState<(() => any) | null>(null);
  const [useUserHook, setUseUserHook] = useState<(() => any) | null>(null);
  const [useOrganizationHook, setUseOrganizationHook] = useState<(() => any) | null>(null);

  // Lazy load Clerk components and hooks
  useEffect(() => {
    let isMounted = true;

    const loadClerk = async () => {
      try {
        // Attempt to load @clerk/nextjs
        const clerks = (await import("@clerk/nextjs")) as Record<string, unknown>;
        const clerkReact = (await import("@clerk/react")) as Record<string, unknown>;

        const Provider = clerks.ClerkProvider as React.ComponentType<any> | undefined;
        const useAuth = clerkReact.useAuth as (() => any) | undefined;
        const useUser = clerkReact.useUser as (() => any) | undefined;
        const useOrganization = clerkReact.useOrganization as (() => any) | undefined;

        if (!Provider || !useAuth || !useUser) {
          throw new Error("Clerk components not found");
        }

        if (isMounted) {
          setClerkProviderComponent(() => Provider);
          setUseAuthHook(() => useAuth);
          setUseUserHook(() => useUser);
          setUseOrganizationHook(() => useOrganization ?? null);
        }
      } catch (error) {
        console.error("Failed to load @clerk/nextjs:", error);
        // Clerk is optional; continue without it
        if (isMounted) {
          setContextValue({
            provider: "clerk",
            user: null,
            session: null,
            organization: null,
            membership: null,
            isLoaded: true,
            isSignedIn: false,
            getToken: async () => null,
            signOut: async () => {},
            setActiveOrganization: async () => {},
          });
        }
      }
    };

    loadClerk();

    return () => {
      isMounted = false;
    };
  }, []);

  // This component will be rendered inside the Clerk provider to access hooks
  const InnerComponent = useCallback(
    ({ children }: { children: ReactNode }) => {
      if (!useAuthHook) {
        return <>{children}</>;
      }

      // Safe to call hooks here because we're inside the Clerk provider
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const auth = useAuthHook();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const user = useUserHook?.();
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const organization = useOrganizationHook?.();

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        setContextValue({
          provider: "clerk",
          user: user?.user
            ? {
                id: user.user.id,
                email: user.user.emailAddresses?.[0]?.emailAddress ?? undefined,
                name: user.user.fullName ?? undefined,
                imageUrl: user.user.imageUrl ?? undefined,
              }
            : null,
          session: auth?.userId
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
          isLoaded: user?.isLoaded ?? false,
          isSignedIn: !!user?.user,
          getToken: async () => {
            try {
              const token = await auth?.getToken?.();
              return typeof token === "string" ? token : null;
            } catch {
              return null;
            }
          },
          signOut: async () => {
            try {
              await auth?.signOut?.();
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
        });
      }, [auth, user, organization]);

      if (!contextValue) return <>{children}</>;
      return <AuthContextProvider value={contextValue}>{children}</AuthContextProvider>;
    },
    [useAuthHook, useUserHook, useOrganizationHook],
  );

  if (!ClerkProviderComponent) {
    // Clerk not available; render children without provider
    return <>{children}</>;
  }

  const clerkProps: Record<string, any> = {};
  if (publishableKey) clerkProps.publishableKey = publishableKey;
  if (clerkJSUrl) clerkProps.clerkJSUrl = clerkJSUrl;

  return (
    <ClerkProviderComponent {...clerkProps}>
      <InnerComponent>{children}</InnerComponent>
    </ClerkProviderComponent>
  );
}
