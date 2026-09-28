import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
/**
 * Landing Page Content Constants
 *
 * All copywriting for the Sailor landing page.
 * Reference: DESIGN.md
 *
 * @see apps/landing/DESIGN.md
 */

// =============================================================================
// Hero Section
// =============================================================================

export const heroContent = {
  badge: "FSL Licensed · Production-Ready",
  preHeadline: "The SaaS framework for",
  headlineWords: ["builders who ship", "teams who scale", "founders who win"],
  command: "npx create-sailor@latest",
  ctaPrimary: "Create your first workspace",
  ctaSecondary: "Star on GitHub",
  scrollHint: "Scroll to explore",
} as const;

// =============================================================================
// Footer
// =============================================================================

export const footerContent = {
  social: [
    { platform: "x", href: "https://x.com/nebutra" },
    { platform: "github", href: "https://github.com/nebutra" },
    { platform: "discord", href: "https://discord.gg/nebutra" },
  ],
  status: {
    label: "Online",
    href: getBrandOrigin("status"),
  },
} as const;

// =============================================================================
// Metadata / SEO
// =============================================================================

export const seoContent = {
  title: `${brand.name} Agent OS | The Startup Agent OS`,
  description:
    "The Startup Agent OS for founders going global. Production-ready Next.js foundation with governed architecture, auth, billing, agents, i18n, and SEO-ready public pages.",
  keywords: [
    "saas framework",
    "multi-tenant",
    "agent infrastructure",
    "enterprise saas",
    "open source",
    "ai platform",
  ],
  ogImage: "/og-image.png",
  twitterHandle: "@nebutra",
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type HeroContent = typeof heroContent;
