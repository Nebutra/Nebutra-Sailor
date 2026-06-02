import { useMediaQuery as useMediaQueryBase } from "usehooks-ts";

/**
 * Hook to detect media query matches.
 *
 * Delegates to usehooks-ts `useMediaQuery` with `initializeWithValue: false`
 * so the initial render always returns `false` — SSR-safe, matching the
 * previous hand-rolled behaviour (no `window` access during SSR/hydration).
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 768px)");
 * const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  return useMediaQueryBase(query, { initializeWithValue: false });
}
