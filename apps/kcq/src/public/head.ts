/** Head metadata for a public page, rendered by @unhead/vue at prerender time and kept on hydration. */
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

const SITE_NAME = "KCQ";

export function publicHead(page: PublicPage, locale: PublicLocale) {
  const copy = PUBLIC_MESSAGES[locale][page];
  const url = KCQ_ORIGIN + publicPath(page, locale);
  const { htmlLang, ogLocale } = PUBLIC_LOCALES[locale];
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
      { property: "og:locale", content: ogLocale },
      ...PUBLIC_LOCALE_IDS.filter((other) => other !== locale).map((other) => ({
        property: "og:locale:alternate",
        content: PUBLIC_LOCALES[other].ogLocale,
      })),
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: copy.title },
      { name: "twitter:description", content: copy.description },
    ],
  };
}
