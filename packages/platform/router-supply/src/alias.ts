import type { ModelAliasEntry } from "@nebutra/prepaid-wallet";

export interface AliasTable {
  readonly entries: readonly ModelAliasEntry[];
}

export function parseAliasTableJson(raw: string | undefined): AliasTable {
  if (!raw?.trim()) {
    return { entries: DEFAULT_ALIASES };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { entries: DEFAULT_ALIASES };
    const entries: ModelAliasEntry[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      if (
        typeof r.publicModel === "string" &&
        typeof r.engineId === "string" &&
        typeof r.upstreamModel === "string"
      ) {
        entries.push({
          publicModel: r.publicModel,
          engineId: r.engineId,
          upstreamModel: r.upstreamModel,
          priority: typeof r.priority === "number" ? r.priority : 100,
        });
      }
    }
    return { entries: entries.length > 0 ? entries : DEFAULT_ALIASES };
  } catch {
    return { entries: DEFAULT_ALIASES };
  }
}

/** Resolve public model → ordered alias rows (lower priority first). */
export function resolveAliases(table: AliasTable, publicModel: string): ModelAliasEntry[] {
  return table.entries
    .filter((e) => e.publicModel === publicModel || e.publicModel === "*")
    .sort((a, b) => a.priority - b.priority);
}

export function listPublicModels(table: AliasTable): string[] {
  const set = new Set(table.entries.filter((e) => e.publicModel !== "*").map((e) => e.publicModel));
  return [...set].sort();
}

/**
 * Lab defaults — public ids aligned with models.dev / OpenRouter frontier
 * (see @nebutra/ai-providers FRONTIER_FALLBACK). Do not list retired lines
 * (gpt-3.5, gpt-4, gpt-4o) as the customer-facing catalog defaults.
 */
export const DEFAULT_ALIASES: readonly ModelAliasEntry[] = [
  {
    publicModel: "gpt-5.4-mini",
    engineId: "newapi",
    upstreamModel: "gpt-5.4-mini",
    priority: 10,
  },
  {
    publicModel: "gpt-5.5",
    engineId: "newapi",
    upstreamModel: "gpt-5.5",
    priority: 10,
  },
  {
    publicModel: "claude-sonnet-4.6",
    engineId: "newapi",
    upstreamModel: "claude-sonnet-4.6",
    priority: 10,
  },
  {
    publicModel: "claude-sonnet-4.6",
    engineId: "sub2api",
    upstreamModel: "claude-sonnet-4.6",
    priority: 20,
  },
  {
    publicModel: "claude-haiku-4.5",
    engineId: "newapi",
    upstreamModel: "claude-haiku-4.5",
    priority: 10,
  },
  {
    publicModel: "gemini-3.5-flash",
    engineId: "newapi",
    upstreamModel: "gemini-3.5-flash",
    priority: 10,
  },
  {
    publicModel: "*",
    engineId: "newapi",
    upstreamModel: "*",
    priority: 1000,
  },
];

/** Default public model for demos / docs when the client omits `model`. */
export const DEFAULT_PUBLIC_MODEL = "gpt-5.4-mini";
