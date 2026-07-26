import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

/**
 * Public docs origin (brand.domains.docs) — indexable.
 *
 * Host comes from the brand SSOT (with the app's own NEXT_PUBLIC_DOCS_ORIGIN_URL
 * override, same env var as [lang]/layout.tsx's metadataBase), never a literal,
 * so a white-label rebrand cannot leave a stale domain in robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_DOCS_ORIGIN_URL?.replace(/\/+$/, "") || getBrandOrigin("docs");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
