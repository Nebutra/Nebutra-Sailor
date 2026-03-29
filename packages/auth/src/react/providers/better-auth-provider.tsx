"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContextProvider, type AuthContextValue } from "../context";

/**
 * Better Auth provider wrapper for React.
 *
 * Maps Better Auth client-side state to the unified AuthContextValue.
 * Uses the better-auth/react client SDK to manage sessions.
 *
 * @example
 * ```tsx
 * import { BetterAuthProvider } from "@nebutra/auth/react";
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <BetterAuthProvider>
 *       {children}
 *     </BetterAuthProvider>
 *   );
 * }
 * ```
 */
export function BetterAuthProvider({
  children,
  apiUrl = "/api/auth",
}: {
  children: ReactNode;
  /** Base URL for Better Auth API endpoints (default: /api/auth) */
  apiUrl?: string;
}) {
  const [contextValue, setContextValue] = useState<AuthContextValue | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Lazy load the Better Auth client
  const getAuthClient = useCallback(async () => {
    try {
      const { createAuthClient } = await import("better-auth/react");
      return createAuthClient({
        baseURL: apiUrl,
      });
    } catch (error) {
      console.error("Failed to load better-auth/react client:", error);
      return null;
    }
  }, [apiUrl]);

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const client = await getAuthClient();
        if (!client) {
          if (isMounted) {
            setContextValue({
              provider: "better-auth",
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
            setIsInitialized(true);
          }
          return;
        }

        // Get initial session
        const session = await client.getSession();
        const user = session?.data?.user ?? null;

        if (isMounted) {
          const contextUser = user
            ? {
                id: user.id,
                email: user.email ?? undefined,
                name: user.name ?? undefined,
                imageUrl: user.image ?? undefined,
              }
            : null;

          const sessionData = session?.data as Record<string, unknown> | undefined;
          const contextSession = session?.data
            ? {
                userId: session.data.user.id,
                organizationId: sessionData?.organizationId
                  ? String(sessionData.organizationId)
                  : undefined,
                role: sessionData?.role ? String(sessionData.role) : undefined,
              }
            : null;

          setContextValue({
            provider: "better-auth",
            user: contextUser,
            session: contextSession,
            organization: null,
            membership: null,
            isLoaded: true,
            isSignedIn: !!user,
            getToken: async () => {
              // Better Auth manages tokens internally; return null
              // Applications should rely on cookies for token management
              return null;
            },
            signOut: async () => {
              try {
                await client.signOut();
              } catch (error) {
                console.error("Better Auth signOut failed:", error);
              }
            },
            setActiveOrganization: async (_orgId: string) => {
              console.warn(
                "Better Auth: setActiveOrganization is not yet implemented. " +
                  "Organization switching requires custom implementation.",
              );
            },
          });
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Failed to initialize Better Auth:", error);
        if (isMounted) {
          setContextValue({
            provider: "better-auth",
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
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [getAuthClient]);

  if (!isInitialized || !contextValue) {
    return <>{children}</>;
  }

  return <AuthContextProvider value={contextValue}>{children}</AuthContextProvider>;
}
