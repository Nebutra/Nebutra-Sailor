/**
 * Brand Configuration for White-label Deployment
 *
 * Copy this file to `brand.config.ts` and customize for your brand.
 * Run `pnpm brand:apply` to apply changes throughout the codebase.
 *
 * @see WHITELABEL.md for detailed instructions
 */

import type { BrandConfig } from "./scripts/brand-types";

const config: BrandConfig = {
  /**
   * Brand Identity
   */
  brand: {
    name: "MyBrand",
    tagline: "The Open-Source Enterprise SaaS Platform",
    description: "AI-native enterprise platform for multi-tenant systems",

    // Vision statement (for README)
    vision: {
      pillars: [
        { word: "My", meaning: "Your unique value proposition" },
        { word: "Brand", meaning: "Your brand story" },
        { word: "Here", meaning: "Your mission" },
      ],
    },
  },

  /**
   * Company Information
   */
  company: {
    name: "My Company Inc.",
    nameCN: "我的公司", // Chinese name (optional)
    email: "hello@mybrand.com",
    year: 2024, // Founded year for copyright
  },

  /**
   * Domains
   */
  domains: {
    landing: "mybrand.com",
    app: "app.mybrand.com",
    api: "api.mybrand.com",
    studio: "studio.mybrand.com",
    cdn: "cdn.mybrand.com",
  },

  /**
   * Social Links
   */
  social: {
    twitter: "https://twitter.com/mybrand",
    github: "https://github.com/mybrand",
    discord: "https://discord.gg/mybrand",
    linkedin: "https://linkedin.com/company/mybrand",
  },

  /**
   * GitHub Repository (for README badges)
   */
  repo: {
    owner: "mybrand",
    name: "mybrand-platform",
  },

  /**
   * Brand Colors (Tailwind-compatible)
   * Use hex values - will be converted to HSL for CSS variables
   */
  colors: {
    primary: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1", // Main primary
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
      500: "#14b8a6", // Main accent
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

  /**
   * Feature Toggles
   * Disable features you don't need - they will be excluded from builds
   */
  features: {
    // Core features (usually keep enabled)
    multiTenant: true,
    ai: true,

    // Optional modules
    web3: false, // Blockchain/crypto features
    ecommerce: false, // Shopify/Shopline integration
    recsys: false, // Recommendation system
    content: true, // Content/feed system

    // Providers
    stripe: true, // Stripe payments
    resend: true, // Resend email

    // i18n
    i18n: true,
    supportedLocales: ["en", "zh-CN"],
  },

  /**
   * Package Naming
   * Change the npm scope for all packages
   */
  packageScope: "@mybrand",

  /**
   * License
   */
  license: {
    type: "FSL-1.1-ALv2",
    commercialExempt: ["My Company Inc."], // Companies exempt from commons clause
  },
};

export default config;
