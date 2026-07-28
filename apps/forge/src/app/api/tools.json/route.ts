import { getForgeRegistry } from "@/lib/registry";

/**
 * Machine-readable forge tool catalog (G17/G20).
 */
export function GET() {
  const tools = getForgeRegistry()
    .list()
    .map((tool) => ({
      id: tool.id,
      slug: tool.slug,
      name: tool.title,
      description: tool.description,
      category: tool.category,
      path: tool.path,
      tier: tool.tier,
    }));

  return Response.json(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      count: tools.length,
      tools,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
