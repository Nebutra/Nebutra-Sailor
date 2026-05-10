"use client";

/**
 * PostHog analytics provider.
 *
 * Optional — if NEXT_PUBLIC_POSTHOG_KEY is missing the component is a passthrough
 * with zero runtime cost. Configures pageview capture for Next.js App Router
 * (history_change captures client-side navigations).
 *
 * TODO(auth): once Clerk's useUser hook is reachable from this layer, identify
 * the user via posthog.identify(user.id, { email }). Skipped here to keep the
 * provider auth-agnostic.
 */
import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

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

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
