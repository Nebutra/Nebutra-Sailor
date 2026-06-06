/**
 * @nebutra/brand — metadata-helpers
 *
 * Pure functions deriving Next.js Metadata, JSON-LD objects, PWA manifest,
 * and feed channel headers from the single `brand` + `colors` SSOT.
 *
 * Zero hardcoded brand-name literals — every string is derived from `brand`
 * or `colors`. The arch drift guard `tests/architecture/brand-metadata-drift.test.ts`
 * asserts this invariant at CI time.
 *
 * NOTE: `next` is a TYPE-ONLY import here. The package declares `next` as an
 * optional peer dep + devDep (catalog:). skipLibCheck:true is set in tsconfig.json.
 * Adding `import "server-only"` is intentionally omitted: this file is consumed
 * by both server and client render paths in tests; the CALLER must enforce
 * server-only boundaries if needed.
 *
 * NOTE: getSiteUrl(service) in this module is DISTINCT from the zero-param
 * getSiteUrl() in apps/landing-page/src/lib/seo/site-routes.ts — different
 * modules, no collision. The local one remains the landing-page URL util.
 */

import type { Metadata, MetadataRoute } from "next";
import { brand, colors } from "./metadata";

/** Services that have a canonical domain in brand.domains */
export type BrandService = "landing" | "app" | "api" | "studio" | "cdn";

/**
 * Returns the canonical base URL for the given service.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL env var (trailing slash stripped)
 *   2. https://brand.domains[service]
 *
 * NOTE: hex casing deliberate — this module does NOT touch core.json (which
 * uses lowercase). brand.domains are always .com per RESOLVED Decision 2.
 */
export function getSiteUrl(service: BrandService = "landing"): string {
  const envUrl = process.env["NEXT_PUBLIC_SITE_URL"];
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return `https://${brand.domains[service]}`;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export interface SiteMetadataOptions {
  readonly service: BrandService;
  readonly title?: string;
  readonly description?: string;
}

/**
 * Returns a partial Next.js Metadata object suitable for spreading into a
 * layout.tsx export const metadata. Callers may override any field.
 */
export function getSiteMetadata(opts: SiteMetadataOptions): Metadata {
  const siteUrl = getSiteUrl(opts.service);
  const title = opts.title ?? brand.name;
  const description = opts.description ?? brand.tagline;

  return {
    applicationName: brand.name,
    title: {
      default: title,
      template: `%s — ${brand.name}`,
    },
    description,
    metadataBase: new URL(siteUrl),
    authors: [{ name: brand.name, url: siteUrl }],
    creator: brand.name,
    publisher: brand.name,
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      site: brand.social.twitter.replace("https://twitter.com/", "@"),
      title,
      description,
    },
  };
}

// ─── JSON-LD types ─────────────────────────────────────────────────────────────

export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  "@id": string;
  name: string;
  alternateName: string;
  url: string;
  sameAs: string[];
  [key: string]: unknown;
}

export interface WebSiteJsonLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  "@id": string;
  name: string;
  url: string;
  description: string;
  publisher: { "@id": string };
  inLanguage: string[];
  [key: string]: unknown;
}

export interface SoftwareApplicationJsonLd {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  url: string;
  author: { "@id": string };
  [key: string]: unknown;
}

export interface FeedChannelMeta {
  title: string;
  link: string;
  description: string;
  feedUrl: string;
  language: string;
}

// ─── JSON-LD builders ────────────────────────────────────────────────────────

/**
 * Base Organization JSON-LD — company-specific fields
 * (foundingDate, address, contactPoint) are intentionally omitted here.
 * Merge them at the call site to avoid hard-coding values here.
 */
export function buildOrganizationJsonLd(): OrganizationJsonLd {
  const siteUrl = getSiteUrl("landing");
  const id = `${siteUrl}/#organization`;

  const sameAs = [
    brand.social.github,
    brand.social.twitter.replace("https://twitter.com/", "https://x.com/"),
    brand.social.linkedin,
    brand.social.discord,
  ].filter((url) => url.trim() !== "");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": id,
    name: brand.name,
    alternateName: brand.nameCn,
    url: siteUrl,
    sameAs,
  };
}

export function buildWebSiteJsonLd(): WebSiteJsonLd {
  const siteUrl = getSiteUrl("landing");
  const org = buildOrganizationJsonLd();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: brand.name,
    url: siteUrl,
    description: brand.tagline,
    publisher: { "@id": org["@id"] },
    inLanguage: ["en", "zh"],
  };
}

export function buildSoftwareApplicationJsonLd(): SoftwareApplicationJsonLd {
  const siteUrl = getSiteUrl("landing");
  const org = buildOrganizationJsonLd();

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${brand.name} Sailor`,
    applicationCategory: "DeveloperApplication",
    url: `https://${brand.social.github.replace("https://github.com/", "github.com/")}`,
    author: { "@id": org["@id"] },
  };
}

// ─── PWA Manifest ────────────────────────────────────────────────────────────

/**
 * Returns a base PWA manifest derived from brand + colors.
 * background_color and theme_color use the palette's canonical hex values
 * (NOT CSS variables — service workers do not resolve var()).
 *
 * CONTRAST CAVEAT: theme_color = colors.primary["500"] assumes a dark
 * background context. If a rebrand sets a light primary, update this value.
 */
export function buildPwaManifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: colors.neutral["950"],
    theme_color: colors.primary["500"],
    orientation: "portrait-primary",
    scope: "/",
    lang: "en",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

// ─── Feed ────────────────────────────────────────────────────────────────────

/**
 * Returns the shared channel-level fields for RSS and Atom feeds.
 * Item-level links are built at the call site using the version string.
 */
export function buildFeedChannelMeta(): FeedChannelMeta {
  const siteUrl = getSiteUrl("landing");

  return {
    title: `${brand.name} Changelog`,
    link: `${siteUrl}/changelog`,
    description: brand.tagline,
    feedUrl: `${siteUrl}/api/changelog`,
    language: "en-us",
  };
}
