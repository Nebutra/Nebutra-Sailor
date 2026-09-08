"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, Suspense, useState } from "react";
import { CommandMenu } from "@/components/shell/command-menu";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Suspense: CommandMenu reads useSearchParams-adjacent router state during static render */}
      <Suspense fallback={null}>
        <CommandMenu />
      </Suspense>
    </QueryClientProvider>
  );
}
