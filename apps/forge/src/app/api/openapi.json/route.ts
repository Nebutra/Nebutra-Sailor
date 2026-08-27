import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { buildForgeOpenApi } from "@nebutra/forge-runtime";
import { getForgeRegistry } from "@/lib/registry";

/**
 * OpenAPI 3.1 invoke contract — the machine half of the dual surface (§6.7.5).
 * One operation per tool, request bodies derived from each tool's Zod schema.
 */
export function GET() {
  const serverUrl = process.env.NEXT_PUBLIC_FORGE_URL ?? getBrandOrigin("forge");
  const doc = buildForgeOpenApi(getForgeRegistry(), { serverUrl });

  return Response.json(doc, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
