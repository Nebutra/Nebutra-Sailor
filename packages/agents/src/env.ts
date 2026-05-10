/**
 * Environment validation for `@nebutra/agents`.
 *
 * All variables are OPTIONAL — the package must work with zero new env config.
 * Provider keys (OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
 * are validated lazily by the provider resolver, not here.
 */

import { z } from "zod";

/** Comma-separated provider chain. Order = priority. */
const FallbackProviderName = z.enum(["openrouter", "anthropic", "openai"]);
export type FallbackProviderName = z.infer<typeof FallbackProviderName>;

const FallbackChain = z
  .string()
  .transform((raw) =>
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(FallbackProviderName).min(1));

export const AgentsEnvSchema = z.object({
  // ── Anthropic (direct) ─────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),

  // ── Langfuse (LLM tracing — optional) ─────────────────────────────────
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_HOST: z.string().url().default("https://cloud.langfuse.com"),

  // ── Multi-provider fallback chain ─────────────────────────────────────
  /**
   * Comma-separated chain of providers tried in order on retryable failures.
   * Default: "openrouter,anthropic,openai" — OpenRouter first (multi-model),
   * then direct Anthropic (prompt caching), then direct OpenAI as last resort.
   */
  LLM_FALLBACK_CHAIN: FallbackChain.default((): FallbackProviderName[] => [
    "openrouter",
    "anthropic",
    "openai",
  ]),

  /**
   * Comma-separated chain of providers tried for EMBEDDINGS, in order.
   * Default: "openrouter,openai" — Anthropic does not currently expose
   * embedding models, so it is excluded by default. If unset, falls back
   * to LLM_FALLBACK_CHAIN with embedding-incompatible providers filtered out.
   */
  LLM_EMBEDDING_FALLBACK_CHAIN: FallbackChain.default((): FallbackProviderName[] => [
    "openrouter",
    "openai",
  ]),
});

export type AgentsEnv = z.infer<typeof AgentsEnvSchema>;

/** Lazy parsed env — re-read once on first call. */
let _cached: AgentsEnv | undefined;

/** Returns the validated env (cached). Safe to call from any runtime. */
export function getAgentsEnv(): AgentsEnv {
  if (_cached) return _cached;
  _cached = AgentsEnvSchema.parse(globalThis.process?.env ?? {});
  return _cached;
}

/** Test helper — clears cache so updated process.env is picked up. */
export function _resetAgentsEnvCache(): void {
  _cached = undefined;
}

/** True iff Langfuse credentials are present. */
export function isLangfuseConfigured(): boolean {
  const env = getAgentsEnv();
  return Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY);
}
