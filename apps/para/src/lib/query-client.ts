import { QueryClient } from "@tanstack/react-query";

/**
 * One QueryClient per browser tab, so code outside React — the job stream that records a
 * generated asset — can write into the same cache the canvas and the gallery read from.
 * The server gets a fresh client per render; a module singleton there would leak one user's
 * data into another's request.
 */
function make(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });
}

let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return make();
  browserClient ??= make();
  return browserClient;
}
