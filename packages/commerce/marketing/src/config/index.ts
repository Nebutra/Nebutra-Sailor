/**
 * @nebutra/marketing - Configuration
 */

import type { MarketingConfig, ProductHuntConfig } from "../types";

// ============================================
// Default Configuration
// ============================================

export const defaultMarketingConfig: MarketingConfig = {
  companyName: "Nebutra",
  website: "https://nebutra.com",
  social: {
    twitter: "https://twitter.com/nebutra",
    github: "https://github.com/nebutra",
    linkedin: "https://linkedin.com/company/nebutra",
    discord: "https://discord.gg/nebutra",
  },
  analytics: {
    enableAttribution: true,
    requireConsent: false,
    storagePrefix: "nebutra_mkt_",
  },
};

// ============================================
// Product Hunt Configuration
// ============================================

export const defaultProductHuntConfig: ProductHuntConfig = {
  postSlug: "nebutra",
  productName: "Nebutra",
  isLaunching: false,
};

/**
 * Create a marketing configuration with defaults
 */
export function createMarketingConfig(config: Partial<MarketingConfig>): MarketingConfig {
  return {
    ...defaultMarketingConfig,
    ...config,
    social: {
      ...defaultMarketingConfig.social,
      ...config.social,
    },
    analytics: {
      ...defaultMarketingConfig.analytics,
      ...config.analytics,
    },
  };
}

/**
 * Create a Product Hunt configuration with defaults
 */
export function createProductHuntConfig(config: Partial<ProductHuntConfig>): ProductHuntConfig {
  return {
    ...defaultProductHuntConfig,
    ...config,
  };
}

// ============================================
// URL Builders
// ============================================

/**
 * Build Product Hunt post URL
 */
export function getProductHuntUrl(slug: string): string {
  return `https://www.producthunt.com/posts/${slug}`;
}

/**
 * Build Product Hunt badge image URL
 */
export function getProductHuntBadgeUrl(
  postId: string,
  theme: "light" | "dark" | "neutral" = "light",
): string {
  const themeParam = theme === "neutral" ? "neutral" : theme;
  return `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=${postId}&theme=${themeParam}`;
}

/**
 * Build Product Hunt upvote button URL
 */
export function getProductHuntUpvoteUrl(slug: string): string {
  return `https://www.producthunt.com/posts/${slug}?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-${slug}`;
}

// ============================================
// Social Sharing URLs
// ============================================

export interface ShareUrls {
  twitter: string;
  linkedin: string;
  facebook: string;
  reddit: string;
}

/**
 * Generate social sharing URLs
 */
export function generateShareUrls(url: string, title: string, _description?: string): ShareUrls {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };
}

// ============================================
// Constants
// ============================================

export const PRODUCT_HUNT_COLORS = {
  primary: "#DA552F", // Product Hunt orange
  secondary: "#4B587C",
  background: {
    light: "#FFFFFF",
    dark: "#1B1B1B",
    neutral: "#F3F3F3",
  },
  text: {
    light: "#1B1B1B",
    dark: "#FFFFFF",
    neutral: "#4B587C",
  },
} as const;

export const TESTIMONIAL_SOURCE_ICONS = {
  "product-hunt": "🚀",
  twitter: "𝕏",
  linkedin: "💼",
  g2: "⭐",
  capterra: "🏆",
  trustpilot: "★",
  email: "📧",
  direct: "💬",
  other: "✨",
} as const;

export const TESTIMONIAL_SOURCE_NAMES = {
  "product-hunt": "Product Hunt",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
  g2: "G2",
  capterra: "Capterra",
  trustpilot: "Trustpilot",
  email: "Email",
  direct: "Direct Feedback",
  other: "Other",
} as const;
