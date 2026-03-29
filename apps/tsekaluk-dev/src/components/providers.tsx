"use client";

import { ThemeProvider } from "next-themes";
import { CommandPaletteProvider } from "@/components/providers/command-palette-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
      </ThemeProvider>
    </PostHogProvider>
  );
}
