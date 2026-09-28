import { brand } from "@nebutra/brand/metadata";
import { say } from "@/components/starter/starter-copy";
import { SITE } from "@/content/site";
import { getSiteUrl } from "@/lib/seo/site-routes";

/**
 * LLM-readable summary of the site (https://llmstxt.org/), from the words in
 * src/content/site.ts.
 */
export function GET() {
  const base = getSiteUrl();
  const features = SITE.features.items
    .map((item) => `- ${say(item.title, "en")}: ${say(item.body, "en")}`)
    .join("\n");

  const body = `# ${brand.name}

> ${say(SITE.hero.pitch, "en")}

${say(SITE.meta.description, "en")}

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
