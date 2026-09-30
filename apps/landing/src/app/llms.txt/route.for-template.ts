import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { SITE, type SiteTranslator } from "@/content/site";
import { getSiteUrl } from "@/lib/seo/site-routes";

/**
 * LLM-readable summary of the site (https://llmstxt.org/), from the words in
 * messages/en.json -> site.* (English only — this file is always "en").
 */
export async function GET() {
  const base = getSiteUrl();
  const [tHero, tMeta, tFeatures] = await Promise.all([
    getTranslations({ locale: "en", namespace: "site.hero" }),
    getTranslations({ locale: "en", namespace: "site.meta" }),
    getTranslations({
      locale: "en",
      namespace: "site.features",
    }) as unknown as Promise<SiteTranslator>,
  ]);
  const features = SITE.features.items
    .map(
      (item) =>
        `- ${tFeatures(`items.${item.icon}.title`)}: ${tFeatures(`items.${item.icon}.body`)}`,
    )
    .join("\n");

  const body = `# ${brand.name}

> ${tHero("pitch")}

${tMeta("description")}

## Features

${features}

## Pages

- [Home](${base}/)
- [Pricing](${base}/pricing)
- [FAQ](${base}/faq)
- [Blog](${base}/blog)
- [Contact](${base}/contact)
- Legal: ${base}/privacy, ${base}/terms, ${base}/cookies
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
