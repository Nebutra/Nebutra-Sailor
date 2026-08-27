export {
  type ApplyBrandOptions,
  applyBrandCss,
  applyBrandPackage,
  BRAND_STORAGE_KEY,
  BRAND_STYLE_ELEMENT_ID,
  clearBrand,
  getActiveBrandId,
  restorePersistedBrand,
} from "./apply-brand";
export { compileReferoTokens } from "./compile-refero";
export {
  type EmitBrandCssMode,
  type EmitBrandCssOptions,
  emitBrandCss,
  emitDarkModeSelector,
  emitGlobalSkinSelector,
  emitLightModeSelector,
} from "./emit-css";
export {
  colorToHslChannels,
  hexToHslChannels,
  tryColorToHsl,
  tryHexToHsl,
} from "./hex-to-hsl";
export { type InferredRecipeHints, inferRecipeFromDesignMd } from "./infer-recipe";
export {
  elevationPresetToTokens,
  isDualModeBrand,
  normalizeBrandPackage,
  normalizeModePalette,
  rolesFromSemantic,
  semanticFromRoles,
} from "./normalize";
export type {
  BadgeDefaultStyle,
  BrandColorRoles,
  BrandElevationTokens,
  BrandExtensions,
  BrandFontFace,
  BrandFontSource,
  BrandModePalette,
  BrandModes,
  BrandPackage,
  BrandPackageInput,
  BrandRadii,
  BrandRecipe,
  BrandRecipeInput,
  BrandSemanticColors,
  BrandTypography,
  ButtonDefaultStyle,
  CompileResult,
  CssColor,
  Density,
  ElevationStyle,
  HslChannels,
} from "./types";
// Client hooks: import from `@nebutra/tokens/use-brand` or package root only.
// Keep this entry free of useBrand so server importers (design-sync) stay RSC-safe.
export type {
  BrandIframePreviewOptions,
  UseBrandIframePreviewResult,
  UseBrandOptions,
  UseBrandResult,
} from "./use-brand";
export { type ValidationResult, validateBrandPackage } from "./validate";
