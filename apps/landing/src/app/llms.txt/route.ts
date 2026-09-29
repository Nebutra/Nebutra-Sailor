import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin, getDocsUrl } from "@nebutra/brand/metadata-helpers";
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
  const docs = process.env.DOCS_ORIGIN_URL?.replace(/\/$/, "") ?? getDocsUrl();

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
- [Open Platform](${base}/open): Public API catalog and developer console index

## Sailor Studio for agents

A project's whole look is one preset object (base design language + knobs). Agents
set it; people review it in the browser; then it is pulled onto a project.

1. Read the contract: [preset schema](${base}/studio/preset.schema.json)
   (or \`nebutra studio schema\`, or the MCP tool \`studio_preset_schema\`).
2. Write a preset and get the review link: \`nebutra studio preview '<json>' --from claude-code --json\`
   (MCP: \`studio_preview\`). Ask the person to open the link; Studio shows it as
   proposed by their agent.
3. Once approved: \`nebutra studio pull <code>\` in a Sailor project (MCP: \`studio_pull\`),
   or \`npx create-sailor@latest my-app --preset <code>\` for a new one.

- [Sailor Studio](${base}/sailor/studio): the review surface

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
