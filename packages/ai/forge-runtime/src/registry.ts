import { resolveToolCompose } from "./compose-edges";
import { ForgeRuntimeError } from "./errors";
import { resolveToolRoots } from "./roots-defaults";
import { F0_BATCH1_TOOLS } from "./tools/index";
import type { AnyForgeToolDefinition, ForgeToolSummary } from "./types";

function withResolvedMeta(tool: AnyForgeToolDefinition): AnyForgeToolDefinition {
  const roots = resolveToolRoots(tool);
  const compose = resolveToolCompose(tool.id, tool.compose);
  const rootsSame = tool.roots === roots;
  const composeSame =
    (tool.compose === undefined && compose === undefined) ||
    (tool.compose?.next === compose?.next && tool.compose?.prev === compose?.prev);
  if (rootsSame && composeSame) return tool;
  return {
    ...tool,
    roots,
    ...(compose ? { compose } : {}),
  };
}

function toSummary(tool: AnyForgeToolDefinition): ForgeToolSummary {
  const roots = resolveToolRoots(tool);
  const compose = resolveToolCompose(tool.id, tool.compose);
  return {
    id: tool.id,
    slug: tool.slug,
    category: tool.category,
    title: tool.title,
    description: tool.description,
    tier: tool.tier,
    sideEffect: tool.sideEffect,
    meterId: tool.meterId,
    engine: tool.engine,
    path: `/t/${tool.slug}`,
    roots,
    ...(tool.batch ? { batch: tool.batch } : {}),
    ...(compose ? { compose } : {}),
  };
}

export class ForgeRegistry {
  private readonly byId = new Map<string, AnyForgeToolDefinition>();
  private readonly bySlug = new Map<string, AnyForgeToolDefinition>();

  constructor(tools: readonly AnyForgeToolDefinition[] = F0_BATCH1_TOOLS) {
    for (const raw of tools) {
      const tool = withResolvedMeta(raw);
      if (this.byId.has(tool.id)) {
        throw new ForgeRuntimeError("execution_failed", `Duplicate tool id: ${tool.id}`);
      }
      if (this.bySlug.has(tool.slug)) {
        throw new ForgeRuntimeError("execution_failed", `Duplicate tool slug: ${tool.slug}`);
      }
      this.byId.set(tool.id, tool);
      this.bySlug.set(tool.slug, tool);
    }
  }

  static openDefault(): ForgeRegistry {
    return new ForgeRegistry(F0_BATCH1_TOOLS);
  }

  list(): ForgeToolSummary[] {
    return [...this.byId.values()].map(toSummary).sort((a, b) => a.id.localeCompare(b.id));
  }

  listByCategory(category: string): ForgeToolSummary[] {
    return this.list().filter((t) => t.category === category);
  }

  categories(): string[] {
    return [...new Set(this.list().map((t) => t.category))].sort();
  }

  get(idOrSlug: string): AnyForgeToolDefinition {
    const tool = this.byId.get(idOrSlug) ?? this.bySlug.get(idOrSlug);
    if (!tool) {
      throw new ForgeRuntimeError("tool_not_found", `Unknown tool: ${idOrSlug}`);
    }
    return tool;
  }

  has(idOrSlug: string): boolean {
    return this.byId.has(idOrSlug) || this.bySlug.has(idOrSlug);
  }

  search(query: string): ForgeToolSummary[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter((t) => {
      const hay = [
        t.id,
        t.slug,
        t.category,
        t.title.zh,
        t.title.en,
        t.description.zh,
        t.description.en,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
}
