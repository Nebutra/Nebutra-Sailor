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
 * JS exports:  ThemeProvider, useTheme, THEME_STORAGE_KEY (custom — no next-themes)
 *   → App-level light/dark mode switching
 *   → ThemeProvider writes BOTH localStorage AND a cookie of the same name.
 *     Server Components read the cookie via `next/headers` cookies() and
 *     inject the resolved class directly into <html> — zero inline script,
 *     zero React 19 "script in component" warning, zero FOUC risk.
 *
 * Related packages:
 *   @nebutra/brand  → brand primitives (color definitions, motion language)
 *   @nebutra/theme  → design-language catalog (Brand Package global swap; moods secondary)
 *   @nebutra/ui     → component library (consumes tokens via CSS variables)
 */

export {
  THEME_STORAGE_KEY,
  ThemeProvider,
  type ThemeProviderProps,
  useTheme,
} from "./theme-provider";

export const THEME_IDS = ["light", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "dark";

/** Create Center brand package: carrier contract + runtime apply */
export {
  applyBrandCss,
  applyBrandPackage,
  applyBrandToIframe,
  BRAND_STORAGE_KEY,
  type BrandColorRoles,
  type BrandElevationTokens,
  type BrandFontFace,
  type BrandPackage,
  type BrandRadii,
  type BrandRecipe,
  type BrandZones,
  type CompileResult,
  clearBrand,
  compileReferoTokens,
  emitBrandCss,
  getActiveBrandId,
  hexToHslChannels,
  inferRecipeFromDesignMd,
  normalizeBrandPackage,
  restorePersistedBrand,
  rolesFromSemantic,
  semanticFromRoles,
  useBrand,
  useBrandIframePreview,
  type ValidationResult,
  validateBrandPackage,
} from "./brand-package";
