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

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type FeatureFlag, FLAGS } from "./index";

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

interface FeatureFlagSnapshot {
  flags: Record<string, boolean>;
}

const FEATURE_FLAGS_STALE_MS = 30_000;

let featureFlagQueryClient: QueryClient | undefined;

function getFeatureFlagQueryClient(): QueryClient {
  featureFlagQueryClient ??= new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: FEATURE_FLAGS_STALE_MS,
      },
    },
  });
  return featureFlagQueryClient;
}

function featureFlagsQueryKey(endpoint: string) {
  return ["feature-flags", endpoint] as const;
}

async function fetchFeatureFlags(
  endpoint: string,
  signal?: AbortSignal,
): Promise<FeatureFlagSnapshot> {
  const requestInit: RequestInit = { credentials: "include" };
  if (signal) {
    requestInit.signal = signal;
  }
  const res = await fetch(endpoint, requestInit);
  if (!res.ok) {
    throw new Error(`Failed to fetch feature flags (${res.status})`);
  }
  const data = (await res.json()) as Partial<FeatureFlagSnapshot>;
  return { flags: data.flags ?? {} };
}

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
  const [queryClient] = useState(getFeatureFlagQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProviderContent initialFlags={initialFlags} endpoint={endpoint}>
        {children}
      </FeatureFlagProviderContent>
    </QueryClientProvider>
  );
}

function FeatureFlagProviderContent({
  children,
  initialFlags,
  endpoint,
}: Required<FeatureFlagProviderProps>) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => featureFlagsQueryKey(endpoint), [endpoint]);
  const hasInitialFlags = Object.keys(initialFlags).length > 0;

  useEffect(() => {
    if (hasInitialFlags) {
      queryClient.setQueryData<FeatureFlagSnapshot>(queryKey, { flags: initialFlags });
    }
  }, [hasInitialFlags, initialFlags, queryClient, queryKey]);

  const flagsQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchFeatureFlags(endpoint, signal),
    enabled: !hasInitialFlags,
    initialData: hasInitialFlags ? { flags: initialFlags } : undefined,
  });

  const flags = flagsQuery.data?.flags ?? {};

  const refetch = useCallback(async () => {
    await flagsQuery.refetch();
  }, [flagsQuery]);

  const isEnabled = useCallback((flag: string) => flags[flag] ?? false, [flags]);

  return (
    <FeatureFlagContext.Provider
      value={{ flags, isLoading: flagsQuery.isFetching, isEnabled, refetch }}
    >
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
