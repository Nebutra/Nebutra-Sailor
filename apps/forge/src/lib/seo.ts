import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin, publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import type { Metadata } from "next";

const FORGE_OG_IMAGE = publicAssetUrl("forge/product/forge-anvil.png");

const INDEXNOW_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** Public Forge origin. Env wins so preview hosts stay honest. */
export function getForgeOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_FORGE_URL?.trim() || getBrandOrigin("forge");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/** Drop a baked-in `| {brand} Forge` so the layout title template cannot stack. */
export function stripForgeTitleSuffix(title: string): string {
  return title.replace(/\s*[|—–-]\s*[^|—–-]*Forge\s*$/i, "").trim();
}

export function forgeAbsoluteUrl(path = "/"): string {
  const origin = getForgeOrigin();
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export const FORGE_INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1,
  },
} as const;

export function getForgeVerification(): Metadata["verification"] {
  const google =
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing =
    process.env.BING_SITE_VERIFICATION?.trim() ||
    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export function getIndexNowKey(): string | undefined {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !INDEXNOW_KEY_RE.test(key)) return undefined;
  return key;
}

export function buildForgePageMetadata(opts: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly keywords?: readonly string[];
  readonly index?: boolean;
  /** Home uses the layout default; other routes go through the title template. */
  readonly absoluteTitle?: boolean;
}): Metadata {
  const path = opts.path === "/" ? "/" : opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const index = opts.index ?? true;
  const siteName = `${brand.name} Forge`;
  const title = opts.absoluteTitle ? opts.title : stripForgeTitleSuffix(opts.title);
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description: opts.description,
    ...(opts.keywords?.length ? { keywords: [...opts.keywords] } : {}),
    alternates: { canonical: path },
    robots: index ? FORGE_INDEX_ROBOTS : { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName,
      title,
      description: opts.description,
      url: path,
      images: [{ url: FORGE_OG_IMAGE, alt: siteName }],
    },
    twitter: {
      card: "summary",
      title,
      description: opts.description,
      images: [FORGE_OG_IMAGE],
    },
  };
}

export function buildForgeWebSiteJsonLd(description: string) {
  const origin = getForgeOrigin();
  const org = { "@id": `${getBrandOrigin("landing")}/#organization` };
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: `${brand.name} Forge`,
      url: `${origin}/`,
      description,
      publisher: org,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${brand.name} Forge`,
      url: `${origin}/`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ] as const;
}

export function buildForgeToolJsonLd(opts: {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly category: string;
}) {
  const pageUrl = forgeAbsoluteUrl(opts.path);
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Tools",
          item: forgeAbsoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: opts.category,
          item: `${forgeAbsoluteUrl("/")}#${opts.category}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: opts.name,
          item: pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: opts.name,
      description: opts.description,
      url: pageUrl,
      applicationCategory: "DeveloperApplication",
      isPartOf: { "@id": `${getForgeOrigin()}/#website` },
    },
  ] as const;
}
