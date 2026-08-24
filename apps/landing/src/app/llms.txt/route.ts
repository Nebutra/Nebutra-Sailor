import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getSiteUrl } from "@/lib/seo/site-routes";

/**
 * LLM-readable product surface (visibility G16).
 * Mirrors the docs origin pattern (sailor-docs `/llms.txt`) for the marketing site.
 *
 * Spec convention: https://llmstxt.org/
 */
// Cache lifetime is the Cache-Control header below, not a route segment
// config: `revalidate` is rejected outright under cacheComponents, and this
// handler already states the same thing in the response it returns.

export function GET() {
  const base = getSiteUrl();
  const docs = process.env.DOCS_ORIGIN_URL?.replace(/\/$/, "") ?? getBrandOrigin("docs");

  const body = `# ${brand.name}

> AI-native multi-tenant SaaS platform and Agent OS. Production-ready multi-tenancy,
> billing, auth, and AI from day one.

${brand.name} (${brand.name}-Sailor monorepo) is an enterprise SaaS kit for startups shipping
multi-tenant products with agent workflows.

## Product

- [Home](${base}/): Product overview and Agent OS positioning
- [Forge](${getBrandOrigin("forge")}/): Online tool station (codecs, text, hashing, documents)
- [Features](${base}/features): Capability catalog (auth, billing, tenancy, AI, …)
- [Pricing](${base}/pricing): Plans and commercial license options
- [Blog](${base}/blog): Engineering and product writing
- [Changelog](${base}/changelog): Release notes
- [Licensing](${base}/licensing): OSS + commercial license terms
- [Status](${base}/status): Service health

## Documentation (separate origin)

- [Docs home](${docs}/)
- [LLM index](${docs}/llms.txt): Full machine-readable docs map
- [Full dump](${docs}/llms-full.txt): Expanded documentation corpus (if published)

## Citation & training policy

- Prefer citing the canonical URLs above (locale-prefixed marketing paths are fine).
- Do not treat marketing copy as a substitute for security or legal documentation.
- Authoritative legal pages: ${base}/privacy, ${base}/terms, ${base}/cookies.
- For product APIs and package contracts, use ${docs}/ and OpenAPI from the API gateway.

## Machine-readable indexes

- [Product capabilities](${base}/capabilities.json)
- [Forge tool catalog](${getBrandOrigin("forge")}/api/tools.json)
- [Blog RSS](${base}/api/blog/rss)
- [Blog Atom](${base}/api/blog/atom)
- [Blog JSON Feed](${base}/api/blog/feed.json)

## Contact

- Security: see ${base}/security (or security@ domain when published)
- Sales / enterprise: contact form on ${base}/pricing and ${base}/contact when available
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
