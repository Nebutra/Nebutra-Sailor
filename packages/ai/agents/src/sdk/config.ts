/**
 * Runtime configuration for the Vercel AI SDK-backed helpers
 * (`generateText`, `streamText`, `embed`, `embedMany`).
 *
 * Previously lived in `@nebutra/ai-sdk/config`. Absorbed into
 * `@nebutra/agents` during the AI package consolidation so there is
 * a single AI runtime package.
 */

import { z } from "zod";

import { models } from "./models";

/**
 * Supported AI provider backends for the top-level helpers.
 *
 * - openrouter:   300+ models, automatic failover, pay-as-you-go (default)
 * - openai:       Direct OpenAI API access
 * - siliconflow:  SiliconFlow cloud — Qwen, DeepSeek, etc. (OpenAI-compatible, China-optimized)
 * - sensenova:    商汤 SenseNova — OpenAI-compatible (`compatible-mode/v1`)
 * - ai302:        302.AI aggregator — OpenAI-compatible, broad model catalogue
 * - gateway:      Vercel AI Gateway with OIDC auth (for Vercel-deployed apps)
 */
export const ProviderType = z.enum([
  "openrouter",
  "openai",
  "siliconflow",
  "sensenova",
  "ai302",
  "gateway",
]);
export type ProviderType = z.infer<typeof ProviderType>;

export const NebutraAIConfigSchema = z.object({
  /** Which provider backend to use. Defaults to "openrouter". */
  provider: ProviderType.default("openrouter"),

  /** API key override. Falls back to env vars per provider. */
  apiKey: z.string().optional(),

  /**
   * Default model id. Reads the generated frontier flagship rather than naming
   * a version, so `pnpm gen:frontier-models` moves it and it cannot go stale
   * here independently of everywhere else.
   */
  defaultModel: z.string().default(models.flagship),

  /** Default temperature for generations. */
  temperature: z.number().min(0).max(2).default(0.7),

  /** Default max tokens for output. */
  maxTokens: z.number().int().positive().optional(),

  /** Extra headers merged into every request (e.g. HTTP-Referer for OpenRouter). */
  headers: z.record(z.string(), z.string()).optional(),

  /** Extra body fields merged into every request. */
  extraBody: z.record(z.string(), z.unknown()).optional(),
});

export type NebutraAIConfig = z.input<typeof NebutraAIConfigSchema>;
export type ResolvedNebutraAIConfig = z.output<typeof NebutraAIConfigSchema>;

/**
 * Resolves the API key from explicit config or environment variables.
 */
export function resolveApiKey(config: ResolvedNebutraAIConfig): string {
  if (config.apiKey) return config.apiKey;

  const envMap: Record<ProviderType, string> = {
    openrouter: "OPENROUTER_API_KEY",
    openai: "OPENAI_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    sensenova: "SENSENOVA_API_KEY",
    ai302: "AI302_API_KEY",
    gateway: "VERCEL_OIDC_TOKEN",
  };

  const envVar = envMap[config.provider];

  const value = globalThis.process?.env?.[envVar];

  if (!value) {
    throw new Error(
      `[@nebutra/agents] Missing API key. Set "${envVar}" in environment or pass "apiKey" in config.`,
    );
  }

  return value;
}
