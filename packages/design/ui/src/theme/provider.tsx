"use client";

/**
 * Nebutra Theme Provider — Lobe UI integration bridge
 *
 * Wraps Lobe UI's ThemeProvider with Nebutra brand tokens.
 * This provider handles Lobe UI / Ant Design theming only.
 *
 * For app-level light/dark mode switching, use:
 *   import { ThemeProvider } from "@nebutra/tokens";
 *
 * For CSS-variable-based tokens (Tailwind, custom components), use:
 *   @import "@nebutra/tokens/styles.css";
 */

import { ThemeProvider as LobeThemeProvider } from "@lobehub/ui";
import type { ReactNode } from "react";

export interface NebutraThemeProviderProps {
  children: ReactNode;
  /** Force dark/light mode, or use system preference */
  appearance?: "dark" | "light" | "auto";
  /** Default theme mode when appearance is "auto" */
  defaultAppearance?: "dark" | "light";
}

/**
 * Theme provider that wraps Lobe UI with Nebutra design tokens
 *
 * @example
 * ```tsx
 * <NebutraThemeProvider appearance="auto">
 *   <App />
 * </NebutraThemeProvider>
 * ```
 */
export function NebutraThemeProvider({
  children,
  appearance = "auto",
  defaultAppearance = "light",
}: NebutraThemeProviderProps) {
  const resolvedAppearance = appearance === "auto" ? undefined : appearance;

  return (
    <LobeThemeProvider
      {...(resolvedAppearance != null && { appearance: resolvedAppearance })}
      defaultAppearance={defaultAppearance}
      customTheme={{
        primaryColor: "blue",
        neutralColor: "slate",
      }}
    >
      {children}
    </LobeThemeProvider>
  );
}

export default NebutraThemeProvider;
