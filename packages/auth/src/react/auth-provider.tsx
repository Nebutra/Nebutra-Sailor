"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { AuthProviderId } from "../types.js";

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
 * appropriate provider wrapper (Clerk, Better Auth, or NextAuth). Provider-specific
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
  const [ClerkProvider, setClerkProvider] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("./providers/clerk-provider.js").then((mod) => {
      setClerkProvider(() => mod.ClerkProvider);
    });
  }, []);

  if (!ClerkProvider) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={publishableKey} clerkJSUrl={clerkJSUrl}>
      {children}
    </ClerkProvider>
  );
}

/**
 * Lazy-loaded Better Auth provider wrapper.
 * Only imported when provider === "better-auth".
 */
function BetterAuthProviderLazy({ apiUrl, children }: { apiUrl?: string; children: ReactNode }) {
  const [BetterAuthProvider, setBetterAuthProvider] = useState<React.ComponentType<any> | null>(
    null,
  );

  useEffect(() => {
    import("./providers/better-auth-provider.js").then((mod) => {
      setBetterAuthProvider(() => mod.BetterAuthProvider);
    });
  }, []);

  if (!BetterAuthProvider) return <>{children}</>;
  return <BetterAuthProvider apiUrl={apiUrl}>{children}</BetterAuthProvider>;
}

/**
 * Lazy-loaded NextAuth provider wrapper.
 * Only imported when provider === "nextauth".
 */
function NextAuthProviderLazy({ basePath, children }: { basePath?: string; children: ReactNode }) {
  const [NextAuthProvider, setNextAuthProvider] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("./providers/nextauth-provider.js").then((mod) => {
      setNextAuthProvider(() => mod.NextAuthProvider);
    });
  }, []);

  if (!NextAuthProvider) return <>{children}</>;
  return <NextAuthProvider basePath={basePath}>{children}</NextAuthProvider>;
}
