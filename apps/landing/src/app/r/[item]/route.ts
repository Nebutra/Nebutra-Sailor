import { getSiteUrl } from "@/lib/seo/site-routes";
import { registryIndex, registryItem } from "@/nebutra/studio/catalog-registry";

/**
 * The @nebutra/ui registry: `/r/registry.json` and `/r/<demo>.json`
 * (ADR 2026-09-27 UI catalog). Paths carry a dot, so the locale proxy leaves
 * them alone. The content changes only with a deploy.
 */
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(_request: Request, { params }: { params: Promise<{ item: string }> }) {
  const { item } = await params;
  if (!item.endsWith(".json")) return new Response("Not found", { status: 404 });
  const name = item.slice(0, -".json".length);
  const body = name === "registry" ? registryIndex(getSiteUrl()) : registryItem(name);
  if (!body) return new Response("Not found", { status: 404 });
  return Response.json(body, {
    headers: { "Cache-Control": CACHE, "Access-Control-Allow-Origin": "*" },
  });
}
