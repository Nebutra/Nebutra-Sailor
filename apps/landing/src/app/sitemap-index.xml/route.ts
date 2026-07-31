import { generateSitemaps } from "@/app/sitemap";
import { getSiteUrl } from "@/lib/seo/site-routes";

/**
 * Sitemap index for the sharded per-locale sitemaps.
 *
 * `app/sitemap.ts` exports `generateSitemaps`, which makes Next serve the
 * shards at `/sitemap/<id>.xml` ONLY — `normalizeMetadataPageToRoute` in
 * next/dist/lib/metadata/get-metadata-route.js maps a dynamic metadata route to
 * `<path>/[__metadata_id__]` *instead of* `<path>.xml`, and Next never emits a
 * `<sitemapindex>` of its own. Without this file `/sitemap.xml` (the URL
 * robots.txt advertises and Search Console already has on record) would 404 and
 * nothing would link the shards.
 *
 * The child list comes from `generateSitemaps()` so the index and the shards
 * can never disagree about which locales exist.
 *
 * No route-segment config on purpose: the handler touches no dynamic request
 * API, so Next prerenders it, and `cacheComponents` stays happy without an
 * explicit `dynamic`/`revalidate` opt-out.
 */
export function GET(): Response {
  const baseUrl = getSiteUrl();
  const children = generateSitemaps().map(
    ({ id }) =>
      `  <sitemap>\n    <loc>${baseUrl}/sitemap/${encodeURIComponent(id)}.xml</loc>\n  </sitemap>`,
  );

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...children,
    "</sitemapindex>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
