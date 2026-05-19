/**
 * Brand Configuration Types
 *
 * Schema for the full brand surface — every field that lives in
 * `packages/design/brand/src/metadata.ts` is modeled here so the
 * `pnpm brand:apply` pipeline can regenerate metadata.ts from a single
 * source of truth without dropping data. To rename / rebrand, edit
 * DEFAULT_BRAND below (or a sibling `brand.config.ts`); `metadata.ts`
 * is a downstream artifact.
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface NeutralColorScale extends ColorScale {
  0: string;
}

export interface BrandColorPalette {
  primary: ColorScale;
  accent: ColorScale;
  neutral: NeutralColorScale;

  /** Solid neutrals — required for brand-mark contrast guarantees. */
  white: string;
  black: string;

  /** Brand gradients composed from primary / accent (VI manual standard). */
  gradient: {
    primary: string;
    primaryReverse: string;
    primaryVertical: string;
    primaryRadial: string;
  };

  /** Semantic palette wired into the design-tokens DTCG SSOT. */
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface BrandTypographyConfig {
  fontFamily: {
    en: string;
    cn: string;
    sans: string;
    mono: string;
    display: string;
    heading: string;
    brandPrint: string;
  };
  cssVars: {
    sans: string;
    mono: string;
    cnSans: string;
  };
  fontWeight: {
    thin: number;
    extraLight: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extraBold: number;
    black: number;
  };
  letterSpacing: {
    display: string;
    heading: string;
    subheading: string;
    body: string;
    caption: string;
    mono: string;
  };
  lineHeight: {
    none: number;
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

/** Logo path map for a single visual edition (classic vs compliant). */
export interface LogoEditionPaths {
  default: string;
  color: string;
  inverse: string;
  mono: string;
  en: string;
  zh: string;
  zhEn: string;
  horizontalEn: string;
  horizontalZh: string;
  verticalEn: string;
  verticalZh: string;
  /** Compliant edition adds mono variants for legal use. */
  horizontalEnMono?: string;
  horizontalZhMono?: string;
  verticalEnMono?: string;
  verticalZhMono?: string;
}

export interface LogoAssetConfig {
  /** Classic logo (v1.0) — preferred in UX surfaces. */
  classic: LogoEditionPaths;
  /** Compliant logo (v2.0) — required in commercial / legal contexts. */
  compliant: LogoEditionPaths;
}

export interface FontAssetConfig {
  poppins: {
    thin: string;
    thinItalic: string;
    extraLight: string;
    extraLightItalic: string;
    light: string;
    lightItalic: string;
    regular: string;
    italic: string;
    medium: string;
    mediumItalic: string;
    semiBold: string;
    semiBoldItalic: string;
    bold: string;
    boldItalic: string;
    extraBold: string;
    extraBoldItalic: string;
    black: string;
    blackItalic: string;
  };
  vivoSans: {
    thin: string;
    extraLight: string;
    light: string;
    regular: string;
    medium: string;
    demiBold: string;
    bold: string;
    extraBold: string;
    heavy: string;
  };
}

export interface FaviconAssetConfig {
  ico: string;
  svg: string;
  apple: string;
  android192: string;
  android512: string;
}

export interface OgImageDimensions {
  default: { width: number; height: number };
  twitter: { width: number; height: number };
  square: { width: number; height: number };
}

export interface BrandConfig {
  brand: {
    name: string;
    /** Chinese brand name (优毓 etc.) */
    nameCn?: string;
    /** Full legal name (English form, used in product chrome). */
    nameFull?: string;
    /** Full legal name (Chinese form, used in CN-region chrome). */
    nameFullEn?: string;
    tagline: string;
    taglineCn?: string;
    description: string;
    descriptionCn?: string;
    /**
     * Brand story / VI rationale. Surfaced in About pages and design-docs,
     * separated by language because translations are not always 1:1.
     */
    story?: {
      concept: string;
      colorMeaning: string;
      values: string[];
      missionStatement: string;
    };
    vision?: {
      pillars: Array<{
        word: string;
        meaning: string;
      }>;
    };
  };

  company: {
    name: string;
    nameCN?: string;
    email: string;
    year: number;
  };

  domains: {
    landing: string;
    app: string;
    api: string;
    studio: string;
    cdn: string;
  };

  social: {
    twitter?: string;
    github?: string;
    discord?: string;
    linkedin?: string;
  };

  repo: {
    owner: string;
    name: string;
  };

  colors: BrandColorPalette;
  typography: BrandTypographyConfig;
  logoAssets: LogoAssetConfig;
  fontAssets: FontAssetConfig;
  faviconAssets: FaviconAssetConfig;
  ogImageDimensions: OgImageDimensions;

  features: {
    multiTenant: boolean;
    ai: boolean;
    web3: boolean;
    ecommerce: boolean;
    recsys: boolean;
    content: boolean;
    stripe: boolean;
    resend: boolean;
    i18n: boolean;
    supportedLocales: string[];
  };

  packageScope: string;

  license: {
    type: string;
    commercialExempt: string[];
  };
}

/**
 * DEFAULT_BRAND — the real Nebutra VI Manual data.
 *
 * `pnpm brand:apply` regenerates `packages/design/brand/src/metadata.ts`
 * from this object (or from a sibling `brand.config.ts` if one exists).
 * Every field below is consumed by `scripts/brand-apply.ts`; do not
 * delete a key without also updating the writer there.
 */
export const DEFAULT_BRAND: BrandConfig = {
  brand: {
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
    story: {
      concept:
        "Logo以首字母N的基础造型概念为主要设计框架，通过几何正负空间构建隐形'N'，形成近似六边形的稳定结构",
      colorMeaning: "蓝绿渐变体现未来感与科技锋芒，'云'代表云端平台，'毓'寓意孕育与转化",
      values: ["AI Native", "Ship Fast", "Open by Default", "Global-Ready", "Enterprise-Grade"],
      missionStatement:
        "Help AI founders and SaaS teams go from idea to production 10x faster by providing the infrastructure layer they shouldn't have to build.",
    },
    vision: {
      pillars: [
        {
          word: "Nebula",
          meaning: "Aggregate data, tools, and intelligence into usable products",
        },
        {
          word: "Nurture",
          meaning: "Incubate AI-native apps via automated toolchains",
        },
        {
          word: "Ultra",
          meaning: "Ship reliable engineering and value-first outcomes",
        },
        {
          word: "Future",
          meaning: "Make AI productivity accessible to everyone",
        },
      ],
    },
  },
  company: {
    name: "Wuxi Nebutra Intelligence Technology Co., Ltd.",
    nameCN: "无锡云毓智能科技有限公司",
    email: "contact@nebutra.com",
    year: 2024,
  },
  domains: {
    landing: "nebutra.com",
    app: "app.nebutra.com",
    api: "api.nebutra.com",
    studio: "studio.nebutra.com",
    cdn: "cdn.nebutra.com",
  },
  social: {
    twitter: "https://twitter.com/nebutra",
    github: "https://github.com/nebutra",
    discord: "https://discord.gg/nebutra",
    linkedin: "https://linkedin.com/company/nebutra",
  },
  repo: {
    // Org account that hosts the canonical repo. The personal account
    // `TsekaLuk` was the pre-org origin and is preserved in git history,
    // but the live remote is github.com/Nebutra/Nebutra-Sailor.
    owner: "Nebutra",
    name: "Nebutra-Sailor",
  },
  colors: {
    // 云毓蓝 — Aligned with @nebutra/design-tokens SSOT (tokens/core.json color.nebutra-blue).
    primary: {
      50: "#f0f4ff",
      100: "#dbe4ff",
      200: "#bac8ff",
      300: "#91a7ff",
      400: "#5c7cfa",
      500: "#0033FE",
      600: "#002ad4",
      700: "#0021ab",
      800: "#001882",
      900: "#000f59",
      950: "#000830",
    },
    // 云毓青 — Aligned with @nebutra/design-tokens SSOT (tokens/core.json color.nebutra-cyan).
    accent: {
      50: "#e6fff8",
      100: "#b3ffec",
      200: "#80ffe0",
      300: "#4dfcd4",
      400: "#1af7c8",
      500: "#0BF1C3",
      600: "#09c9a3",
      700: "#07a183",
      800: "#057963",
      900: "#035143",
      950: "#012923",
    },
    // Neutrals — Slate (Tailwind). SSOT decision: Slate over Zinc.
    neutral: {
      0: "#ffffff",
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
    white: "#FFFFFF",
    black: "#000000",
    gradient: {
      primary: "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)",
      primaryReverse: "linear-gradient(135deg, #0BF1C3 0%, #0033FE 100%)",
      primaryVertical: "linear-gradient(180deg, #0033FE 0%, #0BF1C3 100%)",
      primaryRadial: "radial-gradient(circle, #0BF1C3 0%, #0033FE 100%)",
    },
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#0033FE",
  },
  typography: {
    fontFamily: {
      en: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      cn: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "vivo Sans", sans-serif',
      sans: '"Geist", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      mono: '"Geist Mono", "Fira Code", ui-monospace, Consolas, "Courier New", monospace',
      display: '"Geist", "Noto Sans SC", sans-serif',
      heading: '"Geist", "Noto Sans SC", sans-serif',
      brandPrint: '"vivo Sans", "PingFang SC", sans-serif',
    },
    cssVars: {
      sans: "var(--font-geist-sans)",
      mono: "var(--font-geist-mono)",
      cnSans: "var(--font-noto-sc)",
    },
    fontWeight: {
      thin: 100,
      extraLight: 200,
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extraBold: 800,
      black: 900,
    },
    letterSpacing: {
      display: "-0.04em",
      heading: "-0.03em",
      subheading: "-0.02em",
      body: "0em",
      caption: "0.01em",
      mono: "0em",
    },
    lineHeight: {
      none: 1,
      tight: 1.2,
      snug: 1.4,
      normal: 1.6,
      relaxed: 1.75,
      loose: 2,
    },
  },
  logoAssets: {
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
  },
  fontAssets: {
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
  },
  faviconAssets: {
    ico: "assets/favicon/favicon.ico",
    svg: "assets/favicon/favicon.svg",
    apple: "assets/favicon/apple-touch-icon.png",
    android192: "assets/favicon/android-chrome-192x192.png",
    android512: "assets/favicon/android-chrome-512x512.png",
  },
  ogImageDimensions: {
    default: { width: 1200, height: 630 },
    twitter: { width: 1200, height: 600 },
    square: { width: 1200, height: 1200 },
  },
  features: {
    multiTenant: true,
    ai: true,
    web3: true,
    ecommerce: true,
    recsys: true,
    content: true,
    stripe: true,
    resend: true,
    i18n: true,
    supportedLocales: ["en", "zh-CN"],
  },
  packageScope: "@nebutra",
  license: {
    type: "AGPLv3",
    commercialExempt: ["Wuxi Nebutra Intelligence Technology Co., Ltd.", "Nebutra Co., Ltd"],
  },
};
