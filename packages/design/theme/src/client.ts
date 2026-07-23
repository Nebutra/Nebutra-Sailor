/**
 * Explicit client entry — same lean surface as package root.
 * Use: `import { applyLanguage } from "@nebutra/theme/client"`
 */

export { ThemeProvider, type ThemeProviderProps, useTheme } from "@nebutra/tokens";
export {
  applyBrandPackage,
  type BrandPackage,
  clearBrand,
  normalizeBrandPackage,
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
  type DesignLanguageEntry,
  type DesignLanguageRegistry,
  getLanguageById,
  isLanguageId,
  LANGUAGE_IDS,
  LANGUAGE_REGISTRY,
  listSkinLanguages,
} from "./languages";
