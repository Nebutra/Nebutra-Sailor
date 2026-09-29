// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source: models.dev + OpenRouter, via @nebutra/ai-providers/catalog.
// Regenerate: pnpm --filter @nebutra/landing gen:ai-showcase
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
  { model: "claude-sonnet-5.5", context: "1M", price: "$2" },
  { model: "gpt-5.6-luna", context: "1.1M", price: "$0.2" },
  { model: "gemini-3.1-pro-preview", context: "1M", price: "$2" },
  { model: "deepseek-flash", context: "1M", price: "$0.15" },
];

/** Count of supported provider buckets (from the provider registry). */
export const AI_SHOWCASE_PROVIDER_COUNT = 47;
