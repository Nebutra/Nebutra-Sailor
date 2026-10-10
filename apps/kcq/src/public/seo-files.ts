/**
 * Expected contents of public/robots.txt and public/sitemap.xml, derived from the route table.
 * The files stay static and reviewable; seo-files.test.ts fails when they drift.
 */
import { DOCS_PATHS, KCQ_ORIGIN, PUBLIC_PAGES, PUBLIC_ROUTES, publicAlternates } from "./routes";

export function renderRobotsTxt(): string {
  return [
    "# Public KCQ pages are indexed; the workbench, account settings and everything else are not.",
    "# Hashed assets stay crawlable so search engines can render the public pages.",
    "User-agent: *",
    ...PUBLIC_ROUTES.map((route) => `Allow: ${route.path}$`),
    "Allow: /assets/",
    "# The agent-readable view of these pages (src/public/llms.ts).",
    "Allow: /llms.txt$",
    "# The documentation (apps/kcq-docs), with its own sitemap.",
    `Allow: ${DOCS_PATHS.en}`,
    `Allow: ${DOCS_PATHS.zh}`,
    "Disallow: /",
    "",
    `Sitemap: ${KCQ_ORIGIN}/sitemap.xml`,
    `Sitemap: ${KCQ_ORIGIN}${DOCS_PATHS.en}/sitemap.xml`,
    "",
  ].join("\n");
}

/** No <lastmod>: a build timestamp is worse than none (seo-locale-closure guard 4). */
export function renderSitemapXml(): string {
  const urls = PUBLIC_PAGES.flatMap((page) => {
    const alternates = publicAlternates(page);
    return PUBLIC_ROUTES.filter((route) => route.page === page).map((route) =>
      [
        "  <url>",
        `    <loc>${KCQ_ORIGIN}${route.path}</loc>`,
        ...alternates.map(
          ({ hreflang, href }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        ),
        "  </url>",
      ].join("\n"),
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
