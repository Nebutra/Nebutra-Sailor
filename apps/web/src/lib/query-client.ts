import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

/**
 * Returns a per-request QueryClient on the server.
 *
 * React's `cache()` ensures that each incoming server request gets its own
 * isolated QueryClient instance (not shared across concurrent requests), while
 * multiple calls within the same request safely return the same instance.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          // With SSR, staleTime > 0 prevents an immediate refetch on hydration
          staleTime: 60 * 1000,
        },
      },
    }),
);
