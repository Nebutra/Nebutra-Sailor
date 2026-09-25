/**
 * Color Usage Guidelines - 品牌色彩使用规范
 *
 * Based on: 云毓智能品牌视觉识别手册 (Nebutra Brand Visual Identity Manual)
 *
 * SSOT: Color scale values are sourced from `../metadata.ts` (`colors`),
 *       which itself mirrors `@nebutra/design-tokens/tokens/core.json`.
 *       The scale exports below (`nebutraBlueScale`, `nebutraCyanScale`,
 *       `nebutraNeutralScale`) are kept for backwards compatibility and
 *       redirect to `colors.primary`, `colors.accent`, and `colors.neutral`.
 */
import { colors } from "../metadata";

// The VI records below read their colours from `colors` (the brand:apply
// seed). rgb / hsl / gradient stops are computed from it, not restated: a
// restated triple silently disagrees with its hex the day the seed changes.
// CMYK stays literal — it is a print specification with no token.

function rgbOf(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hslOf(hex: string) {
  const { r, g, b } = rgbOf(hex);
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
  }
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** `linear-gradient(135deg, #a 0%, #b 50%, #c 100%)` → its stops; the 50% stop is the OKLab midpoint. */
function stopsOf(css: string) {
  return [...css.matchAll(/(#[0-9a-fA-F]{6})\s+(\d+)%/g)].map(([, color, position]) =>
    Number(position) === 50
      ? { color: color as string, position: 50, note: "OKLab midpoint" }
      : { color: color as string, position: Number(position) },
  );
}

/**
 * Brand Primary Color - 云毓蓝 (Nebutra Blue)
 *
 * 云毓蓝是品牌的核心标准色。蓝色象征科技与信任，契合云毓智能在AI-SaaS与云端数据智能领域的专业定位。
 * "云"代表云端平台，"毓"寓意孕育与转化。
 */
export const nebutraBlue = {
  name: "云毓蓝",
  nameEn: "Nebutra Blue",

  /** Color values */
  hex: colors.primary[500],
  rgb: rgbOf(colors.primary[500]),
  hsl: hslOf(colors.primary[500]),

  /** Print color values (if needed) */
  cmyk: { c: 100, m: 80, y: 0, k: 0 },

  /** Semantic meaning */
  meaning: "象征科技与信任，体现创新、可靠与无限潜力",

  /** Usage */
  usage: ["主要品牌色", "标志主色", "重要按钮/CTA", "标题强调", "链接颜色"],
} as const;

/**
 * Brand Secondary Color - 云毓青 (Nebutra Cyan)
 *
 * 品牌主要辅助色定义为"云毓青"。它源于数据流动与智能交互的瞬间，
 * 青色的通透感象征着信息的清晰与算法的灵动。
 */
export const nebutraCyan = {
  name: "云毓青",
  nameEn: "Nebutra Cyan",

  /** Color values */
  hex: colors.accent[500],
  rgb: rgbOf(colors.accent[500]),
  hsl: hslOf(colors.accent[500]),

  /** Print color values (if needed) */
  cmyk: { c: 55, m: 0, y: 35, k: 0 },

  /** Semantic meaning */
  meaning: "象征信息的清晰与算法的灵动，体现从原始数据到智慧产品的转化路径",

  /** Usage */
  usage: ["辅助品牌色", "渐变终止色", "交互反馈", "成功状态", "数据可视化"],
} as const;

/**
 * Brand Gradient - 品牌渐变
 *
 * 色彩上使用清新明快的蓝绿渐变，通过线性渐变与角度渐变的方式填充，
 * 让整体更具未来感与科技的锋芒。
 */
export const brandGradient = {
  /** Primary gradient (135°) - Logo标准渐变；中点为 OKLab 感知中点，控中段避免脏灰 */
  primary: {
    css: colors.gradient.primary,
    angle: 135,
    stops: stopsOf(colors.gradient.primary),
    usage: "Logo、Hero区域、VI 品牌资产（产品 CTA 用 solid primary）",
  },

  /** Reverse gradient */
  reverse: {
    css: colors.gradient.primaryReverse,
    angle: 135,
    stops: stopsOf(colors.gradient.primaryReverse),
    usage: "次要元素、hover状态",
  },

  /** Vertical gradient */
  vertical: {
    css: colors.gradient.primaryVertical,
    angle: 180,
    stops: stopsOf(colors.gradient.primaryVertical),
    usage: "垂直布局元素、页面分割",
  },

  /** Radial gradient */
  radial: {
    css: colors.gradient.primaryRadial,
    type: "radial",
    stops: stopsOf(colors.gradient.primaryRadial),
    usage: "背景光晕、焦点效果",
  },
} as const;

/**
 * Neutral Colors - 黑白 (VI标准)
 */
export const neutralColors = {
  white: {
    name: "白",
    nameEn: "White",
    hex: "#FFFFFF",
    rgb: { r: 255, g: 255, b: 255 },
    usage: "背景、文字反白",
  },
  black: {
    name: "黑",
    nameEn: "Black",
    hex: "#000000",
    rgb: { r: 0, g: 0, b: 0 },
    usage: "正文文字、墨稿标志",
  },
} as const;

/**
 * Color Prohibited Uses - 色彩禁用示例
 *
 * 为了使品牌标准色彩在未来的传播中更加科学有效，设置标准色和辅助色的使用规范。
 */
export const colorProhibitedUses = [
  {
    id: "high-saturation-overlay",
    name: "高饱和度背景与颜色重叠",
    description: "禁用高饱和度背景与颜色重叠，避免颜色过于刺眼，影响品牌形象",
    example: "不要在高饱和度的红、橙、黄等背景上使用品牌色",
  },
  {
    id: "high-brightness-overlay",
    name: "明度过高的重叠颜色",
    description: "禁用明度过高的重叠颜色，避免影响内容的识别性",
    example: "不要将浅色品牌色放在浅色背景上",
  },
  {
    id: "modify-brand-colors",
    name: "修改品牌标准色",
    description: "禁止调整品牌色的色相、饱和度或明度",
    example: "不要将云毓蓝调成紫色或浅蓝",
  },
  {
    id: "non-brand-gradient",
    name: "非品牌渐变",
    description: "禁止使用非品牌标准的渐变组合",
    example: "不要将云毓蓝与其他非品牌色进行渐变",
  },
] as const;

/**
 * Allowed Color Combinations - 允许使用的色彩组合
 */
export const allowedColorCombinations = [
  {
    name: "品牌渐变背景 + 白色文字",
    background: brandGradient.primary.css,
    foreground: "#FFFFFF",
    contrast: "AAA",
  },
  {
    name: "白色背景 + 云毓蓝文字",
    background: "#FFFFFF",
    foreground: "#0033FE",
    contrast: "AAA",
  },
  {
    name: "深色背景 + 云毓青强调",
    background: "#000000",
    foreground: "#0BF1C3",
    contrast: "AAA",
  },
  {
    name: "云毓蓝背景 + 白色文字",
    background: "#0033FE",
    foreground: "#FFFFFF",
    contrast: "AAA",
  },
] as const;

/**
 * Nebutra Blue Color Scale - 云毓蓝色阶
 *
 * Re-exported from `colors.primary` (metadata.ts SSOT).
 * Direct hex literals were removed to eliminate the multi-source drift documented
 * in docs/design-system/token-drift-audit.md.
 */
export const nebutraBlueScale = colors.primary;

/**
 * Nebutra Cyan Color Scale - 云毓青色阶
 *
 * Re-exported from `colors.accent` (metadata.ts SSOT).
 */
export const nebutraCyanScale = colors.accent;

/**
 * Extended Neutral Colors - Slate (cool blue-undertone gray scale)
 *
 * Re-exported from `colors.neutral` (metadata.ts SSOT). Slate, not Zinc.
 * The `0` step (white) is omitted to keep the legacy 50–950 scale shape intact.
 */
export const nebutraNeutralScale = {
  50: colors.neutral[50],
  100: colors.neutral[100],
  200: colors.neutral[200],
  300: colors.neutral[300],
  400: colors.neutral[400],
  500: colors.neutral[500],
  600: colors.neutral[600],
  700: colors.neutral[700],
  800: colors.neutral[800],
  900: colors.neutral[900],
  950: colors.neutral[950],
} as const;

/**
 * Semantic Color Tokens - 语义化颜色
 *
 * Pre-defined combinations for common UI patterns
 */
export const semanticColors = {
  // Surface colors
  surface: {
    light: {
      default: nebutraNeutralScale[50],
      subtle: nebutraNeutralScale[100],
      muted: nebutraNeutralScale[200],
    },
    dark: {
      default: nebutraNeutralScale[950],
      subtle: nebutraNeutralScale[900],
      muted: nebutraNeutralScale[800],
    },
  },

  // Text colors
  text: {
    light: {
      primary: nebutraNeutralScale[900],
      secondary: nebutraNeutralScale[600],
      muted: nebutraNeutralScale[400],
      inverse: "#ffffff",
    },
    dark: {
      primary: nebutraNeutralScale[50],
      secondary: nebutraNeutralScale[300],
      muted: nebutraNeutralScale[500],
      inverse: nebutraNeutralScale[900],
    },
  },

  // Border colors
  border: {
    light: {
      default: nebutraNeutralScale[200],
      subtle: nebutraNeutralScale[100],
      strong: nebutraNeutralScale[300],
    },
    dark: {
      default: nebutraNeutralScale[800],
      subtle: nebutraNeutralScale[900],
      strong: nebutraNeutralScale[700],
    },
  },

  // Brand emphasis
  brand: {
    primary: nebutraBlueScale[500],
    primaryHover: nebutraBlueScale[600],
    primaryActive: nebutraBlueScale[700],
    accent: nebutraCyanScale[500],
    accentHover: nebutraCyanScale[600],
    accentActive: nebutraCyanScale[700],
  },
} as const;

/**
 * Color Scale Generator (legacy - prefer using pre-defined scales)
 */
export const generateColorScale = (baseHex: string) => {
  // For runtime generation, return the appropriate pre-defined scale
  if (baseHex === "#0033FE") return nebutraBlueScale;
  if (baseHex === "#0BF1C3") return nebutraCyanScale;

  // Fallback: return base color for all steps
  return {
    50: baseHex,
    100: baseHex,
    200: baseHex,
    300: baseHex,
    400: baseHex,
    500: baseHex,
    600: baseHex,
    700: baseHex,
    800: baseHex,
    900: baseHex,
    950: baseHex,
  };
};

// Type exports
export type ColorProhibitedUse = (typeof colorProhibitedUses)[number];
export type AllowedColorCombination = (typeof allowedColorCombinations)[number];
