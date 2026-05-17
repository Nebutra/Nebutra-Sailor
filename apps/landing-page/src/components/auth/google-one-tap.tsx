"use client";

import Script from "next/script";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";

interface GoogleOneTapProps {
  appUrl: string;
  authProvider: string;
  clientId?: string;
  clerkPublishableKey?: string;
  enabled?: boolean;
}

interface ClerkOneTapRuntime {
  ClerkProvider: ComponentType<{ children: ReactNode; publishableKey: string }>;
  GoogleOneTap: ComponentType<{
    cancelOnTapOutside?: boolean;
    fedCmSupport?: boolean;
    signInForceRedirectUrl?: string;
    signUpForceRedirectUrl?: string;
  }>;
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
    if (hostname === "app.nebutra.com" || hostname.endsWith(".nebutra.com")) {
      return "nebutra.com";
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function getDashboardUrl(appUrl: string): string {
  return new URL("/dashboard", appUrl).toString();
}

function BetterAuthOneTap({ appUrl, clientId }: { appUrl: string; clientId: string }) {
  const authBaseUrl = new URL("/api/auth", appUrl).toString();
  const callbackUrl = getDashboardUrl(appUrl);
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

function ClerkOneTap({ appUrl, publishableKey }: { appUrl: string; publishableKey: string }) {
  const dashboardUrl = getDashboardUrl(appUrl);
  const [runtime, setRuntime] = useState<ClerkOneTapRuntime | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("@clerk/nextjs")
      .then((module) => {
        if (!cancelled) {
          setRuntime({
            ClerkProvider: module.ClerkProvider as ClerkOneTapRuntime["ClerkProvider"],
            GoogleOneTap: module.GoogleOneTap as ClerkOneTapRuntime["GoogleOneTap"],
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const renderedOneTap = runtime ? (
    <runtime.ClerkProvider publishableKey={publishableKey}>
      <runtime.GoogleOneTap
        cancelOnTapOutside
        fedCmSupport
        signInForceRedirectUrl={dashboardUrl}
        signUpForceRedirectUrl={dashboardUrl}
      />
    </runtime.ClerkProvider>
  ) : null;

  return (
    <>
      <span
        data-dashboard-url={dashboardUrl}
        data-publishable-key={publishableKey}
        data-testid="clerk-google-one-tap"
        hidden
      />
      {renderedOneTap}
    </>
  );
}

export function GoogleOneTap({
  appUrl,
  authProvider,
  clientId,
  clerkPublishableKey,
  enabled = true,
}: GoogleOneTapProps) {
  if (!enabled) return null;

  if (authProvider === "better-auth") {
    if (!clientId) return null;
    return <BetterAuthOneTap appUrl={appUrl} clientId={clientId} />;
  }

  if (authProvider === "clerk") {
    if (!clerkPublishableKey) return null;
    return <ClerkOneTap appUrl={appUrl} publishableKey={clerkPublishableKey} />;
  }

  if (authProvider !== "nextauth" || !clientId) return null;

  const loginUri = new URL("/api/auth/google-one-tap", appUrl).toString();
  const stateCookieDomain = getParentDomain(appUrl);

  return (
    <>
      <div
        data-auto_prompt="true"
        data-cancel_on_tap_outside="true"
        data-client_id={clientId}
        data-context="signin"
        data-itp_support="true"
        data-login_uri={loginUri}
        data-state_cookie_domain={stateCookieDomain}
        data-testid="google-one-tap-onload"
        id="g_id_onload"
      />
      <Script
        async
        defer
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
    </>
  );
}
