import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export const DEFAULT_SITE_URL = "https://nebutra.com" as const;

/** Map next-intl locale codes → BCP-47 hreflang values for `<link rel="alternate">`. */
const HREFLANG_MAP: Record<string, string> = {
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
};

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

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

function joinUrl(base: string, prefix: string, path: string): string {
  // Ensure path starts with "/", and avoid duplicating slashes.
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${prefix}${safePath}`;
}

function buildHreflangAlternates(baseUrl: string, path: string): Record<string, string> {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    const key = HREFLANG_MAP[loc] ?? loc;
    languages[key] = `${baseUrl}${localePrefix(loc)}${safePath}`;
  }
  languages["x-default"] = `${baseUrl}${safePath}`;
  return languages;
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
  const canonical = joinUrl(baseUrl, localePrefix(opts.locale), opts.path);
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
