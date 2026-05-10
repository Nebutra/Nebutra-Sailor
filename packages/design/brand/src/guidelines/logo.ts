/**
 * Logo Usage Guidelines - 品牌标志使用规范
 *
 * Based on: 云毓智能品牌视觉识别手册 (Nebutra Brand Visual Identity Manual)
 */

/**
 * Logo Safety Zone (安全空间)
 *
 * 标志应用时必须保留安全空间，最小边距不小于标志高度的 1/4
 * The minimum margin around the logo should be at least 1/4 of the logo height
 */
export const logoSafetyZone = {
  /** Safety zone ratio relative to logo height */
  ratio: 0.25, // 1/4 of logo height

  /** Calculate safety zone in pixels */
  calculate: (logoHeight: number) => ({
    margin: Math.ceil(logoHeight * 0.25),
    totalWidth: Math.ceil(logoHeight + logoHeight * 0.5), // logo + 2x margin
    totalHeight: Math.ceil(logoHeight + logoHeight * 0.5),
  }),
} as const;

/**
 * Minimum Logo Sizes (最小化比例限定)
 */
export const logoMinSize = {
  /** Print media: height ≥ 6mm */
  print: {
    minHeightMm: 6,
    description: "印刷媒体上最小使用：高度大于等于 6mm",
  },

  /** Digital media: height ≥ 35px */
  digital: {
    minHeightPx: 35,
    description: "网络媒体上最小使用：高度大于等于 35px",
  },
} as const;

/**
 * Logo Variants (标志组合形式)
 */
export const logoVariants = {
  /** 标志左右组合 - Horizontal combination */
  horizontal: {
    zh: "logo-horizontal-zh",
    en: "logo-horizontal-en",
    useCase: "适配横向空间（如门店招牌、横幅广告）",
  },

  /** 标志上下组合 - Vertical combination */
  vertical: {
    zh: "logo-vertical-zh",
    en: "logo-vertical-en",
    useCase: "适配纵向空间（如名片、工牌）",
  },

  /** 单色组合 - Monochrome combinations (compliant edition only) */
  horizontalMono: {
    zh: "logo-horizontal-zh-mono",
    en: "logo-horizontal-en-mono",
    useCase: "适配单色印刷横向场景（传真、黑白打印）",
  },
  verticalMono: {
    zh: "logo-vertical-zh-mono",
    en: "logo-vertical-en-mono",
    useCase: "适配单色印刷纵向场景（名片黑白版、工牌单色版）",
  },

  /** 标志单独使用 */
  logomark: {
    color: "logo-color",
    inverse: "logo-inverse",
    mono: "logo-mono",
  },

  /** 品牌名称单独使用 */
  wordmark: {
    zh: "logo-zh",
    en: "logo-en",
    zhEn: "logo-zh-en",
  },
} as const;

/**
 * Logo Editions (品牌标志版本)
 *
 * v1.0 经典版与 v2.0 合规版的区别在于中文"毓"字的写法。
 */
export const logoEditions = {
  classic: {
    version: "1.0",
    name: "经典版",
    nameEn: "Classic",
    description: "原始设计版本，'毓'字更美观流畅",
    useCases: ["App界面", "网站", "产品内嵌", "营销物料", "社交媒体"],
    directory: "logo",
  },
  compliant: {
    version: "2.0",
    name: "合规版",
    nameEn: "Compliant",
    description: "商标合规版本，'毓'字符合标准字形规范",
    useCases: ["法律文件", "商标注册", "正式合同", "政府报备", "发票/收据"],
    directory: "logo-compliant",
  },
} as const;

/**
 * Logo Color Usage (标志颜色使用)
 */
export const logoColorUsage = {
  /** Preferred: Full color gradient (彩色渐变) */
  preferred: "color",

  /** Allowed: Single color versions */
  allowed: ["inverse", "mono"] as const,

  /** Rules */
  rules: {
    lightBackground: "优先使用彩色标识",
    darkBackground: "允许使用反白标识",
    complexBackground: "禁止在复杂背景中使用反白标识，以防辨识度降低",
    print: "单色印刷时使用墨稿版本",
    special: "烫金、烫银等特殊工艺使用对应墨稿版本",
  },
} as const;

/**
 * Prohibited Logo Uses (使用限定 / 禁用规则)
 *
 * 从"反向约束"角度保障品牌标志的完整性、识别性和品牌形象的一致性
 */
export const logoProhibitedUses = [
  {
    id: "stretch",
    name: "拉伸变形",
    description: "禁止对标志进行任何方向的拉伸或压缩",
  },
  {
    id: "rotate",
    name: "旋转",
    description: "禁止旋转标志角度",
  },
  {
    id: "outline",
    name: "描边",
    description: "禁止给标志添加描边效果",
  },
  {
    id: "shadow",
    name: "投影",
    description: "禁止给标志添加投影效果",
  },
  {
    id: "gradient-modify",
    name: "修改渐变",
    description: "禁止修改标志原有的渐变色彩",
  },
  {
    id: "recolor",
    name: "随意换色",
    description: "禁止使用非品牌标准色替换标志颜色",
  },
  {
    id: "partial",
    name: "部分使用",
    description: "禁止只使用标志的一部分",
  },
  {
    id: "modify-elements",
    name: "修改元素",
    description: "禁止添加、删除或修改标志中的任何元素",
  },
  {
    id: "low-contrast",
    name: "低对比度",
    description: "禁止在对比度过低的背景上使用标志",
  },
  {
    id: "complex-bg",
    name: "复杂背景",
    description: "禁止在浅色或复杂背景中使用反白标识",
  },
] as const;

/**
 * Logo Grid System (方格制图)
 *
 * 通过精确的网格比例，规定标志中各元素的尺寸、间距等参数
 */
export const logoGrid = {
  /** Logo mark grid unit */
  logomark: {
    gridUnit: "a",
    width: "7.5a",
    height: "7.5a",
  },

  /** Chinese wordmark grid */
  wordmarkCn: {
    gridUnit: "a",
    width: "13.5a",
    height: "3a",
  },

  /** English wordmark grid */
  wordmarkEn: {
    gridUnit: "a",
    width: "14a",
    height: "2a",
  },

  /** Combined logo grid (Chinese + English) */
  combined: {
    gridUnit: "a",
    width: "13.5a",
    height: "5.5a",
  },
} as const;

/**
 * Logo Special Versions (特殊版本)
 */
export const logoSpecialVersions = {
  /** 墨稿版本 - Monochrome versions */
  monochrome: {
    black: "用于单色印刷、传真等场景",
    white: "用于深色背景、反白印刷",
  },

  /** 工艺版本 - Special process versions */
  process: {
    gold: "烫金工艺",
    silver: "烫银工艺",
  },
} as const;

// Type exports
export type LogoVariant = keyof typeof logoVariants;
export type LogoProhibitedUse = (typeof logoProhibitedUses)[number];
