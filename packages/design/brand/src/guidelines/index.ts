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

import { colors, typography } from "../metadata";

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
  productChromeLogoRule,
} from "./logo";

function firstFamily(stack: string): string {
  return (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
}

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
      hex: colors.primary["500"],
    },
    secondary: {
      name: "云毓青",
      hex: colors.accent["500"],
    },
    gradient: colors.gradient.primary,
  },

  // Typography — the faces the token source chose (metadata.ts reads them
  // from core.json:fontFamily).
  typography: {
    cn: firstFamily(typography.fontFamily.cn),
    en: firstFamily(typography.fontFamily.en),
    heading: firstFamily(typography.fontFamily.heading),
    weights: ["Regular", "Medium", "SemiBold", "Bold"],
  },
} as const;

export type BrandGuidelines = typeof brandGuidelines;
