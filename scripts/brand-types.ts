/**
 * Brand Configuration Types
 * Type definitions for white-label brand customization
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

export interface BrandConfig {
  /**
   * Brand Identity
   */
  brand: {
    /** Brand name (e.g., "Nebutra") */
    name: string;
    /** Short tagline */
    tagline: string;
    /** Full description */
    description: string;
    /** Vision pillars for README */
    vision?: {
      pillars: Array<{
        word: string;
        meaning: string;
      }>;
    };
  };

  /**
   * Company Information
   */
  company: {
    /** Legal company name */
    name: string;
    /** Chinese company name (optional) */
    nameCN?: string;
    /** Contact email */
    email: string;
    /** Founded year */
    year: number;
  };

  /**
   * Domains
   */
  domains: {
    landing: string;
    app: string;
    api: string;
    studio: string;
    cdn: string;
  };

  /**
   * Social Links
   */
  social: {
    twitter?: string;
    github?: string;
    discord?: string;
    linkedin?: string;
  };

  /**
   * GitHub Repository
   */
  repo: {
    owner: string;
    name: string;
  };

  /**
   * Brand Colors
   */
  colors: {
    primary: ColorScale;
    accent: ColorScale;
    neutral: NeutralColorScale;
  };

  /**
   * Feature Toggles
   */
  features: {
    // Core
    multiTenant: boolean;
    ai: boolean;

    // Optional modules
    web3: boolean;
    ecommerce: boolean;
    recsys: boolean;
    content: boolean;

    // Providers
    stripe: boolean;
    resend: boolean;

    // i18n
    i18n: boolean;
    supportedLocales: string[];
  };

  /**
   * Package scope (e.g., "@nebutra")
   */
  packageScope: string;

  /**
   * License configuration
   */
  license: {
    type: string;
    commercialExempt: string[];
  };
}

/**
 * Default Nebutra brand config
 * Used as fallback when no brand.config.ts exists
 */
export const DEFAULT_BRAND: BrandConfig = {
  brand: {
    name: "Nebutra",
    tagline: "The Open-Source Enterprise SaaS Platform",
    description: "AI-native enterprise platform for multi-tenant systems",
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
    github: "https://github.com/Nebutra/Nebutra-Sailor",
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
    primary: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
    accent: {
      50: "#f0fdfa",
      100: "#ccfbf1",
      200: "#99f6e4",
      300: "#5eead4",
      400: "#2dd4bf",
      500: "#14b8a6",
      600: "#0d9488",
      700: "#0f766e",
      800: "#115e59",
      900: "#134e4a",
      950: "#042f2e",
    },
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
