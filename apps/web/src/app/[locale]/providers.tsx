"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { usePathname } from "next/navigation";

const DEVTOOLS_BLOCKLIST_PATHS = ["/startup-os"] as const;

export function shouldRenderReactQueryDevtools(
  pathname: string | null,
  env = process.env.NODE_ENV,
) {
  return (
    env === "development" &&
    !DEVTOOLS_BLOCKLIST_PATHS.some((blockedPath) => pathname?.includes(blockedPath))
  );
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, staleTime > 0 prevents immediate refetch on hydration
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const pathname = usePathname();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {shouldRenderReactQueryDevtools(pathname) && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
