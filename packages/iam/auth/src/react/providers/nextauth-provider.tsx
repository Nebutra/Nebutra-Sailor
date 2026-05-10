"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "../context";

type NextAuthSessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

type NextAuthSession = {
  user?: NextAuthSessionUser;
  expires?: string;
  organizationId?: string;
  role?: string;
};

type NextAuthClientModule = {
  SessionProvider: React.ComponentType<{
    basePath?: string;
    children: ReactNode;
  }>;
  useSession: () => {
    data: NextAuthSession | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };
  signOut: (opts?: { callbackUrl?: string; redirect?: boolean }) => Promise<unknown>;
};

/**
 * NextAuth (Auth.js v5) provider wrapper for React.
 *
 * Wraps `next-auth/react`'s `SessionProvider` and bridges its session shape
 * onto our unified AuthContextValue.
 *
 * The `next-auth` peer is loaded lazily — when it isn't installed we fall
 * back to a context that reports `isLoaded: true, isSignedIn: false` so the
 * tree still renders, but log a clear warning so the operator knows.
 */
export function NextAuthProvider({
  children,
  basePath = "/api/auth",
}: {
  children: ReactNode;
  /** Base URL of the NextAuth handler (default: /api/auth). */
  basePath?: string;
}) {
  const [mod, setMod] = useState<NextAuthClientModule | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    // `next-auth/react` is a peer dep — when consumers don't install
    // `next-auth`, the dynamic import throws and we fall through to the
    // unauthenticated context below.
    import("next-auth/react")
      .then((m) => {
        if (mounted) setMod(m as unknown as NextAuthClientModule);
      })
      .catch((error) => {
        console.warn(
          "NextAuth: failed to load `next-auth/react`. Did you install `next-auth@^5`?",
          error,
        );
        if (mounted) setLoadFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loadFailed) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("nextauth", true)}>
        {children}
      </AuthContextProvider>
    );
  }

  if (!mod) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("nextauth", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  const { SessionProvider } = mod;
  return (
    <SessionProvider basePath={basePath}>
      <NextAuthBridge mod={mod}>{children}</NextAuthBridge>
    </SessionProvider>
  );
}

function NextAuthBridge({ mod, children }: { mod: NextAuthClientModule; children: ReactNode }) {
  const { useSession, signOut } = mod;
  const session = useSession();

  const buildContext = useCallback((): AuthContextValue => {
    const data = session.data;
    const user = data?.user
      ? {
          id: String(data.user.id ?? ""),
          email: data.user.email ?? undefined,
          name: data.user.name ?? undefined,
          imageUrl: data.user.image ?? undefined,
        }
      : null;

    return {
      provider: "nextauth",
      user,
      session: data?.user
        ? {
            userId: String(data.user.id ?? ""),
            organizationId: data.organizationId,
            role: data.role,
          }
        : null,
      organization: null,
      membership: null,
      isLoaded: session.status !== "loading",
      isSignedIn: session.status === "authenticated",
      getToken: async () => null,
      signOut: async () => {
        try {
          await signOut({ redirect: false });
        } catch (error) {
          console.error("NextAuth signOut failed:", error);
        }
      },
      setActiveOrganization: async () => {
        console.warn(
          "NextAuth: setActiveOrganization is not implemented. " +
            "Persist the active org server-side and surface it via the session callback.",
        );
      },
    };
  }, [session.data, session.status, signOut]);

  return <AuthContextProvider value={buildContext()}>{children}</AuthContextProvider>;
}
