import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-routes";

export default function robots(): MetadataRoute.Robots {
  // Same base-URL derivation as every other SEO surface (brand SSOT + env
  // override, trailing slash normalized) instead of re-reading process.env here.
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/sign-in", "/sign-up", "/admin/", "/settings/"],
        // Legacy locale prefixes (bare /zh, /zh-CN, /en-US …) are intentionally
        // NOT disallowed: they 308 to their route-locale equivalent in
        // src/proxy.ts, and a disallowed URL cannot pass its redirect signal.
      },
      // `/docs/` is deliberately absent from the AI-crawler allow lists:
      // marketing /docs only 308s to the docs origin (see src/lib/docs-routing.ts),
      // so naming it here advertises a redirect-only path. Docs crawling is
      // declared on the origin that serves them: apps/sailor-docs/src/app/robots.ts.
      // Named AI / answer-engine bots — narrow allow list (see docs/seo/bot-policy-matrix.md).
      // They do not inherit the full `*` surface: product + blog only.
      ...(
        [
          "GPTBot",
          "ClaudeBot",
          "Google-Extended",
          "Applebot-Extended",
          "CCBot",
          "Bytespider",
        ] as const
      ).map((userAgent) => ({
        userAgent,
        allow: ["/", "/blog/", "/features", "/features/", "/pricing", "/llms.txt"],
        disallow: ["/api/", "/_next/", "/sign-in", "/sign-up", "/admin/", "/settings/"],
      })),
    ],
    // Sharded sitemap. Next serves the shards at /sitemap/<locale>.xml and
    // emits no index of its own, so /sitemap.xml is the hand-written
    // <sitemapindex> in app/sitemap.xml/route.ts — the same URL crawlers and
    // Search Console already have on record.
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
