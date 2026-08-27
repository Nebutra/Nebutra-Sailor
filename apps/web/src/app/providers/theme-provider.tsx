"use client";

import { ThemeProvider } from "@nebutra/tokens";

interface ThemeShellProps {
  children: React.ReactNode;
  nonce?: string;
}

/**
 * Client-side theme provider for the web app.
 * Single theme mechanism: class-based dark mode (.dark).
 */
export function ThemeShell({ children, nonce }: ThemeShellProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </ThemeProvider>
  );
}
