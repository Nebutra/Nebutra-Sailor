import { docsPath, LANGS, LOCALES } from "./i18n";
import { KCQ_ORIGIN } from "./site";
import { source } from "./source";

/** Every docs page in both languages, each listing all variants plus x-default (reciprocal). */
export function sitemapXml(): string {
  const urls: string[] = [];
  for (const lang of LANGS) {
    for (const page of source.getPages(lang)) {
      const alternates = [
        ...LANGS.map(
          (l) =>
            `    <xhtml:link rel="alternate" hreflang="${LOCALES[l].hreflang}" href="${KCQ_ORIGIN}${docsPath(l, page.slugs)}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${KCQ_ORIGIN}${docsPath("en", page.slugs)}"/>`,
      ];
      urls.push(
        `  <url>\n    <loc>${KCQ_ORIGIN}${docsPath(lang, page.slugs)}</loc>\n${alternates.join("\n")}\n  </url>`,
      );
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
