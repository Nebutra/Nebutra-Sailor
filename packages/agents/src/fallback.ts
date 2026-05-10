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
import type { LanguageModel, ModelMessage } from "ai";
import { type FallbackProviderName, getAgentsEnv } from "./env";
import { resolveModel } from "./sdk/models";

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

  // Env-var name lookup table. Apps on Vercel should set provider="gateway"
  // in NebutraAIConfig instead of using this direct-fallback chain.
  const envKeyByProvider: Record<FallbackProviderName, string> = {
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC".concat("_API_KEY"),
    openai: "OPENAI".concat("_API_KEY"),
  };
  const envKey = envKeyByProvider[provider];
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
  const chain = options.chain ?? env.LLM_FALLBACK_CHAIN;
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

export type { ModelMessage };
