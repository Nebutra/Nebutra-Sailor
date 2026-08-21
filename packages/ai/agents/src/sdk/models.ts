/**
 * Model presets for common Nebutra use cases.
 *
 * All IDs use "vendor/model" format (OpenRouter / SiliconFlow).
 * When using direct OpenAI provider, only OpenAI models are valid.
 * When using Vercel AI Gateway, use "provider/model" format.
 * When using SiliconFlow, use "Vendor/Model" format (e.g. "Qwen/Qwen2.5-72B-Instruct").
 *
 * The six frontier tiers are GENERATED — `pnpm gen:frontier-models` resolves
 * them from the live gateway catalogue and writes
 * `frontier-fallback.generated.ts`. They were hand-typed with an audit date in
 * this comment until 2026-08-21, by which point `flagship` still said
 * `claude-sonnet-4.6` and `reasoning` `claude-opus-4.8` — two releases behind —
 * and `openai-flagship` named `gpt-5.5` after the whole 5.6 family had shipped.
 * Nothing failed, because a stale id routes to a real older model; the only
 * symptom was weaker output. The same generator writes the copy that
 * `@nebutra/ai-providers` uses, so the two lists cannot drift apart.
 *
 * They remain the FALLBACK tier: `resolveFrontierModel(tier)` from
 * `@nebutra/ai-providers/catalog` re-resolves against the live list at runtime
 * and only lands on these values when that list is unreachable.
 *
 * The presets below the generated block are vendor-specific and stay
 * hand-maintained — each needs that vendor's own catalogue to verify.
 */
import { AI302_ALIASES, AI302_OPEN_MODELS, FRONTIER_FALLBACK } from "./frontier-fallback.generated";

export const models = {
  // ── Generated frontier tiers — edit via `pnpm gen:frontier-models` ──────────
  ...FRONTIER_FALLBACK,

  /** Embedding model */
  embedding: "openai/text-embedding-3-small",

  /** Embedding model (high-dimensional) */
  "embedding-large": "openai/text-embedding-3-large",

  // --- Open-weight families via 302.AI (use with provider: "ai302") ---
  // Generated with the tiers above. These replaced three SiliconFlow presets
  // naming Qwen2.5-72B, DeepSeek-R1 and DeepSeek-V3 — every one superseded,
  // none with a caller anywhere in the repo, and none checkable without a
  // SiliconFlow key. 302 serves the same families and lists its catalogue,
  // so these are resolved rather than remembered.
  ...AI302_OPEN_MODELS,

  // --- SenseNova Token Plan presets (use with provider: "sensenova") ---
  // Base URL: https://token.sensenova.cn/v1
  // Docs: https://github.com/OpenSenseNova/SenseNova6.7/blob/main/API_CN.md

  /** SenseNova 6.7 Flash-Lite — small multimodal agent (default for i18n CI) */
  "sn-flash-lite": "sensenova-6.7-flash-lite",

  /** DeepSeek V4 Flash via SenseNova Token Plan — long context, cheap */
  "sn-deepseek-flash": "deepseek-v4-flash",

  /** Alias: prefer flash-lite for bulk translation */
  "sn-translate": "sensenova-6.7-flash-lite",
} as const;

export type ModelPreset = keyof typeof models;

/**
 * Resolves a model preset alias to its full model ID.
 * If the input is not a preset key, returns it as-is (passthrough).
 */
export function resolveModel(modelOrPreset: string): string {
  if (modelOrPreset in models) {
    return models[modelOrPreset as ModelPreset];
  }
  return modelOrPreset;
}

/**
 * Rewrite a resolved model id into the form 302.AI serves.
 *
 * Dropping the gateway's `vendor/` prefix covers most of the catalogue, but not
 * all of it: OpenRouter writes `anthropic/claude-haiku-4.5` where 302 lists
 * `claude-haiku-4-5-20251001`, and asking 302 for the stripped form returns 503
 * "No available models currently" — which reads like an outage, not a wrong id.
 * The exceptions come from `AI302_ALIASES`, resolved against 302's own
 * catalogue by `pnpm gen:frontier-models`, so they are looked up rather than
 * guessed at.
 */
const AI302_BY_GATEWAY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(AI302_ALIASES).map(([tier, id]) => [
    FRONTIER_FALLBACK[tier as keyof typeof FRONTIER_FALLBACK],
    id,
  ]),
);

export function toAi302ModelId(modelOrPreset: string): string {
  const modelId = resolveModel(modelOrPreset);
  const alias = AI302_BY_GATEWAY_ID[modelId];
  if (alias) return alias;
  const slash = modelId.indexOf("/");
  return slash === -1 ? modelId : modelId.slice(slash + 1);
}
