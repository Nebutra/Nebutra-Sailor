"use client";

import { ThemeProvider } from "@nebutra/tokens";
import type { ReactNode } from "react";

/**
 * Light / dark for the whole site, from the one provider every Nebutra app uses.
 *
 * The site skins itself with the design-language switcher; light and dark is the
 * second axis of the same demonstration, so it is a first-class preference here
 * rather than something only the component pages could flip.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      {children}
    </ThemeProvider>
  );
}
