import type { ForgeRegistry } from "./registry";
import type { ToolPageModel } from "./types";

/**
 * Human tool-station page model — feed this into Next.js/React templates.
 * Keeps IA data free of framework imports.
 */
export function buildToolPageModel(
  registry: ForgeRegistry,
  idOrSlug: string,
  options?: { readonly baseUrl?: string },
): ToolPageModel {
  const tool = registry.get(idOrSlug);
  const baseUrl = options?.baseUrl ?? "https://forge.nebutra.com";
  const path = `/t/${tool.slug}`;
  const apiPath = `/v1/tools/${tool.id}/invoke`;

  const related = registry
    .listByCategory(tool.category)
    .filter((t) => t.id !== tool.id)
    .slice(0, 6);

  const exampleBody = JSON.stringify({ example: true }, null, 2);

  return {
    id: tool.id,
    slug: tool.slug,
    category: tool.category,
    path,
    title: tool.title,
    description: tool.description,
    tier: tool.tier,
    engine: tool.engine,
    meterId: tool.meterId,
    sideEffect: tool.sideEffect,
    sotaStatus: tool.sotaStatus ?? "scaffold",
    seo: {
      title: {
        zh: `${tool.title.zh} - 在线工具 | Nebutra Forge`,
        en: `${tool.title.en} Online | Nebutra Forge`,
      },
      keywords: tool.seoKeywords,
    },
    api: {
      method: "POST",
      path: apiPath,
      exampleCurl: [
        `curl -X POST '${baseUrl}${apiPath}' \\`,
        `  -H 'Authorization: Bearer sk-sailor-…' \\`,
        `  -H 'Content-Type: application/json' \\`,
        `  -d '${exampleBody.replace(/'/g, "'\\''")}'`,
      ].join("\n"),
    },
    related,
  };
}

/** Category hub listing for tool-station home / category pages. */
export function buildCategoryHub(registry: ForgeRegistry): {
  readonly categories: readonly {
    readonly id: string;
    readonly tools: ReturnType<ForgeRegistry["list"]>;
  }[];
  readonly tools: ReturnType<ForgeRegistry["list"]>;
} {
  const tools = registry.list();
  const categories = registry.categories().map((id) => ({
    id,
    tools: registry.listByCategory(id),
  }));
  return { categories, tools };
}
