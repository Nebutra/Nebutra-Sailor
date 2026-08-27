"use client";

import { ThemeProvider } from "@nebutra/tokens";
import { ThemeSwitcher } from "@nebutra/ui/primitives";

export function ThemeSwitcherDemo() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <ThemeSwitcher />
    </ThemeProvider>
  );
}
