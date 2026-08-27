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
import { FRONTIER_FALLBACK as GENERATED_FALLBACK } from "./frontier-fallback.generated";

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
  "siliconflow-cn": "SILICONFLOW", // SiliconFlow ecosystem (GLM / Qwen / DeepSeek / MiniMax / …)
  deepseek: "SILICONFLOW", // deepseek is siliconflow-compatible
  alibaba: "SILICONFLOW",
  "alibaba-token-plan": "SILICONFLOW",
  qwen: "SILICONFLOW",
  moonshot: "SILICONFLOW",
  zhipu: "SILICONFLOW",
  minimax: "SILICONFLOW",
};

export function mapProvider(modelsDevProviderId: string): AIProviderId {
  return PROVIDER_MAP[modelsDevProviderId] ?? "CUSTOM";
}

/**
 * Output modality — the primary dimension for canvas orchestration ("give me a
 * video model", "an image model", …). Derived from models.dev `modalities.output`.
 */
export type ModelModality = "text" | "image" | "video" | "audio" | "embedding";

/** Classify a model by what it PRODUCES (not what it consumes). */
function classifyModality(model: ProviderModel): ModelModality {
  const out = model.modalities?.output ?? [];
  if (out.includes("video")) return "video";
  if (out.includes("image")) return "image";
  if (out.includes("audio")) return "audio";
  if (/embedding/i.test(model.id) || out.includes("embedding")) return "embedding";
  return "text";
}

/** Normalized, provider-agnostic model facts surfaced to the rest of the app. */
export interface ModelInfo {
  id: string;
  name: string;
  /** Our coarse bucket (for BYOK key selection / base URL). */
  provider: AIProviderId;
  /** The raw models.dev provider id (e.g. "google-vertex"). */
  rawProvider: string;
  /** What the model produces — the canvas-orchestration grouping key. */
  modality: ModelModality;
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
    modality: classifyModality(model),
    ...(model.limit?.context !== undefined ? { contextWindow: model.limit.context } : {}),
    ...(model.limit?.output !== undefined ? { maxOutput: model.limit.output } : {}),
    pricing: {
      ...(model.cost?.input !== undefined ? { inputPerMTok: model.cost.input } : {}),
      ...(model.cost?.output !== undefined ? { outputPerMTok: model.cost.output } : {}),
    },
    capabilities: {
      reasoning: model.reasoning ?? false,
      toolCall: model.tool_call ?? false,
      vision: visionIn,
    },
  };
}

// ─── Deduped, modality-grouped view (for canvas orchestration) ─────────────────
//
// models.dev lists the SAME logical model under dozens of aggregator providers
// (e.g. minimax-m2.5 appears under 47). The canvas needs ONE entry per logical
// model with the list of providers that can serve it (so it can pick a routable
// id + compare cost). `dedupKey` collapses the bare name across aggregators.

/** A single provider's offering of a logical model. */
export interface ModelOffering {
  /** Routable model id as listed by models.dev (aggregator-prefixed). */
  id: string;
  rawProvider: string;
  bucket: AIProviderId;
  pricing?: { inputPerMTok?: number; outputPerMTok?: number };
  contextWindow?: number;
}

/** One deduped logical model, with all the providers that serve it. */
export interface CatalogModel {
  key: string;
  name: string;
  modality: ModelModality;
  capabilities: { reasoning: boolean; toolCall: boolean; vision: boolean };
  /** Distinct provider buckets that serve it (for BYOK key selection). */
  buckets: AIProviderId[];
  offerings: ModelOffering[];
}

/** Collapse a model id to a logical key (drop aggregator path + separators). */
function dedupKey(modelId: string): string {
  return modelId
    .toLowerCase()
    .replace(/^.*\//, "") // keep only the final path segment
    .replace(/[._:\-\s]/g, "");
}

// ─── Runtime cache ────────────────────────────────────────────────────────────

interface CacheEntry {
  /** Per-id view (exact lookups: providerForModel, getModelInfo, resolveFrontier). */
  index: Map<string, ModelInfo>;
  /** Deduped logical view (canvas orchestration: listModelsByModality). */
  logical: CatalogModel[];
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

function buildLogical(catalog: ProvidersCatalog): CatalogModel[] {
  const byKey = new Map<string, CatalogModel>();
  for (const [providerId, providerInfo] of Object.entries(catalog)) {
    for (const model of Object.values(providerInfo.models)) {
      const key = dedupKey(model.id);
      if (!key) continue;
      const bucket = mapProvider(providerId);
      const offering: ModelOffering = {
        id: model.id,
        rawProvider: providerId,
        bucket,
        pricing: {
          ...(model.cost?.input !== undefined ? { inputPerMTok: model.cost.input } : {}),
          ...(model.cost?.output !== undefined ? { outputPerMTok: model.cost.output } : {}),
        },
        ...(model.limit?.context !== undefined ? { contextWindow: model.limit.context } : {}),
      };
      const existing = byKey.get(key);
      if (existing) {
        existing.offerings.push(offering);
        if (!existing.buckets.includes(bucket)) existing.buckets.push(bucket);
        // Capabilities are the union across offerings.
        existing.capabilities.reasoning ||= model.reasoning ?? false;
        existing.capabilities.toolCall ||= model.tool_call ?? false;
        existing.capabilities.vision ||= model.modalities?.input?.includes("image") ?? false;
      } else {
        byKey.set(key, {
          key,
          name: model.name ?? model.id,
          modality: classifyModality(model),
          capabilities: {
            reasoning: model.reasoning ?? false,
            toolCall: model.tool_call ?? false,
            vision: model.modalities?.input?.includes("image") ?? false,
          },
          buckets: [bucket],
          offerings: [offering],
        });
      }
    }
  }
  return [...byKey.values()];
}

async function loadCache(): Promise<CacheEntry> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const catalog = await fetchModels();
      cache = { index: buildIndex(catalog), logical: buildLogical(catalog), fetchedAt: Date.now() };
      return cache;
    } catch {
      // models.dev unreachable — reuse the last good catalog if we have one,
      // otherwise empty (callers degrade safely, e.g. BYOK → platform).
      if (cache) return cache;
      cache = { index: new Map(), logical: [], fetchedAt: Date.now() };
      return cache;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

async function loadIndex(): Promise<Map<string, ModelInfo>> {
  return (await loadCache()).index;
}

// ─── Public accessors ─────────────────────────────────────────────────────────

/** Full model list (newest fetch, cached). */
export async function listModels(): Promise<ModelInfo[]> {
  return [...(await loadIndex()).values()];
}

/**
 * Deduped logical models for a given output modality — the canvas-orchestration
 * entry point. One entry per logical model, with the providers that serve it.
 * Sorted by offering count (most widely available first).
 */
export async function listModelsByModality(modality: ModelModality): Promise<CatalogModel[]> {
  const { logical } = await loadCache();
  return logical
    .filter((m) => m.modality === modality)
    .sort((a, b) => b.offerings.length - a.offerings.length);
}

/** Count of deduped logical models per modality (for canvas tab badges, etc.). */
export async function listModalities(): Promise<Record<ModelModality, number>> {
  const { logical } = await loadCache();
  const counts: Record<ModelModality, number> = {
    text: 0,
    image: 0,
    video: 0,
    audio: 0,
    embedding: 0,
  };
  for (const m of logical) counts[m.modality]++;
  return counts;
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

// ─── Frontier resolver (hybrid: live intersection + hardcoded fallback) ─────────
//
// Resolves a SEMANTIC tier (e.g. "the latest reasoning model") to a concrete
// model id, picking the newest from the INTERSECTION of:
//   - gateway-routable ids (OpenRouter /api/v1/models — the gateway namespace), and
//   - models.dev catalog metadata (so the pick has pricing/context/capabilities).
// On any failure (offline / empty) it returns the hardcoded fallback, so callers
// always get a usable id. This is the "don't hand-maintain model strings" engine.

export type ModelTier =
  | "reasoning"
  | "flagship"
  | "fast"
  | "openai-flagship"
  | "google-flagship"
  | "google-fast";

export interface TierRule {
  /** Match on the OpenRouter (gateway) id. */
  include: RegExp;
  /**
   * Drop variants that are not the interactive frontier model of the tier.
   *
   * `:batch` belongs in every one of these. OpenRouter lists a batch-only
   * endpoint alongside most frontier models; it satisfies the family pattern,
   * and routing a live stream at one fails. Before 2026-08 nothing excluded
   * it and only Set iteration order kept it from being selected.
   */
  exclude: RegExp;
}

/**
 * Tier matching rules. Exported so `scripts/generate-frontier-models.mjs` can be
 * checked against them — the generator has to select by the same rules the
 * runtime resolves by, or the offline fallback stops matching the online pick.
 */
export const TIER_RULES: Record<ModelTier, TierRule> = {
  reasoning: {
    include: /^anthropic\/claude-opus-/,
    exclude: /-(fast|mini|nano|image|codex)|:batch/,
  },
  flagship: {
    include: /^anthropic\/claude-sonnet-/,
    exclude: /-(fast|mini|nano|image|codex)|:batch/,
  },
  fast: {
    include: /^anthropic\/claude-haiku-/,
    exclude: /-(image|codex)|:batch/,
  },
  "openai-flagship": {
    include: /^openai\/gpt-5/,
    // Prefer full flagship over mini/nano/chat/image/codex variants
    exclude: /-(pro|mini|nano|codex|image|chat)|gpt-5\.\d+-(mini|nano|pro)|:batch/,
  },
  "google-flagship": {
    include: /^google\/gemini-.*pro/,
    exclude: /-(image|tts|customtools)|:batch/,
  },
  "google-fast": {
    include: /^google\/gemini-.*flash/,
    exclude: /-(image|tts|lite)|:batch/,
  },
};

/**
 * Offline frontier fallbacks — GENERATED from the live gateway catalogue by
 * `pnpm gen:frontier-models`, not hand-typed. They used to be `fallback` fields
 * on the rules above with an audit date in a comment, and by 2026-08 they named
 * two-generations-old models that still routed fine, so nothing failed and the
 * only symptom was weaker output.
 */
export const FRONTIER_FALLBACK: Record<ModelTier, string> = GENERATED_FALLBACK;

const OPENROUTER_MODELS_URL =
  process.env.OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models";

let routableCache: { ids: Set<string>; fetchedAt: number } | null = null;
let routableInflight: Promise<Set<string>> | null = null;

/** Gateway-routable model ids (OpenRouter), cached with the same TTL as the catalog. */
async function fetchRoutableIds(): Promise<Set<string>> {
  const now = Date.now();
  if (routableCache && now - routableCache.fetchedAt < TTL_MS) return routableCache.ids;
  if (routableInflight) return routableInflight;

  routableInflight = (async () => {
    try {
      const res = await fetch(OPENROUTER_MODELS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      const ids = new Set(
        (json.data ?? []).map((m) => m.id).filter((x): x is string => typeof x === "string"),
      );
      routableCache = { ids, fetchedAt: Date.now() };
      return ids;
    } catch {
      return routableCache?.ids ?? new Set<string>();
    } finally {
      routableInflight = null;
    }
  })();

  return routableInflight;
}

/** Collapse separators so `claude-opus-4.8` (OpenRouter) matches `claude-opus-4-8` (models.dev). */
const collapseId = (s: string): string => s.toLowerCase().replace(/[._-]/g, "");
const bareId = (id: string): string => {
  const slash = id.indexOf("/");
  return slash >= 0 ? id.slice(slash + 1) : id;
};
const versionOf = (id: string): number => {
  const m = bareId(id).match(/(\d+(?:\.\d+)?)/);
  const raw = m?.[1];
  return raw ? Number.parseFloat(raw) : -1;
};

/**
 * Resolve a semantic tier to the newest concrete model id that is BOTH
 * gateway-routable and present in the models.dev catalog. Falls back to the
 * audited hardcoded frontier when the live lists are unavailable.
 */
export async function resolveFrontierModel(tier: ModelTier): Promise<string> {
  const rule = TIER_RULES[tier];
  const fallback = FRONTIER_FALLBACK[tier];
  try {
    const [routable, metaIndex] = await Promise.all([fetchRoutableIds(), loadIndex()]);
    if (routable.size === 0) return fallback;

    const metaNorm = new Set([...metaIndex.keys()].map(collapseId));
    const candidates = [...routable].filter(
      (id) =>
        rule.include.test(id) && !rule.exclude.test(id) && metaNorm.has(collapseId(bareId(id))),
    );
    if (candidates.length === 0) return fallback;

    candidates.sort((a, b) => versionOf(b) - versionOf(a));
    return candidates[0] ?? fallback;
  } catch {
    return fallback;
  }
}

// ─── Per-node model spec resolution ─────────────────────────────────────────────
//
// Resolves a node's model HINTS (id pin OR modality/effort/capability) to a
// concrete model id. Mirrors agent-runtime NodeModelSpec structurally (plain
// object — no cross-package dependency). Used by the workflow/agent executor.

export interface ModelSpecHints {
  /** Explicit pin — wins over every hint. Preset alias or `provider/model` id. */
  id?: string;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  modality?: ModelModality;
  capabilities?: { vision?: boolean; toolCall?: boolean; reasoning?: boolean };
}

const EFFORT_TIER: Record<NonNullable<ModelSpecHints["reasoningEffort"]>, ModelTier> = {
  low: "fast",
  medium: "flagship",
  high: "flagship",
  xhigh: "reasoning",
};

function pickByCapabilities(
  models: CatalogModel[],
  caps?: ModelSpecHints["capabilities"],
): CatalogModel | null {
  const filtered = caps
    ? models.filter(
        (m) =>
          (!caps.vision || m.capabilities.vision) &&
          (!caps.toolCall || m.capabilities.toolCall) &&
          (!caps.reasoning || m.capabilities.reasoning),
      )
    : models;
  return filtered[0] ?? null;
}

/**
 * Resolve a per-node model spec to a concrete model id. Precedence: explicit
 * `id` → non-text `modality` (most-available matching model) → `reasoningEffort`
 * tier (text frontier) → text `capabilities` match → `fallback` (the run
 * default). Never throws — degrades to `fallback`.
 */
export async function resolveModelSpec(spec: ModelSpecHints, fallback: string): Promise<string> {
  try {
    if (spec.id) return spec.id;

    if (spec.modality && spec.modality !== "text") {
      const match = pickByCapabilities(
        await listModelsByModality(spec.modality),
        spec.capabilities,
      );
      if (match) return match.offerings[0]?.id ?? match.key;
      return fallback;
    }

    if (spec.reasoningEffort) return resolveFrontierModel(EFFORT_TIER[spec.reasoningEffort]);

    if (spec.capabilities) {
      const match = pickByCapabilities(await listModelsByModality("text"), spec.capabilities);
      if (match) return match.offerings[0]?.id ?? match.key;
    }

    return fallback;
  } catch {
    return fallback;
  }
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
