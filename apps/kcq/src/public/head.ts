/** Head metadata for a public page, rendered by @unhead/vue at prerender time and kept on hydration. */
// The same file public.css loads as `kcq-outfit-600.woff2` (vite.config.mjs alias), so one fetch.
import outfitFont from "@fontsource/outfit/files/outfit-latin-600-normal.woff2?url";
import { PUBLIC_MESSAGES } from "./messages";
import {
  KCQ_ORIGIN,
  PUBLIC_LOCALE_IDS,
  PUBLIC_LOCALES,
  type PublicLocale,
  type PublicPage,
  publicAlternates,
  publicPath,
} from "./routes";

/**
 * Page backgrounds of the KCQ light and dark interface themes (upstream
 * `foundation/tokens/interface-colors.ts`), so browser chrome matches the page.
 */
export const PUBLIC_THEME_COLORS = { light: "#F5F5F7", dark: "#151619" } as const;

const SITE_NAME = "KLineChartQuant";

/** 1200 × 630, one per locale, drawn at build time by scripts/og-images.mjs from this head. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** FNV-1a: a stable cache key for the OG image, so a copy change gets a new URL. */
function contentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function ogImageUrl(locale: PublicLocale): string {
  const home = PUBLIC_MESSAGES[locale].home;
  return `${KCQ_ORIGIN}/og/home-${locale}.png?v=${contentHash(home.heading + home.description)}`;
}

const ICONS = [
  { rel: "icon" as const, href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon" as const, href: "/apple-touch-icon.png" },
];

/**
 * The display face is preloaded and set to `font-display: optional` (public.css): it is almost
 * always ready for first paint, and if it is not, the page keeps the fallback instead of reflowing
 * the headline when the font arrives (the swap was the only layout shift Lighthouse measured).
 */
const FONT_PRELOAD = {
  rel: "preload" as const,
  href: outfitFont,
  as: "font" as const,
  type: "font/woff2",
  crossorigin: "anonymous" as const,
};

export function publicHead(page: PublicPage, locale: PublicLocale) {
  const copy = PUBLIC_MESSAGES[locale][page];
  const url = KCQ_ORIGIN + publicPath(page, locale);
  const { htmlLang, ogLocale } = PUBLIC_LOCALES[locale];
  const image = ogImageUrl(locale);
  const imageAlt = PUBLIC_MESSAGES[locale].home.ogAlt;
  return {
    title: copy.title,
    htmlAttrs: { lang: htmlLang },
    link: [
      { rel: "canonical" as const, href: url },
      ...publicAlternates(page).map(({ hreflang, href }) => ({
        rel: "alternate" as const,
        hreflang,
        href,
      })),
      ...ICONS,
      FONT_PRELOAD,
    ],
    meta: [
      { name: "description", content: copy.description },
      { name: "color-scheme", content: "light dark" },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: PUBLIC_THEME_COLORS.light,
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: PUBLIC_THEME_COLORS.dark,
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: copy.title },
      { property: "og:description", content: copy.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: String(OG_IMAGE_SIZE.width) },
      { property: "og:image:height", content: String(OG_IMAGE_SIZE.height) },
      { property: "og:image:alt", content: imageAlt },
      { property: "og:locale", content: ogLocale },
      ...PUBLIC_LOCALE_IDS.filter((other) => other !== locale).map((other) => ({
        property: "og:locale:alternate",
        content: PUBLIC_LOCALES[other].ogLocale,
      })),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: copy.title },
      { name: "twitter:description", content: copy.description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: imageAlt },
    ],
  };
}

/** The 404 body: same chrome and language, no canonical or alternates, never indexed. */
export function notFoundHead(locale: PublicLocale) {
  const copy = PUBLIC_MESSAGES[locale].notFound;
  return {
    title: copy.title,
    htmlAttrs: { lang: PUBLIC_LOCALES[locale].htmlLang },
    link: ICONS,
    meta: [
      { name: "description", content: copy.description },
      { name: "robots", content: "noindex" },
      { name: "color-scheme", content: "light dark" },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: PUBLIC_THEME_COLORS.light,
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: PUBLIC_THEME_COLORS.dark,
      },
    ],
  };
}
