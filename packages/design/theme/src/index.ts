/**
 * @nebutra/theme — Design-language switch surface
 *
 * Owns **global design-language swap** for Create Center / SaaS.
 * A language = full Brand Package (roles + recipe + free elev + zones).
 * Stress tests (Linear, GSAP, Raycast, Vercel, Vanta) define the contract.
 *
 * Multi-mood oklch catalog was **deleted** (2026.07) — it dual-wrote product
 * chrome and diluted the carrier model.
 *
 * Layers:
 *   @nebutra/tokens  product chrome SSOT (styles.css + recipe.css)
 *   @nebutra/theme   LANGUAGE_REGISTRY + applyLanguage + skins.css
 *
 * Light/dark: @nebutra/tokens ThemeProvider (class="dark").
 */

export {
  applyBrandCss,
  applyBrandPackage,
  applyBrandToIframe,
  BRAND_STORAGE_KEY,
  type BrandPackage,
  type CompileResult,
  clearBrand,
  compileReferoTokens,
  emitBrandCss,
  getActiveBrandId,
  normalizeBrandPackage,
  restorePersistedBrand,
  useBrand,
  useBrandIframePreview,
  type ValidationResult,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";
export type { ThemeProviderProps } from "next-themes";
export { ThemeProvider, useTheme } from "next-themes";
export {
  type ApplyLanguageOptions,
  applyLanguage,
  clearLanguage,
  getActiveLanguageId,
} from "./apply-language";
export {
  BUILT_IN_LANGUAGE_IDS,
  DEFAULT_LANGUAGE,
  type DesignLanguageCompatibility,
  type DesignLanguageEntry,
  type DesignLanguageInstall,
  type DesignLanguageRegistry,
  getLanguageById,
  isLanguageId,
  LANGUAGE_IDS,
  LANGUAGE_REGISTRY,
  type LanguageId,
  listSkinLanguages,
} from "./languages";

/** Compatibility: empty mood registry + language bridge */
export {
  BUILT_IN_THEME_IDS,
  DEFAULT_THEME,
  getThemeById,
  isBuiltInThemeId,
  isThemeId,
  listThemesAsLegacyEntries,
  THEME_IDS,
  THEME_REGISTRY,
  type ThemeId,
  type ThemeRegistry,
  type ThemeRegistryEntry,
} from "./registry";
