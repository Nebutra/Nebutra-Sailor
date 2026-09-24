"use client";

import { brand } from "@nebutra/brand/metadata";
import { useEffect } from "react";

interface GoogleOneTapProps {
  appUrl: string;
  authProvider: string;
  clientId?: string;
  enabled?: boolean;
}

interface BetterAuthClient {
  oneTap?: (options?: {
    callbackURL?: string;
    cancelOnTapOutside?: boolean;
    context?: "signin" | "signup" | "use";
  }) => Promise<void>;
}

interface BetterAuthClientModule {
  createAuthClient: (options: { baseURL: string; plugins: unknown[] }) => BetterAuthClient;
}

interface BetterAuthPluginsModule {
  oneTapClient: (options: {
    additionalOptions?: Record<string, unknown>;
    cancelOnTapOutside?: boolean;
    clientId: string;
    context?: "signin" | "signup" | "use";
  }) => unknown;
}

function getParentDomain(appUrl: string): string | undefined {
  try {
    const hostname = new URL(appUrl).hostname;
    const appHost = brand.domains.app;
    const apex = brand.domains.landing;
    if (hostname === appHost || hostname.endsWith(`.${apex}`) || hostname === apex) {
      return apex;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function getPostLoginUrl(appUrl: string): string {
  return new URL("/workspace", appUrl).toString();
}

function BetterAuthOneTap({ appUrl, clientId }: { appUrl: string; clientId: string }) {
  const authBaseUrl = new URL("/api/auth", appUrl).toString();
  const callbackUrl = getPostLoginUrl(appUrl);
  const stateCookieDomain = getParentDomain(appUrl);

  useEffect(() => {
    let cancelled = false;

    async function openOneTap() {
      const [{ createAuthClient }, { oneTapClient }] = (await Promise.all([
        import("better-auth/client") as Promise<BetterAuthClientModule>,
        import("better-auth/client/plugins") as Promise<BetterAuthPluginsModule>,
      ])) as [BetterAuthClientModule, BetterAuthPluginsModule];

      if (cancelled) return;

      const authClient = createAuthClient({
        baseURL: authBaseUrl,
        plugins: [
          oneTapClient({
            clientId,
            cancelOnTapOutside: true,
            context: "signin",
            ...(stateCookieDomain
              ? { additionalOptions: { state_cookie_domain: stateCookieDomain } }
              : {}),
          }),
        ],
      });

      await authClient.oneTap?.({
        callbackURL: callbackUrl,
        cancelOnTapOutside: true,
        context: "signin",
      });
    }

    void openOneTap().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authBaseUrl, callbackUrl, clientId, stateCookieDomain]);

  return (
    <span
      data-auth-base-url={authBaseUrl}
      data-callback-url={callbackUrl}
      data-state-cookie-domain={stateCookieDomain}
      data-testid="better-auth-google-one-tap"
      hidden
    />
  );
}

export function GoogleOneTap({
  appUrl,
  authProvider,
  clientId,
  enabled = true,
}: GoogleOneTapProps) {
  if (!enabled) return null;
  if (authProvider !== "better-auth" || !clientId) return null;

  return <BetterAuthOneTap appUrl={appUrl} clientId={clientId} />;
}
