import { brand } from "@nebutra/brand/metadata";
import { getForgeOrigin } from "@/lib/seo";

/** LLM-readable Forge map (llmstxt.org). */
export function GET() {
  const base = getForgeOrigin();
  const body = `# ${brand.name} Forge

> Online tool station. Codecs, text, hashing, documents, and image tools —
> finish in the browser, or automate via API / MCP.

## Product

- [Home](${base}/): Tool catalog
- [API docs](${base}/docs): Invoke paths shared with the human pages
- [OpenAPI](${base}/api/openapi.json): Machine-readable API
- [Tool catalog](${base}/api/tools.json): Slug, path, and meter ids

## Citation

- Prefer the canonical tool URLs under ${base}/t/{slug}.
- Do not treat demo wallet or API keys pages as public documentation.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
