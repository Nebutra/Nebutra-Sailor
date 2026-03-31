"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AuthContextProvider, type AuthContextValue } from "../context";

/**
 * NextAuth (Auth.js v5) provider wrapper for React.
 *
 * Maps NextAuth's client-side state (from next-auth/react hooks) to the unified
 * AuthContextValue. This wrapper dynamically imports NextAuth to avoid hard
 * dependency on next-auth.
 *
 * @example
 * ```tsx
 * import { NextAuthProvider } from "@nebutra/auth/react";
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <NextAuthProvider>
 *       {children}
 *     </NextAuthProvider>
 *   );
 * }
 * ```
 */
export function NextAuthProvider({
  children,
  basePath = "/api/auth",
}: {
  children: ReactNode;
  /** Base path for NextAuth routes (default: /api/auth) */
  basePath?: string;
}) {
  const [contextValue, setContextValue] = useState<AuthContextValue | null>(null);
  const [SessionProviderComponent, setSessionProviderComponent] =
    useState<React.ComponentType<any> | null>(null);
  const [useSessionHook, setUseSessionHook] = useState<(() => any) | null>(null);

  // Lazy load NextAuth components and hooks
  useEffect(() => {
    let isMounted = true;

    const loadNextAuth = async () => {
      try {
        // Attempt to load next-auth/react (optional peer dependency)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error next-auth/react is an optional peer dependency
        const nextAuthReact = (await import("next-auth/react")) as Record<string, unknown>;

        const SessionProvider = nextAuthReact.SessionProvider as
          | React.ComponentType<any>
          | undefined;
        const useSession = nextAuthReact.useSession as (() => any) | undefined;

        if (!SessionProvider || !useSession) {
          throw new Error("NextAuth components not found");
        }

        if (isMounted) {
          setSessionProviderComponent(() => SessionProvider);
          setUseSessionHook(() => useSession);
        }
      } catch (error) {
        console.error("Failed to load next-auth/react:", error);
        // NextAuth is optional; continue without it
        if (isMounted) {
          setContextValue({
            provider: "nextauth",
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

    loadNextAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // This component will be rendered inside the NextAuth provider to access hooks
  const InnerComponent = useCallback(
    ({ children }: { children: ReactNode }) => {
      if (!useSessionHook) {
        return <>{children}</>;
      }

      // Safe to call hooks here because we're inside the SessionProvider
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { data: session, status } = useSessionHook();

      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        const userId = session?.user?.id
          ? String(session.user.id)
          : (session?.user?.email ?? "unknown");

        const sessionData = session as Record<string, unknown> | undefined;

        const contextUser = session?.user
          ? {
              id: userId,
              email: session.user.email ?? undefined,
              name: session.user.name ?? undefined,
              imageUrl: session.user.image ?? undefined,
            }
          : null;

        const contextSession = session
          ? {
              userId,
              organizationId: sessionData?.organizationId
                ? String(sessionData.organizationId)
                : undefined,
              role: sessionData?.role ? String(sessionData.role) : undefined,
            }
          : null;

        setContextValue({
          provider: "nextauth",
          user: contextUser,
          session: contextSession,
          organization: null,
          membership: null,
          isLoaded: status !== "loading",
          isSignedIn: status === "authenticated",
          getToken: async () => {
            // NextAuth tokens are managed via the JWT/session callback
            // Applications should use the session directly
            return null;
          },
          signOut: async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-expect-error next-auth/react is an optional peer dependency
              const { signOut } = await import("next-auth/react");
              await signOut({ redirect: false });
            } catch (error) {
              console.error("NextAuth signOut failed:", error);
            }
          },
          setActiveOrganization: async (_orgId: string) => {
            console.warn(
              "NextAuth: setActiveOrganization is not yet implemented. " +
                "Organization switching requires custom implementation.",
            );
          },
        });
      }, [session, status]);

      if (!contextValue) return <>{children}</>;
      return <AuthContextProvider value={contextValue}>{children}</AuthContextProvider>;
    },
    [useSessionHook],
  );

  if (!SessionProviderComponent) {
    // NextAuth not available; render children without provider
    return <>{children}</>;
  }

  return (
    <SessionProviderComponent basePath={basePath}>
      <InnerComponent>{children}</InnerComponent>
    </SessionProviderComponent>
  );
}
