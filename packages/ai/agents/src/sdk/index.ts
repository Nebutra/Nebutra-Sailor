/**
 * Top-level Vercel AI SDK helpers — absorbed from the former
 * `@nebutra/ai-sdk` package during the AI consolidation.
 *
 * Public API (unchanged):
 *   configure(), getConfig()
 *   generateText(), streamText()
 *   embed(), embedMany()
 *   createModel(), createEmbeddingModel()
 *   models, resolveModel()
 */

import {
  embed as _embed,
  embedMany as _embedMany,
  generateText as _generateText,
  streamText as _streamText,
  type GenerateTextResult,
  type JSONValue,
  type ModelMessage,
  type StreamTextResult,
} from "ai";
import { runEmbedWithFallback } from "../fallback";
import {
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  type ResolvedNebutraAIConfig,
} from "./config";
import { createModel } from "./provider";

// ---------------------------------------------------------------------------
// Singleton config — call `configure()` once at app startup
// ---------------------------------------------------------------------------

let _resolved: ResolvedNebutraAIConfig = NebutraAIConfigSchema.parse({});

/**
 * Initialise the global Nebutra AI configuration.
 * Call once in your app entry point (e.g. instrumentation.ts or layout.tsx).
 *
 * @example
 * ```ts
 * import { configure } from "@nebutra/agents";
 *
 * configure({ provider: "openrouter" });
 * // → reads OPENROUTER_API_KEY from env automatically
 * ```
 */
export function configure(config: NebutraAIConfig = {}): void {
  _resolved = NebutraAIConfigSchema.parse(config);
}

/** Returns the current resolved config (read-only). */
export function getConfig(): Readonly<ResolvedNebutraAIConfig> {
  return _resolved;
}

// ---------------------------------------------------------------------------
// Core generation helpers
// ---------------------------------------------------------------------------

/**
 * Stream-completion event passed to {@link StreamOptions.onFinish}.
 * Mirrors the AI SDK's `streamText.onFinish` event shape but is decoupled
 * from the SDK internals so consumers don't break on SDK version bumps.
 */
export interface StreamFinishEvent {
  /** Final accumulated text of the model's response. */
  text: string;
  /** Reason the stream terminated (e.g. "stop", "length", "tool-calls"). */
  finishReason: string;
  /** Token usage for the request (best-effort; provider-dependent). */
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
    totalTokens: number | undefined;
  };
}

export interface GenerateOptions {
  /** Model ID or preset alias (e.g. "flagship", "fast", "anthropic/claude-sonnet-4"). */
  model?: string;
  /** System prompt prepended to the conversation. */
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** OpenRouter-specific provider options (reasoning, cacheControl, etc.). */
  providerOptions?: Record<string, JSONValue | undefined>;
}

/**
 * Options accepted by {@link streamText}. Adds the durable `onFinish` hook on
 * top of {@link GenerateOptions}.
 */
export interface StreamOptions extends GenerateOptions {
  /**
   * Invoked once the model has finished streaming, regardless of whether the
   * client kept the response connection open. Use this for server-side
   * persistence (e.g. saving chat sessions to a database) — it is the durable
   * hook for write-once side-effects.
   *
   * Errors thrown inside the callback are caught by the AI SDK and logged;
   * they do not surface to the streaming client.
   */
  onFinish?: (event: StreamFinishEvent) => void | Promise<void>;
}

/**
 * Generate a complete text response.
 */
export async function generateText(
  messages: ModelMessage[],
  options: GenerateOptions = {},
): Promise<GenerateTextResult<Record<string, never>, never>> {
  const model = createModel(options.model ?? _resolved.defaultModel, _resolved);

  return await _generateText({
    model,
    messages,
    ...(options.system ? { system: options.system } : {}),
    temperature: options.temperature ?? _resolved.temperature,
    ...(options.maxTokens ? { maxTokens: options.maxTokens } : {}),
    ...(options.providerOptions
      ? { providerOptions: { openrouter: options.providerOptions } }
      : {}),
  });
}

/**
 * Stream a text response for real-time UI.
 */
export async function streamText(
  messages: ModelMessage[],
  options: StreamOptions = {},
): Promise<StreamTextResult<Record<string, never>, never>> {
  const model = createModel(options.model ?? _resolved.defaultModel, _resolved);
  const userOnFinish = options.onFinish;

  return _streamText({
    model,
    messages,
    ...(options.system ? { system: options.system } : {}),
    temperature: options.temperature ?? _resolved.temperature,
    ...(options.maxTokens ? { maxTokens: options.maxTokens } : {}),
    ...(options.providerOptions
      ? { providerOptions: { openrouter: options.providerOptions } }
      : {}),
    ...(userOnFinish
      ? {
          onFinish: ({ text, finishReason, totalUsage }) => {
            const event: StreamFinishEvent = {
              text,
              finishReason: String(finishReason),
              usage: {
                inputTokens: totalUsage?.inputTokens,
                outputTokens: totalUsage?.outputTokens,
                totalTokens: totalUsage?.totalTokens,
              },
            };
            return userOnFinish(event);
          },
        }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export interface EmbedOptions {
  /** Embedding model ID or preset alias. Defaults to "embedding". */
  model?: string;
}

/**
 * Generate an embedding vector for a single value.
 *
 * Uses `runEmbedWithFallback()` so retryable failures (429 / 5xx / network)
 * automatically rotate to the next provider in `LLM_EMBEDDING_FALLBACK_CHAIN`.
 */
export async function embed(value: string, options: EmbedOptions = {}) {
  const { result } = await runEmbedWithFallback(async (model) => _embed({ model, value }), {
    model: options.model ?? "embedding",
  });
  return result;
}

/**
 * Generate embedding vectors for multiple values in a single request.
 *
 * Uses `runEmbedWithFallback()` for provider rotation on retryable errors.
 */
export async function embedMany(values: string[], options: EmbedOptions = {}) {
  const { result } = await runEmbedWithFallback(async (model) => _embedMany({ model, values }), {
    model: options.model ?? "embedding",
  });
  return result;
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type { GenerateTextResult, ModelMessage, StreamTextResult } from "ai";
export {
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  type ProviderType,
  type ResolvedNebutraAIConfig,
} from "./config";
export type { ModelPreset } from "./models";
export { models, resolveModel } from "./models";
export { createEmbeddingModel, createModel } from "./provider";
