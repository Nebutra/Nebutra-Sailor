import type { ForgeRegistry } from "./registry";
import { resolveToolRoots } from "./roots-defaults";
import type { ForgeToolSummary, LocalizedString, ToolPageModel } from "./types";

/** Canonical demand roots for hub IA (docs §6.7 S-tier first). */
export const DEMAND_ROOTS = [
  "generator",
  "converter",
  "formatter",
  "calculator",
  "checker",
  "optimizer",
  "viewer",
  "extractor",
  "analyzer",
  "comparator",
  "simulator",
  "verifier",
  "editor",
] as const;

export type DemandRoot = (typeof DEMAND_ROOTS)[number];

const ROOT_COPY: Record<string, LocalizedString> = {
  generator: { zh: "生成器", en: "Generators" },
  converter: { zh: "转换器", en: "Converters" },
  formatter: { zh: "格式化", en: "Formatters" },
  calculator: { zh: "计算器", en: "Calculators" },
  checker: { zh: "校验器", en: "Checkers" },
  optimizer: { zh: "优化器", en: "Optimizers" },
  viewer: { zh: "查看器", en: "Viewers" },
  extractor: { zh: "提取器", en: "Extractors" },
  analyzer: { zh: "分析器", en: "Analyzers" },
  comparator: { zh: "对比器", en: "Comparators" },
  simulator: { zh: "模拟器", en: "Simulators" },
  verifier: { zh: "验证器", en: "Verifiers" },
  editor: { zh: "编辑器", en: "Editors" },
};

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

  const roots = resolveToolRoots(tool);
  const byRoot = registry
    .list()
    .filter((t) => t.id !== tool.id && (t.roots ?? []).some((r) => roots.includes(r)));
  const byCategory = registry.listByCategory(tool.category).filter((t) => t.id !== tool.id);
  const relatedMap = new Map<string, ForgeToolSummary>();
  for (const t of [...byRoot, ...byCategory]) relatedMap.set(t.id, t);
  const related = [...relatedMap.values()].slice(0, 8);

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

/** Demand-root hub (`/r/{root}`) for SEO + agent discovery. */
export function buildRootHub(
  registry: ForgeRegistry,
  root: string,
): {
  readonly root: string;
  readonly title: LocalizedString;
  readonly description: LocalizedString;
  readonly tools: readonly ForgeToolSummary[];
  readonly path: string;
} {
  const key = root.trim().toLowerCase();
  const tools = registry
    .list()
    .filter((t) => (t.roots ?? []).includes(key))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const title = ROOT_COPY[key] ?? {
    zh: key,
    en: key.charAt(0).toUpperCase() + key.slice(1),
  };
  return {
    root: key,
    title,
    description: {
      zh: `${title.zh}类在线工具 — 人类页面与 Agent API 同一实现`,
      en: `${title.en} online tools — same implementation for humans and agents`,
    },
    tools,
    path: `/r/${key}`,
  };
}
