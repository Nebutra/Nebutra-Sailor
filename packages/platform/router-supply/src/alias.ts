import type { ModelAliasEntry } from "@nebutra/prepaid-wallet";
import {
  DEFAULT_PUBLIC_MODEL as FRONTIER_DEFAULT_PUBLIC,
  ROUTER_PUBLIC_MODEL_IDS,
} from "./frontier-defaults";

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
 * Lab defaults — public ids from `./frontier-defaults` (snapshot of frontier SSOT).
 * Prefer updating packages/ai/ai-providers/src/frontier.ts first, then sync the snapshot.
 */
function buildDefaultAliases(): ModelAliasEntry[] {
  const entries: ModelAliasEntry[] = [];
  for (const bare of ROUTER_PUBLIC_MODEL_IDS) {
    entries.push({
      publicModel: bare,
      engineId: "newapi",
      upstreamModel: bare,
      priority: 10,
    });
    // Sonnet-class gets Sub2API secondary path when present
    if (bare.includes("claude-sonnet")) {
      entries.push({
        publicModel: bare,
        engineId: "sub2api",
        upstreamModel: bare,
        priority: 20,
      });
    }
  }
  entries.push({
    publicModel: "*",
    engineId: "newapi",
    upstreamModel: "*",
    priority: 1000,
  });
  return entries;
}

export const DEFAULT_ALIASES: readonly ModelAliasEntry[] = buildDefaultAliases();

/** Default public model — re-export of frontier SSOT. */
export const DEFAULT_PUBLIC_MODEL: string = FRONTIER_DEFAULT_PUBLIC;
