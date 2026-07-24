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
// Metadata helpers — derive Next.js Metadata, JSON-LD, PWA manifest, feeds from brand SSOT
export type {
  BrandService,
  FeedChannelMeta,
  OrganizationJsonLd,
  SiteMetadataOptions,
  SoftwareApplicationJsonLd,
  WebSiteJsonLd,
} from "./metadata-helpers";
export {
  buildFeedChannelMeta,
  buildOrganizationJsonLd,
  buildPwaManifest,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  getBrandCookieDomain,
  getBrandEmail,
  getBrandMailFrom,
  getBrandOrigin,
  getBrandPublicUrls,
  getSiteMetadata,
  getSiteUrl,
} from "./metadata-helpers";
// Microcopy SSOT — typed projection of docs/microcopy/nebutra-microcopy-system.md
export type {
  EasterEggEntry,
  MilestoneCopyEntry,
  MilestoneId,
  NebutraMicrocopy,
  SupportedLocale,
} from "./microcopy";
export {
  EASTER_EGG_REGISTRY,
  getMilestoneCopy,
  MILESTONE_COPY_PACK,
} from "./microcopy";
// Brand Motion Language (品牌运动语言)
export {
  brandEasing,
  brandMotion,
  brandSpring,
  emerge,
  float,
  flow,
  interactive,
  motionDurationSec,
  pulse,
  stagger,
  viewport,
} from "./motion";
export type { Positioning, ProductPillar, UseCase } from "./positioning";
// Product Positioning DNA (产品定位)
export { positioning } from "./positioning";
// governance-green-recheck
