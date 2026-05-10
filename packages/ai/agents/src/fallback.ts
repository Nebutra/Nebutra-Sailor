/**
 * Multi-provider fallback chain + prompt-caching helpers.
 *
 * Cost & reliability primitives for production LLM workloads:
 *
 * 1. `createFallbackModel()` — picks a primary model and returns a callable
 *    that retries on retryable errors (429 / 5xx / network) by swapping to
 *    the next provider in `LLM_FALLBACK_CHAIN`.
 *
 * 2. `withCacheControl()` — annotates the system message with Anthropic
 *    `cacheControl: { type: 'ephemeral' }` for a 90% discount on cached
 *    prefix tokens. OpenAI auto-caches when the prefix is stable and ≥1024
 *    tokens — see comment in `generateWithFallback()`.
 *
 * Reference: https://sdk.vercel.ai/docs/ai-sdk-providers/anthropic#cache-control
 */

import { logger } from "@nebutra/logger";
import type { EmbeddingModel, LanguageModel, ModelMessage } from "ai";
import { type FallbackProviderName, getAgentsEnv } from "./env";
import { resolveModel } from "./sdk/models";

// ────────────────────────────────────────────────────────────────────────────
// Env-key lookup — used to filter the chain to providers that actually have
// credentials present. This makes single-provider deploys "just work".
// ────────────────────────────────────────────────────────────────────────────

const ENV_KEY_BY_PROVIDER: Record<FallbackProviderName, string> = {
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC".concat("_API_KEY"),
  openai: "OPENAI".concat("_API_KEY"),
};

function hasProviderKey(provider: FallbackProviderName): boolean {
  const k = ENV_KEY_BY_PROVIDER[provider];
  return Boolean(globalThis.process?.env?.[k]);
}

/**
 * Filter a chain to providers whose API key is present in env.
 * Returns the original chain unchanged if NO providers have keys (so callers
 * still see a meaningful error rather than an empty-chain throw).
 */
export function filterAvailableProviders(
  chain: readonly FallbackProviderName[],
): readonly FallbackProviderName[] {
  const filtered = chain.filter(hasProviderKey);
  return filtered.length > 0 ? filtered : chain;
}

// ────────────────────────────────────────────────────────────────────────────
// Provider factory — lazy + dynamic to avoid hard dep on @ai-sdk/anthropic
// during cold paths that don't use it.
// ────────────────────────────────────────────────────────────────────────────

// Note: this fallback chain INTENTIONALLY uses direct provider API keys
// (OpenRouter / Anthropic / OpenAI) rather than Vercel AI Gateway OIDC.
// Rationale: this package runs in many non-Vercel deployments (ECS, Docker,
// self-hosted Hono) where OIDC isn't available. Apps deployed on Vercel
// should configure provider="gateway" in NebutraAIConfig (see sdk/config.ts)
// to route through AI Gateway with OIDC auth.

async function buildModel(
  provider: FallbackProviderName,
  modelOrPreset: string,
): Promise<LanguageModel> {
  const modelId = resolveModel(modelOrPreset);

  // Apps on Vercel should set provider="gateway" in NebutraAIConfig instead
  // of using this direct-fallback chain.
  const envKey = ENV_KEY_BY_PROVIDER[provider];
  const apiKey = globalThis.process?.env?.[envKey];
  if (!apiKey) throw new Error(`${envKey} missing`);

  switch (provider) {
    case "openrouter": {
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      return createOpenRouter({ apiKey }).chat(modelId);
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      // Anthropic uses bare model IDs — strip "anthropic/" prefix from presets.
      const anthropicModelId = modelId.startsWith("anthropic/")
        ? modelId.slice("anthropic/".length)
        : modelId;
      return createAnthropic({ apiKey })(anthropicModelId);
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      // Strip "openai/" prefix.
      const openaiModelId = modelId.startsWith("openai/")
        ? modelId.slice("openai/".length)
        : modelId;
      return createOpenAI({ apiKey })(openaiModelId);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Retryable error classification
// ────────────────────────────────────────────────────────────────────────────

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as Record<string, unknown>;

  const status =
    typeof e.statusCode === "number"
      ? e.statusCode
      : typeof e.status === "number"
        ? e.status
        : undefined;
  if (status !== undefined && RETRYABLE_STATUS.has(status)) return true;

  const code = typeof e.code === "string" ? e.code : "";
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }

  // AI SDK APICallError / network errors expose `.isRetryable`
  if (e.isRetryable === true) return true;

  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Resolved fallback model — try chain in order
// ────────────────────────────────────────────────────────────────────────────

export interface FallbackResult<T> {
  result: T;
  provider: FallbackProviderName;
  attempts: number;
}

export interface CreateFallbackModelOptions {
  /** Override the default chain from env. */
  chain?: readonly FallbackProviderName[];
  /** Model preset / id passed to each provider in the chain. */
  model?: string;
  /**
   * If true (default), filter the chain to providers whose API key is present
   * in env. Set false to keep the original chain (caller wants to surface
   * "missing key" errors as fallback steps — useful for tests).
   */
  filterAvailable?: boolean;
}

/**
 * Run an AI SDK call against the configured fallback chain.
 *
 * The caller provides an `invoke(model)` function — usually a closure over
 * `streamText` or `generateText` — and `runWithFallback` walks the chain,
 * trying each provider in order until one succeeds or the chain is exhausted.
 */
export async function runWithFallback<T>(
  invoke: (model: LanguageModel) => Promise<T>,
  options: CreateFallbackModelOptions = {},
): Promise<FallbackResult<T>> {
  const env = getAgentsEnv();
  const rawChain = options.chain ?? env.LLM_FALLBACK_CHAIN;
  const chain = options.filterAvailable === false ? rawChain : filterAvailableProviders(rawChain);
  const model = options.model ?? "flagship";

  let lastError: unknown;
  let attempts = 0;

  for (const provider of chain) {
    attempts += 1;
    try {
      const lm = await buildModel(provider, model);
      const result = await invoke(lm);
      if (attempts > 1) {
        logger.info("LLM fallback succeeded", { provider, attempts });
      }
      return { result, provider, attempts };
    } catch (error) {
      lastError = error;

      // Non-retryable: surface the original error immediately.
      if (!isRetryableError(error)) {
        logger.error("LLM call failed (non-retryable)", { provider, error });
        throw error;
      }

      logger.warn("LLM provider failed — trying next in chain", {
        provider,
        nextIndex: attempts,
        error,
      });
    }
  }

  throw new Error(
    `All LLM providers in fallback chain [${chain.join(", ")}] failed. ` +
      `Last error: ${String(lastError)}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Prompt-caching helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build `providerOptions` that enable prompt caching across providers.
 *
 * - Anthropic: explicit `cacheControl: { type: 'ephemeral' }` on the system
 *   message — 90% cost reduction on cached prefix tokens.
 * - OpenAI: prompt caching is AUTOMATIC for prompts ≥1024 tokens with a
 *   stable prefix. No flag needed — but callers MUST keep the system prompt
 *   + tools FIRST and dynamic user content LAST, otherwise the cache is
 *   invalidated on every call.
 * - OpenRouter: passes provider options through transparently.
 */
export function withAnthropicCacheControl(): {
  anthropic: { cacheControl: { type: "ephemeral" } };
} {
  return {
    anthropic: { cacheControl: { type: "ephemeral" } },
  };
}

/**
 * Wraps the system message in a structured cache-control hint.
 * Returns the messages array unchanged if no system text is provided.
 *
 * IMPORTANT: keep stable content (system prompt + tool defs) FIRST,
 * dynamic content (user query) LAST — required for both Anthropic explicit
 * caching AND OpenAI automatic caching to hit.
 */
export function buildSystemWithCache(systemPrompt: string): {
  role: "system";
  content: string;
  providerOptions: ReturnType<typeof withAnthropicCacheControl>;
} {
  return {
    role: "system",
    content: systemPrompt,
    providerOptions: withAnthropicCacheControl(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Embedding fallback — separate chain since not every chat provider exposes
// embeddings (Anthropic notably does not).
// ────────────────────────────────────────────────────────────────────────────

/** Providers that currently expose embedding models via the AI SDK. */
const EMBEDDING_CAPABLE: ReadonlySet<FallbackProviderName> = new Set<FallbackProviderName>([
  "openrouter",
  "openai",
]);

async function buildEmbeddingModel(
  provider: FallbackProviderName,
  modelOrPreset: string,
): Promise<EmbeddingModel> {
  const modelId = resolveModel(modelOrPreset);
  const envKey = ENV_KEY_BY_PROVIDER[provider];
  const apiKey = globalThis.process?.env?.[envKey];
  if (!apiKey) throw new Error(`${envKey} missing`);

  switch (provider) {
    case "openrouter": {
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      return createOpenRouter({ apiKey }).textEmbeddingModel(modelId);
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const openaiModelId = modelId.startsWith("openai/")
        ? modelId.slice("openai/".length)
        : modelId;
      return createOpenAI({ apiKey }).textEmbeddingModel(openaiModelId);
    }
    case "anthropic": {
      throw new Error("Anthropic does not expose embedding models");
    }
  }
}

export interface EmbeddingFallbackOptions {
  chain?: readonly FallbackProviderName[];
  model?: string;
  filterAvailable?: boolean;
}

/**
 * Run an AI SDK embedding call against the configured embedding fallback chain.
 *
 * The caller provides an `invoke(model)` function — usually a closure over
 * `embed` or `embedMany` from the `ai` package — and this helper walks the
 * embedding-capable chain, trying each provider until one succeeds.
 */
export async function runEmbedWithFallback<T>(
  invoke: (model: EmbeddingModel) => Promise<T>,
  options: EmbeddingFallbackOptions = {},
): Promise<FallbackResult<T>> {
  const env = getAgentsEnv();
  const rawChain = options.chain ?? env.LLM_EMBEDDING_FALLBACK_CHAIN;

  // Filter to providers that (a) expose embeddings and (b) have keys present.
  const capable = rawChain.filter((p) => EMBEDDING_CAPABLE.has(p));
  const chain = options.filterAvailable === false ? capable : capable.filter(hasProviderKey);

  if (chain.length === 0) {
    logger.warn("Embedding fallback chain is empty after filtering", {
      raw: rawChain,
      capable,
    });
    throw new Error(
      "No embedding-capable providers available — set OPENROUTER_API_KEY or " +
        "OPENAI_API_KEY (Anthropic does not expose embedding models).",
    );
  }

  const model = options.model ?? "embedding";
  let lastError: unknown;
  let attempts = 0;

  for (const provider of chain) {
    attempts += 1;
    try {
      const em = await buildEmbeddingModel(provider, model);
      const result = await invoke(em);
      if (attempts > 1) {
        logger.info("Embedding fallback succeeded", { provider, attempts });
      }
      return { result, provider, attempts };
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        logger.error("Embedding call failed (non-retryable)", { provider, error });
        throw error;
      }

      logger.warn("Embedding provider failed — trying next in chain", {
        provider,
        nextIndex: attempts,
        error,
      });
    }
  }

  throw new Error(
    `All embedding providers in fallback chain [${chain.join(", ")}] failed. ` +
      `Last error: ${String(lastError)}`,
  );
}

export type { ModelMessage };
