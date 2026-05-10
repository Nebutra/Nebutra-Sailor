/**
 * Brand Guidelines - 品牌使用规范
 *
 * Based on: 云毓智能品牌视觉识别手册 (Nebutra Brand Visual Identity Manual)
 *
 * This module provides programmatic access to brand guidelines for:
 * - Design system integration
 * - Automated compliance checking
 * - Documentation generation
 */

export type { AllowedColorCombination, ColorProhibitedUse } from "./color";
// Color Guidelines
export {
  allowedColorCombinations,
  brandGradient,
  colorProhibitedUses,
  generateColorScale,
  nebutraBlue,
  // Complete color scales
  nebutraBlueScale,
  nebutraCyan,
  nebutraCyanScale,
  nebutraNeutralScale,
  neutralColors,
  semanticColors,
} from "./color";
export type { LogoProhibitedUse, LogoVariant } from "./logo";
// Logo Guidelines
export {
  logoColorUsage,
  logoEditions,
  logoGrid,
  logoMinSize,
  logoProhibitedUses,
  logoSafetyZone,
  logoSpecialVersions,
  logoVariants,
} from "./logo";

/**
 * Complete Brand Guidelines Object
 *
 * Unified export for easy consumption
 */
export const brandGuidelines = {
  // Logo
  logo: {
    safetyZone: {
      ratio: 0.25,
      description: "最小边距不小于标志高度的 1/4",
    },
    minSize: {
      print: { minHeightMm: 6 },
      digital: { minHeightPx: 35 },
    },
  },

  // Colors
  colors: {
    primary: {
      name: "云毓蓝",
      hex: "#0033FE",
    },
    secondary: {
      name: "云毓青",
      hex: "#0BF1C3",
    },
    gradient: "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)",
  },

  // Typography
  typography: {
    cn: "vivo Sans",
    en: "Poppins",
    weights: ["Light", "Regular", "Medium", "DemiBold", "Bold"],
  },
} as const;

export type BrandGuidelines = typeof brandGuidelines;
