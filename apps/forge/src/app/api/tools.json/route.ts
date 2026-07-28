import { getForgeRegistry } from "@/lib/registry";

/**
 * Machine-readable forge tool catalog (G17/G20, §6.7.5).
 *
 * Carries the axes an agent planner needs to pick and meter a call: demand
 * roots (verb), side-effect class, tier and meterId.
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
      roots: tool.roots ?? [],
      path: tool.path,
      invoke: { method: "POST", path: `/api/v1/tools/invoke/${tool.id}` },
      mcpName: tool.id.replace(/\//g, "__"),
      tier: tool.tier,
      sideEffect: tool.sideEffect,
      meterId: tool.meterId,
      engine: tool.engine,
    }));

  return Response.json(
    {
      version: 2,
      generatedAt: new Date().toISOString(),
      count: tools.length,
      openapi: "/api/openapi.json",
      mcp: "/api/mcp",
      tools,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
