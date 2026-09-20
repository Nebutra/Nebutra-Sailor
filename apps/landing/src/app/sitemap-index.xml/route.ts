import { generateSitemaps } from "@/app/sitemap";
import { getSiteUrl } from "@/lib/seo/site-routes";

/** Where the docs zone serves its sitemap, in this site's path space. */
const DOCS_SITEMAP_PATH = "/docs/sitemap.xml";

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

  // The docs zone's own sitemap. It is a separate deployment mounted at /docs
  // (apps/sailor-docs, basePath "/docs"), so its pages are invisible to the
  // shards above — they are generated from this app's route registry. And a
  // sitemap is only discoverable through the robots.txt of the host it sits on,
  // which is this app's: without this entry the whole documentation tree became
  // uncrawlable the moment docs stopped having a subdomain of their own.
  children.push(`  <sitemap>\n    <loc>${baseUrl}${DOCS_SITEMAP_PATH}</loc>\n  </sitemap>`);

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
