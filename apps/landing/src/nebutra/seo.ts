import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import type { BuildPageMetadataOptions } from "@/lib/seo/metadata";
import type { SiteMapTranslator } from "@/nebutra/i18n";
import { pageAt } from "@/site-map";

/**
 * What buildPageMetadata needs for a Nebutra-site page, from the site map: the
 * page's title and its section's one-line `is`, both read from the `siteMap`
 * messages namespace in the page's own locale. Pages do not restate either.
 */
export async function sitePageMeta(
  locale: string,
  path: string,
  override: { title?: string; description?: string } = {},
): Promise<BuildPageMetadataOptions> {
  const page = pageAt(path);
  if (!page) throw new Error(`${path} is not in site-map.ts`);
  const t = (await getTranslations({
    locale,
    namespace: "siteMap",
  })) as unknown as SiteMapTranslator;
  return {
    title:
      override.title ??
      (path === "/" ? brand.name : `${t(`pages.${page.key}.title`)} — ${brand.name}`),
    description: override.description ?? t(`sections.${page.section}.is`),
    path,
    locale,
  };
}
