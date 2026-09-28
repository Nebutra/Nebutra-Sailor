import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { seoContent } from "@/lib/landing-content";

/**
 * What search engines and link previews say about the whole site — the
 * defaults every page starts from. template-build replaces this file with
 * site-meta.for-template.ts, which reads the customer's src/content/site.ts.
 */
export const SITE_SEO = {
  siteName: `${brand.name} Sailor`,
  description: seoContent.description,
  softwareDescription: "The Startup Agent OS — ship global SaaS in days, not months",
};

/** The default title and description for a locale. */
export async function siteMetadata(
  locale: string,
): Promise<{ title: string; description: string }> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}
