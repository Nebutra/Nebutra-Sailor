"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AuthContextProvider,
  type AuthContextValue,
  createUnauthenticatedAuthContext,
} from "../context";

type SupabaseUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
};

type SupabaseSession = {
  access_token?: string;
  user?: SupabaseUser | null;
};

type SupabaseAuthClient = {
  auth: {
    getSession: () => Promise<{ data: { session: SupabaseSession | null }; error?: unknown }>;
    onAuthStateChange: (callback: (event: string, session: SupabaseSession | null) => void) => {
      data?: {
        subscription?: {
          unsubscribe: () => void;
        };
      };
    };
    signOut: () => Promise<{ error?: unknown }>;
  };
};

type SupabaseClientModule = {
  createClient: (url: string, anonKey: string) => SupabaseAuthClient;
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function mapSession(session: SupabaseSession | null): AuthContextValue {
  const user = session?.user ?? null;
  const metadata = user?.user_metadata ?? {};
  const name = readString(metadata.full_name) ?? readString(metadata.name);
  const imageUrl = readString(metadata.avatar_url) ?? readString(metadata.picture);

  return {
    provider: "supabase",
    user: user
      ? {
          id: user.id,
          email: user.email ?? undefined,
          name,
          imageUrl,
        }
      : null,
    session: user ? { userId: user.id } : null,
    organization: null,
    membership: null,
    isLoaded: true,
    isSignedIn: Boolean(user),
    getToken: async () => session?.access_token ?? null,
    signOut: async () => {},
    setActiveOrganization: async () => {
      console.warn(
        "Supabase: setActiveOrganization is not implemented. Use @nebutra/tenant and RLS.",
      );
    },
  };
}

/**
 * Supabase Auth provider wrapper for React.
 *
 * The Supabase JS peer is loaded lazily so Clerk/Better Auth/NextAuth builds
 * do not bundle it. Supabase has no first-class organization model; Nebutra
 * tenant context should be hydrated separately through @nebutra/tenant + RLS.
 */
export function SupabaseProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
}: {
  children: ReactNode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}) {
  const [client, setClient] = useState<SupabaseAuthClient | null>(null);
  const [context, setContext] = useState<AuthContextValue>(
    createUnauthenticatedAuthContext("supabase", false),
  );

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    const url = supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.warn(
        "Supabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
      );
      setContext(createUnauthenticatedAuthContext("supabase", true));
      return;
    }

    import("@supabase/supabase-js")
      .then((mod) => {
        if (!mounted) return;
        const supabase = (mod as unknown as SupabaseClientModule).createClient(url, anonKey);
        setClient(supabase);
        supabase.auth.getSession().then(({ data }) => {
          if (mounted) setContext(mapSession(data.session));
        });
        const listener = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) setContext(mapSession(session));
        });
        unsubscribe = () => listener.data?.subscription?.unsubscribe();
      })
      .catch((error) => {
        console.warn(
          "Supabase: failed to load `@supabase/supabase-js`. Did you install it?",
          error,
        );
        if (mounted) setContext(createUnauthenticatedAuthContext("supabase", true));
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [supabaseAnonKey, supabaseUrl]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...context,
      signOut: async () => {
        if (!client) return;
        await client.auth.signOut();
      },
    }),
    [client, context],
  );

  return <AuthContextProvider value={value}>{children}</AuthContextProvider>;
}
