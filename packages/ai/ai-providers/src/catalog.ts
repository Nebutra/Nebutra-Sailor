/**
 * Model catalog — the single source of model/provider FACTS.
 *
 * Data comes from the upstream community catalog https://models.dev (via
 * `@tokenlens/fetch`), so model ids, providers, pricing, context windows and
 * capabilities are NOT hand-maintained here. Replaces the scattered hardcoded
 * lists (BYOK provider regex, the /models endpoint, seed fallbacks).
 *
 * Delivery: runtime fetch + in-memory TTL cache. The first call fetches; later
 * calls serve from cache until `MODEL_CATALOG_TTL_MS` (default 6h) elapses. On
 * fetch failure the last good catalog is reused, so a models.dev outage degrades
 * to "slightly stale" rather than "down". Accessors are async by design.
 */

import type { ProviderModel, ProvidersCatalog } from "@tokenlens/core";
import { fetchModels } from "@tokenlens/fetch";

/** Our coarse provider buckets — one BYOK key + base URL per bucket. */
export type AIProviderId = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

/**
 * Map models.dev provider IDs → our AIProvider buckets. Canonical home (the DB
 * seed imports this, instead of keeping a parallel copy). Unknown → CUSTOM.
 */
export const PROVIDER_MAP: Record<string, AIProviderId> = {
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  google: "GOOGLE",
  "google-vertex": "GOOGLE",
  "google-vertex-anthropic": "ANTHROPIC",
  "amazon-bedrock": "ANTHROPIC", // most bedrock usage is claude
  siliconflow: "SILICONFLOW",
  deepseek: "SILICONFLOW", // deepseek is siliconflow-compatible
  alibaba: "SILICONFLOW",
  qwen: "SILICONFLOW",
  moonshot: "SILICONFLOW",
  zhipu: "SILICONFLOW",
};

export function mapProvider(modelsDevProviderId: string): AIProviderId {
  return PROVIDER_MAP[modelsDevProviderId] ?? "CUSTOM";
}

/** Normalized, provider-agnostic model facts surfaced to the rest of the app. */
export interface ModelInfo {
  id: string;
  name: string;
  /** Our coarse bucket (for BYOK key selection / base URL). */
  provider: AIProviderId;
  /** The raw models.dev provider id (e.g. "google-vertex"). */
  rawProvider: string;
  contextWindow?: number;
  maxOutput?: number;
  pricing?: { inputPerMTok?: number; outputPerMTok?: number };
  capabilities: { reasoning: boolean; toolCall: boolean; vision: boolean };
}

function toModelInfo(rawProvider: string, model: ProviderModel): ModelInfo {
  const visionIn = model.modalities?.input?.includes("image") ?? false;
  return {
    id: model.id,
    name: model.name ?? model.id,
    provider: mapProvider(rawProvider),
    rawProvider,
    contextWindow: model.limit?.context,
    maxOutput: model.limit?.output,
    pricing: {
      inputPerMTok: model.cost?.input,
      outputPerMTok: model.cost?.output,
    },
    capabilities: {
      reasoning: model.reasoning ?? false,
      toolCall: model.tool_call ?? false,
      vision: visionIn,
    },
  };
}

// ─── Runtime cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  index: Map<string, ModelInfo>;
  fetchedAt: number;
}

const TTL_MS = (() => {
  const n = Number.parseInt(process.env.MODEL_CATALOG_TTL_MS ?? "21600000", 10); // 6h
  return Number.isFinite(n) && n > 0 ? n : 21_600_000;
})();

let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

function buildIndex(catalog: ProvidersCatalog): Map<string, ModelInfo> {
  const index = new Map<string, ModelInfo>();
  for (const [providerId, providerInfo] of Object.entries(catalog)) {
    for (const model of Object.values(providerInfo.models)) {
      // First writer wins; model ids are unique within models.dev.
      if (!index.has(model.id)) index.set(model.id, toModelInfo(providerId, model));
    }
  }
  return index;
}

async function loadIndex(): Promise<Map<string, ModelInfo>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache.index;
  if (inflight) return (await inflight).index;

  inflight = (async () => {
    try {
      const catalog = await fetchModels();
      cache = { index: buildIndex(catalog), fetchedAt: Date.now() };
      return cache;
    } catch {
      // models.dev unreachable — reuse the last good catalog if we have one,
      // otherwise an empty index (callers degrade safely, e.g. BYOK → platform).
      if (cache) return cache;
      cache = { index: new Map(), fetchedAt: Date.now() };
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return (await inflight).index;
}

// ─── Public accessors ─────────────────────────────────────────────────────────

/** Full model list (newest fetch, cached). */
export async function listModels(): Promise<ModelInfo[]> {
  return [...(await loadIndex()).values()];
}

/** Look up a single model by id. `null` if unknown to the catalog. */
export async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  return (await loadIndex()).get(modelId) ?? null;
}

/**
 * Resolve the coarse provider bucket for a model id. Catalog-first; falls back
 * to id-prefix heuristics for brand-new models models.dev hasn't indexed yet.
 * `null` means "unknown" → callers should use the platform default.
 */
export async function providerForModel(modelId: string): Promise<AIProviderId | null> {
  const info = await getModelInfo(modelId);
  if (info) return info.provider;
  return providerFromIdHeuristic(modelId);
}

/** Last-resort id-prefix heuristic (only used when the catalog misses). */
export function providerFromIdHeuristic(modelId: string): AIProviderId | null {
  const m = modelId.toLowerCase().replace(/^[^/]+\//, ""); // strip "anthropic/" style prefix
  if (/^(gpt-|o1|o3|o4|chatgpt|text-|davinci|babbage)/.test(m)) return "OPENAI";
  if (m.startsWith("claude")) return "ANTHROPIC";
  if (m.startsWith("gemini")) return "GOOGLE";
  if (/deepseek|qwen|glm|yi-|internlm|siliconflow|moonshot|kimi/.test(m)) return "SILICONFLOW";
  return null;
}

/**
 * Default OpenAI-compatible base URL per provider bucket (env-overridable).
 * Single home for these — BYOK and any other caller import from here.
 */
export function providerBaseUrl(provider: AIProviderId): string | null {
  switch (provider) {
    case "OPENAI":
      return process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    case "ANTHROPIC":
      return process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
    case "GOOGLE":
      return (
        process.env.GOOGLE_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai"
      );
    case "SILICONFLOW":
      return process.env.SILICONFLOW_BASE_URL ?? "https://api.siliconflow.cn/v1";
    default:
      // CUSTOM has no canonical endpoint — the caller must supply a baseUrl.
      return null;
  }
}
