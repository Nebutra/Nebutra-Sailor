/**
 * @nebutra/theme — Design-language switch surface (client-safe root)
 *
 * Root exports are intentionally lean for app bundles:
 *   applyLanguage / LANGUAGE_REGISTRY / built-in packages / ThemeProvider
 *
 * Compile & Create Center tooling:
 *   @nebutra/tokens/brand-package  (preferred)
 *   @nebutra/theme/brand-package   (re-export alias)
 *
 * Layers:
 *   @nebutra/tokens  product chrome SSOT (styles.css + recipe.css)
 *   @nebutra/theme   LANGUAGE_REGISTRY + applyLanguage + skins.css
 *
 * Light/dark: ThemeProvider re-exported from @nebutra/tokens only (not next-themes).
 */

export { ThemeProvider, type ThemeProviderProps, useTheme } from "@nebutra/tokens";
// Re-export apply helpers used with applyLanguage({ package })
export {
  type ApplyBrandOptions,
  applyBrandPackage,
  type BrandPackage,
  clearBrand,
  getActiveBrandId,
  normalizeBrandPackage,
  type ValidationResult,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";
export {
  type ApplyLanguageOptions,
  applyLanguage,
  clearLanguage,
  getActiveLanguageId,
} from "./apply-language";
export {
  getBuiltInBrandPackage,
  hasBuiltInBrandPackage,
  listBuiltInBrandIds,
} from "./built-in-packages";
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
