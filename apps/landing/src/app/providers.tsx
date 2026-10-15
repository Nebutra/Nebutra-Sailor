"use client";

import { ThemeProvider } from "@nebutra/tokens";
import { SITE_ID } from "@/site.config";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * Single theme mechanism: class-based dark mode (.dark).
 *
 * React Query is not here: only blog comments fetch on the client, and they
 * bring their own provider (components/landing/query-provider.tsx).
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      // The Nebutra site is designed on the void; light is the reader's choice.
      defaultTheme={SITE_ID === "nebutra" ? "dark" : "system"}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
