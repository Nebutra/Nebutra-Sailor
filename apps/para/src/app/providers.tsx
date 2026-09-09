"use client";

import { ThemeProvider } from "@nebutra/tokens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, Suspense, useState } from "react";
import { CommandMenu } from "@/components/shell/command-menu";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } }),
  );
  return (
    // Dark is the default, not a literal class: a dark canvas is evidence-backed (Seko, TapNow,
    // LibTV) but a dark-only product is not — four of six mapped products are light or ship both.
    // forcedTheme keeps today's answer while making the reversal one line, once a light ladder exists.
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <QueryClientProvider client={client}>
        {children}
        {/* Suspense: CommandMenu reads useSearchParams-adjacent router state during static render */}
        <Suspense fallback={null}>
          <CommandMenu />
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
