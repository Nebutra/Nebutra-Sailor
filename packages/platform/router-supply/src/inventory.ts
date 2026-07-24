/**
 * Supply inventory — models the relay can actually sell / route (302-style).
 *
 * Sources (union, first success path keeps accumulating):
 * 1. New-API / Sub2API / official engines from loadEnginesFromEnv() → GET …/models
 * 2. Optional OpenRouter public list (lab default when no sidecar)
 *
 * Matching uses both full id (`openai/gpt-5.6-sol`) and bare id (`gpt-5.6-sol`).
 */

import { loadEnginesFromEnv, type ResolvedEngine } from "./engines";

export interface SupplyInventory {
  /** All known ids + bare forms for matching */
  readonly ids: ReadonlySet<string>;
  /** Engine / source labels that contributed */
  readonly sources: readonly string[];
  /** true when at least one upstream returned models */
  readonly ok: boolean;
  readonly fetchedAt: number;
  readonly note: string;
}

const TTL_MS = (() => {
  const n = Number.parseInt(process.env.ROUTER_INVENTORY_TTL_MS ?? "300000", 10); // 5m
  return Number.isFinite(n) && n > 0 ? n : 300_000;
})();

let cache: SupplyInventory | null = null;
let inflight: Promise<SupplyInventory> | null = null;

function stripTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url.charCodeAt(end - 1) === 47 /* / */) end -= 1;
  return end === url.length ? url : url.slice(0, end);
}

/** Build OpenAI-compatible models URL from engine base. */
export function modelsListUrl(baseUrl: string): string {
  const base = stripTrailingSlash(baseUrl);
  if (base.endsWith("/v1")) return `${base}/models`;
  if (base.endsWith("/models")) return base;
  return `${base}/v1/models`;
}

export function bareModelId(id: string): string {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

function addId(set: Set<string>, id: string) {
  if (!id || typeof id !== "string") return;
  const t = id.trim();
  if (!t) return;
  set.add(t);
  set.add(bareModelId(t));
  // normalize separators for fuzzy match (claude-sonnet-5 ↔ claude-sonnet-5)
  const norm = bareModelId(t).toLowerCase().replace(/[._]/g, "-");
  set.add(norm);
}

async function fetchModelsFromUrl(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<string[]> {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: Array<{ id?: string }>;
    models?: Array<{ id?: string }>;
  };
  const rows = json.data ?? json.models ?? [];
  return rows
    .map((m) => m.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function loadEngineInventory(engine: ResolvedEngine): Promise<string[]> {
  const url = modelsListUrl(engine.baseUrl);
  return fetchModelsFromUrl(
    url,
    {
      Authorization: `Bearer ${engine.apiKey}`,
      "Content-Type": "application/json",
    },
    8_000,
  );
}

/**
 * OpenRouter public model list — used as lab inventory when New-API is down
 * (same role as 302's sellable SKU list from their gateway).
 */
async function loadOpenRouterInventory(): Promise<string[]> {
  const url = process.env.OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = process.env.OPENROUTER_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  return fetchModelsFromUrl(url, headers, 12_000);
}

function emptyInventory(note: string): SupplyInventory {
  return {
    ids: new Set(),
    sources: [],
    ok: false,
    fetchedAt: Date.now(),
    note,
  };
}

/**
 * Fetch (or cache) the union of routable model ids from supply engines.
 */
export async function getSupplyInventory(options?: { force?: boolean }): Promise<SupplyInventory> {
  const now = Date.now();
  if (!options?.force && cache && now - cache.fetchedAt < TTL_MS) {
    return cache;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const ids = new Set<string>();
    const sources: string[] = [];
    const engines = loadEnginesFromEnv();

    await Promise.all(
      engines.map(async (eng) => {
        try {
          const list = await loadEngineInventory(eng);
          if (list.length === 0) return;
          for (const id of list) addId(ids, id);
          sources.push(`${eng.id}(${list.length})`);
        } catch {
          /* engine offline — skip */
        }
      }),
    );

    // Lab / 302-like: if no sidecar inventory, pull OpenRouter public list
    // unless explicitly disabled.
    const useOr =
      process.env.ROUTER_USE_OPENROUTER_INVENTORY !== "0" &&
      (ids.size === 0 || process.env.ROUTER_USE_OPENROUTER_INVENTORY === "1");

    if (useOr) {
      try {
        const list = await loadOpenRouterInventory();
        if (list.length > 0) {
          for (const id of list) addId(ids, id);
          sources.push(`openrouter(${list.length})`);
        }
      } catch {
        /* ignore */
      }
    }

    const inv: SupplyInventory =
      ids.size === 0
        ? emptyInventory("无可用供给库存（侧车 / OpenRouter 均未返回模型）")
        : {
            ids,
            sources,
            ok: true,
            fetchedAt: Date.now(),
            note: `供给库存 · ${sources.join(" · ")}`,
          };

    cache = inv;
    return inv;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Whether a public model id is present in inventory (bare / full / normalized). */
export function inventoryHas(inv: SupplyInventory, publicModel: string): boolean {
  if (!inv.ok || inv.ids.size === 0) return false;
  if (inv.ids.has(publicModel)) return true;
  const bare = bareModelId(publicModel);
  if (inv.ids.has(bare)) return true;
  const norm = bare.toLowerCase().replace(/[._]/g, "-");
  if (inv.ids.has(norm)) return true;
  // inventory may only have openai/gpt-5.6-sol — bare already added on ingest
  return false;
}
