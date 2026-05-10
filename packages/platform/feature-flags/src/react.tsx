/**
 * @nebutra/feature-flags/react — Client-side React hooks for feature flags
 *
 * Usage (Client Component):
 *   "use client";
 *   import { useFeatureFlag } from "@nebutra/feature-flags/react";
 *
 *   function MyComponent() {
 *     const isEnabled = useFeatureFlag("ai-streaming");
 *     if (!isEnabled) return null;
 *     return <StreamingChat />;
 *   }
 *
 * The flags are fetched once per session from /api/v1/feature-flags and cached
 * in React context. For SSR, pass initialFlags from the server component.
 */

"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { type FeatureFlag, FLAGS } from "./index.js";

// ── Context ────────────────────────────────────────────────────────────────

interface FeatureFlagContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (flag: string) => boolean;
  refetch: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  flags: {},
  isLoading: false,
  isEnabled: () => false,
  refetch: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────

interface FeatureFlagProviderProps {
  children: ReactNode;
  /**
   * Initial flag state (from server-side evaluation).
   * Pass this to hydrate the client without an extra round-trip.
   */
  initialFlags?: Record<string, boolean>;
  /**
   * API endpoint to fetch feature flags from.
   * Must return { flags: Record<string, boolean> }.
   * Defaults to /api/v1/feature-flags.
   */
  endpoint?: string;
}

export function FeatureFlagProvider({
  children,
  initialFlags = {},
  endpoint = "/api/v1/feature-flags",
}: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [isLoading, setIsLoading] = useState(Object.keys(initialFlags).length === 0);

  const fetchFlags = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { flags: Record<string, boolean> };
        setFlags(data.flags ?? {});
      }
    } catch {
      // Network failure — keep existing flags, degrade gracefully
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    // Only fetch if we didn't get SSR-initialised flags
    if (Object.keys(initialFlags).length === 0) {
      void fetchFlags();
    }
  }, [fetchFlags, initialFlags]);

  const isEnabled = useCallback((flag: string) => flags[flag] ?? false, [flags]);

  return (
    <FeatureFlagContext.Provider value={{ flags, isLoading, isEnabled, refetch: fetchFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Returns true if a feature flag is enabled for the current user/tenant.
 *
 * @example
 *   const isStreamingEnabled = useFeatureFlag("ai-streaming");
 *   const isStreamingEnabled = useFeatureFlag(FLAGS.AI_STREAMING); // type-safe
 */
export function useFeatureFlag(flag: FeatureFlag | string): boolean {
  const ctx = useContext(FeatureFlagContext);
  return ctx.isEnabled(flag);
}

/**
 * Returns the full feature flags map and loading state.
 * Useful for rendering a dev-mode flags panel.
 */
export function useFeatureFlags(): {
  flags: Record<string, boolean>;
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const { flags, isLoading, refetch } = useContext(FeatureFlagContext);
  return { flags, isLoading, refetch };
}

/**
 * Convenience hook: returns a typed subset of flags by key.
 *
 * @example
 *   const { AI_STREAMING, API_V2 } = useFlags(["AI_STREAMING", "API_V2"]);
 */
export function useFlags<K extends keyof typeof FLAGS>(keys: K[]): Record<K, boolean> {
  const { isEnabled } = useContext(FeatureFlagContext);
  return Object.fromEntries(keys.map((k) => [k, isEnabled(FLAGS[k])])) as Record<K, boolean>;
}

// Re-export for convenience
export { type FeatureFlag, FLAGS };
