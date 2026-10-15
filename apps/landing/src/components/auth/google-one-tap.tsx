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

/**
 * How long after the page has loaded the prompt is fetched. One Tap is the
 * heaviest thing a marketing page asks for — the Better Auth client chunks and
 * Google's ~90 KB GSI script, which then evaluates on the main thread — and it
 * is never what the visitor came to read. Fetching it once the page has
 * settled keeps it off the first load (LCP, TBT, and the first interactions).
 */
const ONE_TAP_DELAY_MS = 3000;

/** Run `task` once the page has loaded, waited `delayMs`, and the main thread is idle. */
function whenPageSettles(task: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  const schedule = () => {
    timer = setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(task, { timeout: 2000 });
      } else {
        task();
      }
    }, delayMs);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    window.removeEventListener("load", schedule);
    if (timer !== undefined) clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback?.(idle);
  };
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

    const cancelSchedule = whenPageSettles(() => {
      void openOneTap().catch(() => undefined);
    }, ONE_TAP_DELAY_MS);
    return () => {
      cancelled = true;
      cancelSchedule();
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
