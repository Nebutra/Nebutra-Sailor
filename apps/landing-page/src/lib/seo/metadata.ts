import type { Metadata } from "next";
import type { routing } from "@/i18n/routing";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  DEFAULT_SITE_URL,
  getSiteUrl,
} from "./site-routes";

export { DEFAULT_SITE_URL };

/** Map next-intl locale codes → OpenGraph `og:locale` values. */
const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
};

export type SupportedLocale = (typeof routing.locales)[number];

export type OgType = "website" | "article" | "profile";

export interface BuildPageMetadataOptions {
  readonly title: string;
  readonly description: string;
  /** Path beginning with `/`, without locale prefix. */
  readonly path: string;
  readonly locale: SupportedLocale | string;
  /** Absolute URL of the OG image. Defaults to dynamic `/api/og?title=...`. */
  readonly image?: string;
  readonly type?: OgType;
  /** Optional site name override (defaults to "Nebutra"). */
  readonly siteName?: string;
  /** Twitter handle without leading "@" (e.g. "nebutra"). */
  readonly twitterHandle?: string;
}

function defaultOgImageUrl(baseUrl: string, title: string, subtitle?: string): string {
  const params = new URLSearchParams({ title });
  if (subtitle) params.set("subtitle", subtitle);
  return `${baseUrl}/api/og?${params.toString()}`;
}

/**
 * Build a fully-populated Next.js `Metadata` object for a page:
 * - canonical (locale-aware)
 * - hreflang alternates (one per supported locale + x-default)
 * - openGraph (title, description, url, locale, image)
 * - twitter card (summary_large_image, image)
 */
export function buildPageMetadata(opts: BuildPageMetadataOptions): Metadata {
  const baseUrl = getSiteUrl();
  const canonical = canonicalUrlForLocale(baseUrl, opts.locale, opts.path);
  const languages = buildHreflangAlternates(baseUrl, opts.path);
  const imageUrl = opts.image ?? defaultOgImageUrl(baseUrl, opts.title, opts.description);
  const ogType: OgType = opts.type ?? "website";
  const siteName = opts.siteName ?? "Nebutra";

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: ogType,
      title: opts.title,
      description: opts.description,
      url: canonical,
      siteName,
      locale: OG_LOCALE_MAP[opts.locale] ?? "en_US",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: opts.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [imageUrl],
      ...(opts.twitterHandle ? { creator: `@${opts.twitterHandle}` } : {}),
    },
    metadataBase: new URL(baseUrl),
  };
}
