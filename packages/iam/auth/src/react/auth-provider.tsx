"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { AuthProviderId } from "../types";
import { AuthContextProvider, createUnauthenticatedAuthContext } from "./context";

type ClerkProviderLazyComponent = React.ComponentType<{
  publishableKey?: string;
  clerkJSUrl?: string;
  children: ReactNode;
}>;

type BetterAuthProviderLazyComponent = React.ComponentType<{
  apiUrl?: string;
  children: ReactNode;
}>;

type NextAuthProviderLazyComponent = React.ComponentType<{
  basePath?: string;
  children: ReactNode;
}>;

type SupabaseProviderLazyComponent = React.ComponentType<{
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  children: ReactNode;
}>;

type DevProviderLazyComponent = React.ComponentType<{
  children: ReactNode;
}>;

/**
 * Props for the root AuthProvider component.
 */
export interface AuthProviderProps {
  /** Which auth provider to use. */
  provider: AuthProviderId;

  /** React component tree to wrap with auth context. */
  children: ReactNode;

  /** Optional provider-specific configuration. */
  config?: Record<string, unknown>;
}

/**
 * Root auth provider component — automatically selects the right provider wrapper.
 *
 * This component detects the configured provider and dynamically renders the
 * appropriate provider wrapper. Provider-specific
 * dependencies are imported lazily, so unused providers never get bundled.
 *
 * @example
 * ```tsx
 * import { AuthProvider } from "@nebutra/auth/react";
 *
 * const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
 *
 * export default function RootLayout({ children }: { children: ReactNode }) {
 *   return (
 *     <AuthProvider provider={provider as any} config={{ ... }}>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ provider, children, config }: AuthProviderProps) {
  // Provider selection logic — rendered dynamically
  if (provider === "clerk") {
    // Lazy-load Clerk provider only if clerk is selected
    // This avoids bundling @clerk/nextjs for projects using other providers
    const publishableKey = config?.publishableKey as string | undefined;
    const clerkJSUrl = config?.clerkJSUrl as string | undefined;
    const clerkProps: { publishableKey?: string; clerkJSUrl?: string; children: ReactNode } = {
      children,
    };
    if (publishableKey) clerkProps.publishableKey = publishableKey;
    if (clerkJSUrl) clerkProps.clerkJSUrl = clerkJSUrl;
    return <ClerkProviderLazy {...clerkProps} />;
  }

  if (provider === "better-auth") {
    const apiUrl = (config?.apiUrl as string) || "/api/auth";
    return <BetterAuthProviderLazy apiUrl={apiUrl}>{children}</BetterAuthProviderLazy>;
  }

  if (provider === "nextauth") {
    const basePath = (config?.basePath as string) || "/api/auth";
    return <NextAuthProviderLazy basePath={basePath}>{children}</NextAuthProviderLazy>;
  }

  if (provider === "supabase") {
    const supabaseUrl = config?.supabaseUrl as string | undefined;
    const supabaseAnonKey = config?.supabaseAnonKey as string | undefined;
    const supabaseProps: {
      supabaseUrl?: string;
      supabaseAnonKey?: string;
      children: ReactNode;
    } = { children };
    if (supabaseUrl) supabaseProps.supabaseUrl = supabaseUrl;
    if (supabaseAnonKey) supabaseProps.supabaseAnonKey = supabaseAnonKey;
    return <SupabaseProviderLazy {...supabaseProps} />;
  }

  if (provider === "dev") {
    return <DevProviderLazy>{children}</DevProviderLazy>;
  }

  console.error(`Unknown auth provider: ${String(provider)}`);
  return <>{children}</>;
}

/**
 * Lazy-loaded Clerk provider wrapper.
 * Only imported when provider === "clerk".
 */
function ClerkProviderLazy({
  publishableKey,
  clerkJSUrl,
  children,
}: {
  publishableKey?: string;
  clerkJSUrl?: string;
  children: ReactNode;
}) {
  const [ClerkProvider, setClerkProvider] = useState<ClerkProviderLazyComponent | null>(null);

  useEffect(() => {
    import("./providers/clerk-provider").then((mod) => {
      setClerkProvider(() => mod.ClerkProvider);
    });
  }, []);

  if (!ClerkProvider) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("clerk", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  const clerkProps: { publishableKey?: string; clerkJSUrl?: string; children: ReactNode } = {
    children,
  };
  if (publishableKey) clerkProps.publishableKey = publishableKey;
  if (clerkJSUrl) clerkProps.clerkJSUrl = clerkJSUrl;

  return <ClerkProvider {...clerkProps} />;
}

/**
 * Lazy-loaded Better Auth provider wrapper.
 * Only imported when provider === "better-auth".
 */
function BetterAuthProviderLazy({ apiUrl, children }: { apiUrl?: string; children: ReactNode }) {
  const [BetterAuthProvider, setBetterAuthProvider] =
    useState<BetterAuthProviderLazyComponent | null>(null);

  useEffect(() => {
    import("./providers/better-auth-provider").then((mod) => {
      setBetterAuthProvider(() => mod.BetterAuthProvider);
    });
  }, []);

  if (!BetterAuthProvider) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("better-auth", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  const betterAuthProps: { apiUrl?: string; children: ReactNode } = { children };
  if (apiUrl) betterAuthProps.apiUrl = apiUrl;

  return <BetterAuthProvider {...betterAuthProps} />;
}

/**
 * Lazy-loaded NextAuth (Auth.js v5) provider wrapper.
 * Only imported when provider === "nextauth".
 */
function NextAuthProviderLazy({ basePath, children }: { basePath?: string; children: ReactNode }) {
  const [NextAuthProvider, setNextAuthProvider] = useState<NextAuthProviderLazyComponent | null>(
    null,
  );

  useEffect(() => {
    import("./providers/nextauth-provider").then((mod) => {
      setNextAuthProvider(() => mod.NextAuthProvider);
    });
  }, []);

  if (!NextAuthProvider) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("nextauth", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  const props: { basePath?: string; children: ReactNode } = { children };
  if (basePath) props.basePath = basePath;

  return <NextAuthProvider {...props} />;
}

/**
 * Lazy-loaded Supabase provider wrapper.
 * Only imported when provider === "supabase".
 */
function SupabaseProviderLazy({
  supabaseUrl,
  supabaseAnonKey,
  children,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  children: ReactNode;
}) {
  const [SupabaseProvider, setSupabaseProvider] = useState<SupabaseProviderLazyComponent | null>(
    null,
  );

  useEffect(() => {
    import("./providers/supabase-provider").then((mod) => {
      setSupabaseProvider(() => mod.SupabaseProvider);
    });
  }, []);

  if (!SupabaseProvider) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("supabase", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  const props: { supabaseUrl?: string; supabaseAnonKey?: string; children: ReactNode } = {
    children,
  };
  if (supabaseUrl) props.supabaseUrl = supabaseUrl;
  if (supabaseAnonKey) props.supabaseAnonKey = supabaseAnonKey;

  return <SupabaseProvider {...props} />;
}

/**
 * Lazy-loaded dev fixture provider. Mounts an authenticated AuthContext
 * with a synthetic user. Production loading is hard-blocked inside the
 * provider module itself.
 */
function DevProviderLazy({ children }: { children: ReactNode }) {
  const [DevProvider, setDevProvider] = useState<DevProviderLazyComponent | null>(null);

  useEffect(() => {
    import("./providers/dev-provider").then((mod) => {
      setDevProvider(() => mod.DevProvider);
    });
  }, []);

  if (!DevProvider) {
    return (
      <AuthContextProvider value={createUnauthenticatedAuthContext("dev", false)}>
        {children}
      </AuthContextProvider>
    );
  }

  return <DevProvider>{children}</DevProvider>;
}
