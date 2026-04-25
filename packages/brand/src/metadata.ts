/**
 * Nebutra Brand Metadata
 * Central source of truth for brand identity
 *
 * Based on: 云毓智能品牌视觉识别手册 (Nebutra Brand Visual Identity Manual)
 */

export const brand = {
  // Brand names
  name: "Nebutra",
  nameCn: "云毓智能",
  nameFull: "无锡云毓智能科技有限公司",
  nameFullEn: "Wuxi Nebutra Intelligent Technology Co., Ltd.",

  tagline: "Ship AI products, not boilerplate.",
  taglineCn: "AI原生·快速出海·即刻交付",
  description:
    "Production-ready Next.js monorepo template for AI SaaS products. " +
    "Auth, billing, multi-tenancy, AI services, design system, and enterprise infrastructure — pre-configured.",
  descriptionCn:
    "面向AI创业者的一体化SaaS基础设施模板，覆盖认证、计费、多租户、AI服务与设计系统，开箱即产品",

  // Brand story
  story: {
    concept:
      "Logo以首字母N的基础造型概念为主要设计框架，通过几何正负空间构建隐形'N'，形成近似六边形的稳定结构",
    colorMeaning: "蓝绿渐变体现未来感与科技锋芒，'云'代表云端平台，'毓'寓意孕育与转化",
    values: ["AI Native", "Ship Fast", "Open by Default", "Global-Ready", "Enterprise-Grade"],
    missionStatement:
      "Help AI founders and SaaS teams go from idea to production 10x faster by providing the infrastructure layer they shouldn't have to build.",
  },

  // Official domains
  domains: {
    landing: "nebutra.com",
    app: "app.nebutra.com",
    api: "api.nebutra.com",
    studio: "studio.nebutra.com",
    cdn: "cdn.nebutra.com",
  },

  // Social links
  social: {
    twitter: "https://twitter.com/nebutra",
    github: "https://github.com/nebutra",
    discord: "https://discord.gg/nebutra",
    linkedin: "https://linkedin.com/company/nebutra",
  },
} as const;

/**
 * Brand Colors - 云毓智能品牌色彩规范
 *
 * 云毓蓝 (Nebutra Blue): #0033FE - 象征科技与信任
 * 云毓青 (Nebutra Cyan): #0BF1C3 - 象征数据流动与智能交互
 */
export const colors = {
  // 云毓蓝 - Primary brand color
  // 蓝色象征科技与信任，契合云毓智能在AI-SaaS与云端数据智能领域的专业定位
  primary: {
    50: "#e6ebff",
    100: "#ccd7ff",
    200: "#99afff",
    300: "#6687ff",
    400: "#335ffe",
    500: "#0033FE", // 云毓蓝 Main (VI标准色)
    600: "#0029cb",
    700: "#001f98",
    800: "#001466",
    900: "#000a33",
    950: "#00051a",
  },

  // 云毓青 - Secondary / Accent
  // 青色的通透感象征信息的清晰与算法的灵动
  accent: {
    50: "#e7fef8",
    100: "#cffdf1",
    200: "#9ffbe3",
    300: "#6ff9d5",
    400: "#3df5c9",
    500: "#0BF1C3", // 云毓青 Main (VI标准色)
    600: "#09c19c",
    700: "#079175",
    800: "#05614e",
    900: "#023027",
    950: "#011814",
  },

  // 黑白 - Black & White (VI标准)
  white: "#FFFFFF",
  black: "#000000",

  // 品牌渐变 - 线性渐变与角度渐变
  gradient: {
    primary: "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)",
    primaryReverse: "linear-gradient(135deg, #0BF1C3 0%, #0033FE 100%)",
    primaryVertical: "linear-gradient(180deg, #0033FE 0%, #0BF1C3 100%)",
    primaryRadial: "radial-gradient(circle, #0BF1C3 0%, #0033FE 100%)",
  },

  // Semantic colors (based on brand palette)
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#0033FE", // 使用品牌蓝

  // Neutrals
  neutral: {
    0: "#ffffff",
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
} as const;

/**
 * Typography - 品牌标准字体系统 "Precision Stack"
 *
 * 设计理念：精密工程感 × 2026 AI-Native 定位
 * 对标：Vercel / Linear / Cursor 的字体审美语言
 *
 * 英文 UI / 展示：Geist (Vercel 原生, Variable, 100–900)
 * 代码 / 数据：Geist Mono (Variable, 100–900)
 * 中文 UI：Noto Sans SC (Variable, Google Fonts, 100–900)
 * 中文品牌印刷：vivo Sans (本地字体, VI 手册标准, 保留)
 *
 * 升级说明：
 *   Poppins → Geist  — Poppins 圆润友好适合 2020 消费 SaaS；
 *                       Geist 几何精密适合 2026 AI-Native 工具产品，
 *                       与 Vercel 部署平台视觉语言统一。
 *   JetBrains Mono → Geist Mono — 与 Geist 形成完整字体家族，
 *                                  暗色界面代码块对比度更优。
 *   vivo Sans 保留用于品牌印刷物和 Logo 旁文字，网页端以 Noto Sans SC 交付。
 *
 * 加载方式 (Next.js / geist/font + CSS fallback):
 *   import { GeistSans } from "geist/font/sans"    — variable: "--font-geist-sans"
 *   import { GeistMono } from "geist/font/mono"    — variable: "--font-geist-mono"
 *   中文 UI 使用本地 / 系统 fallback 字体栈，避免 CI 构建期拉取 Google Fonts。
 */
export const typography = {
  fontFamily: {
    // 英文 UI / 展示 - Geist (Vercel, variable font)
    en: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    // 中文 UI - Noto Sans SC (web), vivo Sans (print/brand)
    cn: '"Noto Sans SC", "vivo Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    // 默认组合 - Geist 优先，CJK 自动 unicode-range 接管
    sans: '"Geist", "Noto Sans SC", "vivo Sans", "PingFang SC", system-ui, sans-serif',
    // 代码 / 数据 / 时间戳 / API Key / 终端
    mono: '"Geist Mono", "Fira Code", Consolas, "Courier New", monospace',
    // 展示字体 (Hero / 超大标题) - 与 UI 一致，依赖字重和字号营造层级
    display: '"Geist", "Noto Sans SC", sans-serif',
    // 品牌印刷专用 (Logo 旁文字 / VI 手册 / 线下物料)
    brandPrint: '"vivo Sans", "PingFang SC", sans-serif',
  },

  // CSS 变量映射 - 与 @nebutra/tokens 中 @theme 集成
  cssVars: {
    sans: "var(--font-geist-sans)",
    mono: "var(--font-geist-mono)",
    cnSans: "var(--font-noto-sc)",
  },

  // Font weights - 基于 Geist variable font 支持范围
  fontWeight: {
    thin: 100,
    extraLight: 200,
    light: 300,
    normal: 400, // Geist Regular / Noto Sans SC Regular
    medium: 500, // Geist Medium
    semibold: 600, // Geist SemiBold
    bold: 700, // Geist Bold / vivo Sans Bold (brand print)
    extraBold: 800,
    black: 900,
  },

  // Letter spacing - Geist 在大字号下需收紧字距
  letterSpacing: {
    display: "-0.04em", // Hero / 超大标题 (72px+)
    heading: "-0.03em", // H1-H2 (40-64px)
    subheading: "-0.02em", // H3-H4 (24-36px)
    body: "0em", // 正文 (14-18px)
    caption: "0.01em", // 说明文字 (12px)
    mono: "0em", // 代码块
  },

  // Line height
  lineHeight: {
    none: 1,
    tight: 1.2, // 标题
    snug: 1.4, // 副标题
    normal: 1.6, // 正文
    relaxed: 1.75, // 长文阅读
    loose: 2, // 特殊场景
  },
} as const;

/**
 * Logo asset paths (relative to package), dual-edition structure
 *
 * - classic (v1.0): 经典版，"毓"字更美观，用于用户体验场景
 * - compliant (v2.0): 合规版，符合商标规范，用于商务场景
 */
export const logoAssets = {
  classic: {
    default: "assets/logo/logo-color.svg",
    color: "assets/logo/logo-color.svg",
    inverse: "assets/logo/logo-inverse.svg",
    mono: "assets/logo/logo-mono.svg",
    en: "assets/logo/logo-en.svg",
    zh: "assets/logo/logo-zh.svg",
    zhEn: "assets/logo/logo-zh-en.svg",
    horizontalEn: "assets/logo/logo-horizontal-en.svg",
    horizontalZh: "assets/logo/logo-horizontal-zh.svg",
    verticalEn: "assets/logo/logo-vertical-en.svg",
    verticalZh: "assets/logo/logo-vertical-zh.svg",
  },
  compliant: {
    default: "assets/logo-compliant/logo-color.svg",
    color: "assets/logo-compliant/logo-color.svg",
    inverse: "assets/logo-compliant/logo-inverse.svg",
    mono: "assets/logo-compliant/logo-mono.svg",
    en: "assets/logo-compliant/logo-en.svg",
    zh: "assets/logo-compliant/logo-zh.svg",
    zhEn: "assets/logo-compliant/logo-zh-en.svg",
    horizontalEn: "assets/logo-compliant/logo-horizontal-en.svg",
    horizontalZh: "assets/logo-compliant/logo-horizontal-zh.svg",
    verticalEn: "assets/logo-compliant/logo-vertical-en.svg",
    verticalZh: "assets/logo-compliant/logo-vertical-zh.svg",
    horizontalEnMono: "assets/logo-compliant/logo-horizontal-en-mono.svg",
    horizontalZhMono: "assets/logo-compliant/logo-horizontal-zh-mono.svg",
    verticalEnMono: "assets/logo-compliant/logo-vertical-en-mono.svg",
    verticalZhMono: "assets/logo-compliant/logo-vertical-zh-mono.svg",
  },
} as const;

/**
 * Font asset paths (relative to package)
 */
export const fontAssets = {
  poppins: {
    thin: "assets/fonts/poppins/Poppins-Thin.otf",
    thinItalic: "assets/fonts/poppins/Poppins-ThinItalic.otf",
    extraLight: "assets/fonts/poppins/Poppins-ExtraLight.otf",
    extraLightItalic: "assets/fonts/poppins/Poppins-ExtraLightItalic.otf",
    light: "assets/fonts/poppins/Poppins-Light.otf",
    lightItalic: "assets/fonts/poppins/Poppins-LightItalic.otf",
    regular: "assets/fonts/poppins/Poppins-Regular.otf",
    italic: "assets/fonts/poppins/Poppins-Italic.otf",
    medium: "assets/fonts/poppins/Poppins-Medium.otf",
    mediumItalic: "assets/fonts/poppins/Poppins-MediumItalic.otf",
    semiBold: "assets/fonts/poppins/Poppins-SemiBold.otf",
    semiBoldItalic: "assets/fonts/poppins/Poppins-SemiBoldItalic.otf",
    bold: "assets/fonts/poppins/Poppins-Bold.otf",
    boldItalic: "assets/fonts/poppins/Poppins-BoldItalic.otf",
    extraBold: "assets/fonts/poppins/Poppins-ExtraBold.otf",
    extraBoldItalic: "assets/fonts/poppins/Poppins-ExtraBoldItalic.otf",
    black: "assets/fonts/poppins/Poppins-Black.otf",
    blackItalic: "assets/fonts/poppins/Poppins-BlackItalic.otf",
  },
  vivoSans: {
    thin: "assets/fonts/vivo-sans/vivoSans-Thin.ttf",
    extraLight: "assets/fonts/vivo-sans/vivoSans-ExtraLight.ttf",
    light: "assets/fonts/vivo-sans/vivoSans-Light.ttf",
    regular: "assets/fonts/vivo-sans/vivoSans-Regular.ttf",
    medium: "assets/fonts/vivo-sans/vivoSans-Medium.ttf",
    demiBold: "assets/fonts/vivo-sans/vivoSans-DemiBold.ttf",
    bold: "assets/fonts/vivo-sans/vivoSans-Bold.ttf",
    extraBold: "assets/fonts/vivo-sans/vivoSans-ExtraBold.ttf",
    heavy: "assets/fonts/vivo-sans/vivoSans-Heavy.ttf",
  },
} as const;

/**
 * Favicon assets
 */
export const faviconAssets = {
  ico: "assets/favicon/favicon.ico",
  svg: "assets/favicon/favicon.svg",
  apple: "assets/favicon/apple-touch-icon.png",
  android192: "assets/favicon/android-chrome-192x192.png",
  android512: "assets/favicon/android-chrome-512x512.png",
} as const;

/**
 * OG Image dimensions
 */
export const ogImageDimensions = {
  default: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 600 },
  square: { width: 1200, height: 1200 },
} as const;

export type BrandColors = typeof colors;
export type BrandTypography = typeof typography;
export type LogoAssets = typeof logoAssets;
