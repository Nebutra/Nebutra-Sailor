import { brand } from "@nebutra/brand/metadata";
import { say } from "@/components/starter/starter-copy";
import { SITE } from "@/content/site";

/**
 * What search engines and link previews say about the whole site. The words
 * are in src/content/site.ts (SITE.meta). See site-meta.ts.
 */
export const SITE_SEO = {
  siteName: brand.name,
  description: say(SITE.meta.description, "en"),
  softwareDescription: say(SITE.meta.description, "en"),
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
  return { title: say(SITE.meta.title, locale), description: say(SITE.meta.description, locale) };
}
