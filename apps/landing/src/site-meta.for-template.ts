import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import enMessages from "../messages/en.json";

/**
 * What search engines and link previews say about the whole site. The words
 * are in messages/en.json -> site.meta (see src/content/site.ts for the
 * structure/config that stays there). See site-meta.ts.
 */
const enSiteMeta = enMessages.site.meta;

/** English only, read synchronously at module scope — SITE_SEO is a plain const, not a request. */
function sayEn(value: string): string {
  return value.replaceAll("{brandName}", brand.name);
}

export const SITE_SEO = {
  siteName: brand.name,
  description: sayEn(enSiteMeta.description),
  softwareDescription: sayEn(enSiteMeta.description),
  /** The product is the customer's own application, served from this site's domain. */
  software: {
    name: brand.name,
    applicationCategory: "BusinessApplication",
    url: `https://${brand.domains.landing}`,
  } as { name?: string; applicationCategory?: string; url?: string },
};

/** The default title and description for a locale. */
export async function siteMetadata(
  locale: string,
): Promise<{ title: string; description: string }> {
  const t = await getTranslations({ locale, namespace: "site.meta" });
  return { title: t("title"), description: t("description") };
}
