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
 * JS exports:  ThemeProvider, useTheme, buildThemeInitScript (custom — no next-themes)
 *   → App-level light/dark mode switching
 *   → buildThemeInitScript() returns the FOUC-prevention script as a
 *     STRING. Consumers wrap it in their framework's script-injection
 *     primitive (Next.js: <Script strategy="beforeInteractive">), which
 *     bypasses React's render pipeline and sidesteps the React 19
 *     "scripts inside React components" warning entirely.
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
export { type BuildThemeInitScriptOptions, buildThemeInitScript } from "./theme-script";

export const THEME_IDS = ["light", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "dark";
