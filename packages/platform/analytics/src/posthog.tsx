"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { type ReactNode, Suspense, useCallback, useEffect } from "react";

// ============================================================================
// PostHog Provider
// ============================================================================

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

    if (!key) return;

    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: false, // Manual pageview tracking via PageviewTracker
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// ============================================================================
// Pageview Tracker (Next.js App Router compatible)
// ============================================================================

export function PageviewTracker() {
  const _pathname = usePathname();
  const _searchParams = useSearchParams();

  useEffect(() => {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
    });
  }, []);

  return null;
}

// ============================================================================
// Hook
// ============================================================================

export function useAnalytics() {
  const ph = usePostHog();

  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      ph?.capture(event, properties);
    },
    [ph],
  );

  return { track };
}
