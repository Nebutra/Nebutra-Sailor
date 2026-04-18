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
import {
  type NebutraAIConfig,
  NebutraAIConfigSchema,
  type ResolvedNebutraAIConfig,
} from "./config";
import { createEmbeddingModel, createModel } from "./provider";

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
  options: GenerateOptions = {},
): Promise<StreamTextResult<Record<string, never>, never>> {
  const model = createModel(options.model ?? _resolved.defaultModel, _resolved);

  return _streamText({
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

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export interface EmbedOptions {
  /** Embedding model ID or preset alias. Defaults to "embedding". */
  model?: string;
}

/**
 * Generate an embedding vector for a single value.
 */
export async function embed(value: string, options: EmbedOptions = {}) {
  const model = createEmbeddingModel(options.model ?? "embedding", _resolved);
  return await _embed({ model, value });
}

/**
 * Generate embedding vectors for multiple values in a single request.
 */
export async function embedMany(values: string[], options: EmbedOptions = {}) {
  const model = createEmbeddingModel(options.model ?? "embedding", _resolved);
  return await _embedMany({ model, values });
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
