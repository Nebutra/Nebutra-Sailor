import { brand } from "@nebutra/brand/metadata";
import type { BuildPageMetadataOptions } from "@/lib/seo/metadata";
import { pageAt, sectionOf } from "@/site-map";

/**
 * What buildPageMetadata needs for a Nebutra-site page, from the site map: the
 * page's title and its section's one-line `is`. Pages do not restate either.
 */
export function sitePageMeta(
  locale: string,
  path: string,
  override: { title?: string; description?: string } = {},
): BuildPageMetadataOptions {
  const page = pageAt(path);
  if (!page) throw new Error(`${path} is not in site-map.ts`);
  return {
    title: override.title ?? (path === "/" ? brand.name : `${page.title.en} — ${brand.name}`),
    description: override.description ?? sectionOf(page.section).is,
    path,
    locale,
  };
}
