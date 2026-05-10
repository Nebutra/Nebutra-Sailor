/**
 * @nebutra/brand
 *
 * Centralized brand assets and identity for Nebutra monorepo
 * Based on: 云毓智能品牌视觉识别手册 (Nebutra Brand Visual Identity Manual)
 */

export type { LogoEdition, LogoProps, LogoVariant } from "./components/Logo";
// Components
export { Logo, Logomark, Wordmark } from "./components/Logo";
export type { LogoEnSVGProps } from "./components/LogoSVG";
// Inline SVG components (no public folder required, fill="currentColor")
export { LogoEnSVG, LogomarkSVG, WordmarkEnSVG } from "./components/LogoSVG";
export type {
  AllowedColorCombination,
  BrandGuidelines,
  ColorProhibitedUse,
  LogoProhibitedUse,
  LogoVariant as LogoVariantGuideline,
} from "./guidelines";
// Brand Guidelines (品牌使用规范)
export {
  allowedColorCombinations,
  brandGradient,
  // Unified guidelines object
  brandGuidelines,
  colorProhibitedUses,
  generateColorScale,
  logoColorUsage,
  logoEditions,
  logoGrid,
  logoMinSize,
  logoProhibitedUses,
  // Logo guidelines
  logoSafetyZone,
  logoSpecialVersions,
  logoVariants,
  // Color guidelines
  nebutraBlue,
  // Complete color scales (11 steps: 50-950)
  nebutraBlueScale,
  nebutraCyan,
  nebutraCyanScale,
  nebutraNeutralScale,
  neutralColors,
  semanticColors,
} from "./guidelines";
export type { BrandColors, BrandTypography, LogoAssets } from "./metadata";
// Metadata & Constants
export {
  brand,
  colors,
  faviconAssets,
  fontAssets,
  logoAssets,
  ogImageDimensions,
  typography,
} from "./metadata";
// Brand Motion Language (品牌运动语言)
export {
  brandDuration,
  brandEasing,
  brandMotion,
  brandSpring,
  emerge,
  float,
  flow,
  interactive,
  pulse,
  stagger,
  viewport,
} from "./motion";
export type { Positioning, ProductPillar, UseCase } from "./positioning";
// Product Positioning DNA (产品定位)
export { positioning } from "./positioning";
