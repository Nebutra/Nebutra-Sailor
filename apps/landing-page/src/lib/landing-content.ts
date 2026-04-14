/**
 * Landing Page Content Constants
 *
 * All copywriting for the Nebutra Sailor landing page.
 * Reference: DESIGN.md
 *
 * @see apps/landing-page/DESIGN.md
 */

// =============================================================================
// Hero Section
// =============================================================================

export const heroContent = {
  badge: "AGPLv3 Licensed · Production-Ready",
  preHeadline: "The SaaS framework for",
  headlineWords: ["builders who ship", "teams who scale", "founders who win"],
  command: "npx create-sailor@latest",
  ctaPrimary: "Get Started",
  ctaSecondary: "Star on GitHub",
  scrollHint: "Scroll to explore",
} as const;

// =============================================================================
// Logo Strip (Tech Stack Logos)
// =============================================================================

/**
 * Tech stack logos for the logo strip.
 *
 * Primary source: SVGL (https://svgl.app)
 * - AGPLv3 licensed, open source
 * - 300+ tech logos with light/dark variants
 * - CDN: https://svgl.app/library/{filename}.svg
 *
 * Fallback source: simple-icons CDN
 * - CDN: https://cdn.simpleicons.org/{slug}/{color}
 *
 * @see https://svgl.app for logo browser
 * @see https://github.com/pheralb/svgl for source
 */

const SVGL_BASE = "https://svgl.app/library";
const SIMPLE_ICONS_BASE = "https://cdn.simpleicons.org";

export interface TechLogo {
  name: string;
  /** SVGL path variants */
  svgl?: {
    light: string;
    dark: string;
  };
  /** Fallback to simple-icons */
  simpleIcons?: {
    slug: string;
    color?: string;
  };
}

/**
 * SVGL naming convention:
 * - `_light.svg` = logo designed for LIGHT backgrounds (dark colored logo)
 * - `_dark.svg` = logo designed for DARK backgrounds (light colored logo)
 *
 * Our config:
 * - `light` property = what to show on LIGHT theme backgrounds
 * - `dark` property = what to show on DARK theme backgrounds
 */
export const techStackLogos: TechLogo[] = [
  {
    name: "Next.js",
    svgl: {
      light: "nextjs_logo_light.svg", // Black logo for light bg
      dark: "nextjs_logo_dark.svg", // White logo for dark bg
    },
  },
  {
    name: "React",
    svgl: {
      light: "react_dark.svg", // Dark react logo for light bg
      dark: "react_light.svg", // Light react logo for dark bg
    },
  },
  {
    name: "TypeScript",
    svgl: {
      light: "typescript.svg", // Blue TS works on both
      dark: "typescript.svg",
    },
  },
  {
    name: "Prisma",
    svgl: {
      light: "prisma.svg", // Dark prisma for light bg
      dark: "prisma_dark.svg", // White prisma for dark bg
    },
  },
  {
    name: "Supabase",
    svgl: {
      light: "supabase.svg", // Green works on both
      dark: "supabase.svg",
    },
  },
  {
    name: "Clerk",
    svgl: {
      light: "clerk-icon-light.svg", // Dark icon for light bg (SVGL naming = target bg)
      dark: "clerk-icon-dark.svg", // White icon for dark bg
    },
  },
  {
    name: "Vercel",
    svgl: {
      light: "vercel.svg", // Black triangle for light bg
      dark: "vercel_dark.svg", // White triangle for dark bg
    },
  },
  {
    name: "Cloudflare",
    svgl: {
      light: "cloudflare.svg", // Orange CF works on both
      dark: "cloudflare.svg",
    },
  },
  {
    name: "TailwindCSS",
    svgl: {
      light: "tailwindcss.svg", // Cyan TW works on both
      dark: "tailwindcss.svg",
    },
  },
  {
    name: "Redis",
    svgl: {
      light: "redis.svg", // Red redis works on both
      dark: "redis.svg",
    },
  },
  {
    name: "Hono",
    svgl: {
      light: "hono.svg", // Orange flame works on both backgrounds
      dark: "hono.svg", // No dark variant exists, orange works on dark bg
    },
  },
];

/**
 * Get logo URL for a tech stack item
 * @param logo - TechLogo object
 * @param theme - "light" | "dark" (default: "dark" for dark landing page bg)
 */
export const getLogoUrl = (logo: TechLogo, theme: "light" | "dark" = "dark"): string => {
  if (logo.svgl) {
    return `${SVGL_BASE}/${logo.svgl[theme]}`;
  }
  if (logo.simpleIcons) {
    return `${SIMPLE_ICONS_BASE}/${logo.simpleIcons.slug}/${logo.simpleIcons.color ?? "white"}`;
  }
  return "";
};

/**
 * Get all logo URLs for a specific theme
 */
export const getAllLogoUrls = (theme: "light" | "dark" = "dark") =>
  techStackLogos.map((logo) => ({
    name: logo.name,
    url: getLogoUrl(logo, theme),
  }));

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
    href: "https://status.nebutra.com",
  },
} as const;

// =============================================================================
// Metadata / SEO
// =============================================================================

export const seoContent = {
  title: "云毓智能官网 — 综合门户与产品矩阵",
  description:
    "提供产品介绍、用户登录及SaaS服务平台。云毓智能致力于提供企业级的解决方案与全栈式的 AI 技术支持。",
  keywords: [
    "saas framework",
    "multi-tenant",
    "next.js boilerplate",
    "enterprise saas",
    "open source",
    "startup framework",
  ],
  ogImage: "/og-image.png",
  twitterHandle: "@nebutra",
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type HeroContent = typeof heroContent;
export type TechStackLogo = (typeof techStackLogos)[number];
