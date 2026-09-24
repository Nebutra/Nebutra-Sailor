"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { AuthProviderId } from "../types";
import { AuthContextProvider, createUnauthenticatedAuthContext } from "./context";

type BetterAuthProviderLazyComponent = React.ComponentType<{
  apiUrl?: string;
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
  if (provider === "better-auth") {
    const apiUrl = (config?.apiUrl as string) || "/api/auth";
    return <BetterAuthProviderLazy apiUrl={apiUrl}>{children}</BetterAuthProviderLazy>;
  }

  if (provider === "dev") {
    return <DevProviderLazy>{children}</DevProviderLazy>;
  }

  console.error(`Unknown auth provider: ${String(provider)}`);
  return <>{children}</>;
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
