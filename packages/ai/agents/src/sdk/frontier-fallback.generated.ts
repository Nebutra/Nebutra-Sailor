// GENERATED — do not edit by hand.
// Run `pnpm gen:frontier-models` to refresh from the live gateway catalogue.
//
// The newest model OpenRouter routes for each tier, resolved 2026-08-21.
// These are the offline fallbacks: `resolveFrontierModel()` re-resolves against
// the live list at runtime and only lands here when that list is unreachable.

export const FRONTIER_FALLBACK = {
  reasoning: "anthropic/claude-opus-5",
  flagship: "anthropic/claude-sonnet-5",
  fast: "anthropic/claude-haiku-4.5",
  "openai-flagship": "openai/gpt-5.6-sol",
  "google-flagship": "google/gemini-3.1-pro-preview",
  "google-fast": "google/gemini-3.7-flash",
} as const;

export type FrontierTier = keyof typeof FRONTIER_FALLBACK;

/**
 * Tiers whose id 302.AI spells differently from the gateway. Only the tiers
 * that actually differ appear; everything else is served under the bare id.
 * A missing entry means "no alias needed", never "unknown".
 */
export const AI302_ALIASES: Partial<Record<FrontierTier, string>> = {
  fast: "claude-haiku-4-5-20251001",
};

/**
 * Newest member of each open-weight family 302.AI serves — the models the
 * Anthropic/OpenAI/Google tiers above do not cover. Ids are 302-native and bare,
 * so these presets only resolve against the `ai302` provider.
 */
export const AI302_OPEN_MODELS = {
  "302-deepseek": "deepseek-v4-pro",
  "302-deepseek-fast": "deepseek-v4-flash",
  "302-qwen": "qwen3.8-max",
  "302-glm": "glm-5.3",
  "302-kimi": "kimi-k3",
  "302-minimax": "MiniMax-M3",
} as const;
