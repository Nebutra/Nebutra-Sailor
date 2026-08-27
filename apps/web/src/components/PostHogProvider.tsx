"use client";

import { useAuth } from "@nebutra/auth/client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
/**
 * PostHog analytics provider.
 *
 * Optional — if NEXT_PUBLIC_POSTHOG_KEY is missing the component is a passthrough
 * with zero runtime cost. Configures pageview capture for Next.js App Router
 * (history_change captures client-side navigations).
 *
 * Identity is synchronized via the provider-agnostic `@nebutra/auth/client`
 * context. Do not import Clerk/Better Auth SDKs here.
 */
import { useEffect, useRef } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (typeof window === "undefined") return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: "history_change",
      capture_pageleave: true,
      person_profiles: "identified_only",
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") {
          ph.debug(false);
        }
      },
    });
  }, []);

  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogIdentityBridge />
      {children}
    </PHProvider>
  );
}

function PostHogIdentityBridge() {
  const { isLoaded, isSignedIn, user, organization, membership, provider } = useAuth();
  const identifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (!isLoaded) return;

    if (!isSignedIn || !user?.id) {
      if (identifiedUserIdRef.current) {
        posthog.reset();
        identifiedUserIdRef.current = null;
      }
      return;
    }

    posthog.identify(user.id, {
      ...(user.email ? { email: user.email } : {}),
      ...(user.name ? { name: user.name } : {}),
      ...(organization?.id ? { organizationId: organization.id } : {}),
      ...(organization?.slug ? { organizationSlug: organization.slug } : {}),
      ...(membership?.role ? { role: membership.role } : {}),
      authProvider: provider,
    });
    identifiedUserIdRef.current = user.id;
  }, [isLoaded, isSignedIn, user, organization, membership, provider]);

  return null;
}
