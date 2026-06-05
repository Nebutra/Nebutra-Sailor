// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source: models.dev + OpenRouter, via @nebutra/ai-providers/catalog.
// Regenerate: pnpm --filter @nebutra/landing-page gen:ai-showcase
//
// Hand-typed model strings rot (DeepSeek shipped V4 while this page said V3.2).
// These rows are derived from the live catalog so the marketing surface can
// never silently drift past the frontier.

export interface AiShowcaseRow {
  /** Concrete frontier model id (no aggregator prefix). */
  readonly model: string;
  /** Context window, human-formatted (e.g. "1M", "256K"). */
  readonly context: string;
  /** Representative input price per 1M tokens (median across offerings). */
  readonly price: string;
}

export const AI_SHOWCASE_ROWS: readonly AiShowcaseRow[] = [
  { model: "claude-sonnet-4-6", context: "1M", price: "$3" },
  { model: "gpt-5.5", context: "1.1M", price: "$5" },
  { model: "gemini-3.1-pro-preview", context: "1M", price: "$2" },
  { model: "deepseek-v4-pro", context: "1M", price: "$1.3" },
];

/** Count of supported provider buckets (from the provider registry). */
export const AI_SHOWCASE_PROVIDER_COUNT = 47;
