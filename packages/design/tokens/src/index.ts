/**
 * @nebutra/tokens — Runtime theme tokens & theme switching
 *
 * This package is the SINGLE SOURCE OF TRUTH for runtime design tokens.
 *
 * CSS tokens:  @import "@nebutra/tokens/styles.css"
 *   → Brand color scales (--nebutra-blue-*, --nebutra-cyan-*)
 *   → 12-step functional scales (--neutral-1..12, --blue-1..12, --cyan-1..12)
 *   → Semantic variables (--primary, --background, --border, etc.)
 *   → Light/dark mode via :root / .dark
 *   → Display-P3 wide gamut with sRGB fallback
 *   → Tailwind v4 @theme integration
 *
 * JS exports:  ThemeProvider, useTheme (from next-themes)
 *   → App-level light/dark mode switching
 *
 * Related packages:
 *   @nebutra/brand  → brand primitives (color definitions, motion language)
 *   @nebutra/theme  → multi-theme presets (6 oklch variants for SaaS product)
 *   @nebutra/ui     → component library (consumes tokens via CSS variables)
 */

export type { ThemeProviderProps } from "next-themes";
export { ThemeProvider, useTheme } from "next-themes";

export const THEME_IDS = ["light", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "dark";
