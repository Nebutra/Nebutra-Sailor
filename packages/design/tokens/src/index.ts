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
 * JS exports:  ThemeProvider, useTheme, ThemeScript (custom — no next-themes)
 *   → App-level light/dark mode switching
 *   → ThemeScript renders the FOUC-prevention inline script from a Server
 *     Component, sidestepping the React 19 + Next.js 16 console warning
 *     about scripts inside Client Components.
 *
 * Related packages:
 *   @nebutra/brand  → brand primitives (color definitions, motion language)
 *   @nebutra/theme  → multi-theme presets (6 oklch variants for SaaS product)
 *   @nebutra/ui     → component library (consumes tokens via CSS variables)
 */

export {
  THEME_STORAGE_KEY,
  ThemeProvider,
  type ThemeProviderProps,
  useTheme,
} from "./theme-provider";
export { ThemeScript, type ThemeScriptProps } from "./theme-script";

export const THEME_IDS = ["light", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "dark";
