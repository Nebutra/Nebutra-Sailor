/**
 * Tooling / Create Center surface — compile + iframe preview + emit.
 * Prefer `@nebutra/tokens/brand-package` in new code; this re-export keeps
 * historical `@nebutra/theme` compile entry points without bloating the root.
 */

export {
  applyBrandCss,
  applyBrandPackage,
  BRAND_STORAGE_KEY,
  type BrandPackage,
  type BrandPackageInput,
  type BrandRecipe,
  type BrandRecipeInput,
  type CompileResult,
  clearBrand,
  compileReferoTokens,
  type EmitBrandCssMode,
  type EmitBrandCssOptions,
  emitBrandCss,
  emitGlobalSkinSelector,
  getActiveBrandId,
  normalizeBrandPackage,
  restorePersistedBrand,
  type ValidationResult,
  validateBrandPackage,
} from "@nebutra/tokens/brand-package";

export {
  applyBrandToIframe,
  useBrand,
  useBrandIframePreview,
} from "@nebutra/tokens/use-brand";
