/**
 * Prices for models the public model index cannot price on its own.
 *
 * The shelf takes its numbers from models.dev. A model models.dev does not know
 * stays unpriced, and an unpriced model is refused rather than relayed —
 * correct, but it means a model we actually sell can sit dark. This file is
 * where such a model gets a price, deliberately and in the open.
 *
 * The rule for setting one: **price from the worst case we have observed
 * upstream, never from an average.**
 *
 * These are not decoration. `price.publish` writes them into the table the /v1
 * edge charges from, and they win over the index — without that, a plan to
 * publish the shelf would unpublish `gpt-image-2` and overwrite its $50 with the
 * index's zero, taking the only model we sell off sale.
 */

export interface PriceOverride {
  provider: "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";
  unit: "PER_1M_TOKENS";
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  contextLength: number | null;
  note: string;
}

/**
 * The markup over upstream's ceiling rate.
 *
 * Money leaks between what we charge and what we bank: refunds on the
 * zero-completion promise, the payment processor's cut, the FX buffer, and
 * settlement shortfall. At the current assumptions — 2% / 3% / 2% / 1% — that
 * is 7.8%, so the true break-even markup is 1/0.9223 = **1.085**, not 1.00.
 *
 * 1.25 was safe but netted only 15.3%. 1.30 nets 19.9%, which is the 20% target
 * after leakage rather than before it:
 *
 *   m = (1 + 0.20) / [(1−.02)(1−.03)(1−.02)(1−.01)] = 1.20 / 0.9223 = 1.301
 *
 * Revisit by re-measuring the four rates, not by picking a rounder number.
 */
const MARGIN = 1.3;

const UPSTREAM_CEILING_PER_MILLION = 40;

/**
 * Coverage factors for dimensions upstream bills that we cannot observe (I3).
 *
 * A rate we never charge cannot be recovered by any markup, because it is not
 * in the calculation at all. Where a provider bills a dimension our parsed
 * `usage` does not report — cache writes, reasoning tokens counted outside
 * `completion_tokens` — its maximum possible contribution is folded into a
 * dimension we do see, by multiplying that dimension's rate.
 *
 * Set γ ≥ max(true quantity / observed quantity). It is deliberately blunt:
 * over-charging ourselves into safety is the correct direction for a rate we
 * have not yet seen on a real invoice.
 */
export interface CoverageFactor {
  input: number;
  output: number;
  why: string;
}

const DEFAULT_COVERAGE: CoverageFactor = { input: 1, output: 1, why: "all dimensions observed" };

const COVERAGE: Record<string, CoverageFactor> = {
  /**
   * Anthropic bills cache writes at 1.25x the input rate, and our parsed usage
   * reports `cache_creation_input_tokens` only on some response shapes. When it
   * is absent those tokens are counted as ordinary input, so charging input at
   * 1.25x makes the worst case — every input token a cache write — break even.
   */
  anthropic: {
    input: 1.25,
    output: 1,
    why: "cache writes bill at 1.25x input and may be unreported",
  },
};

/** Coverage for a model, chosen by the brand that bills us for it. */
export function coverageFor(provider: string): CoverageFactor {
  return COVERAGE[provider] ?? DEFAULT_COVERAGE;
}

export const PRICE_OVERRIDES: Record<string, PriceOverride> = {
  /**
   * We buy `gpt-image-2` from 302.ai and 302's public table does not list it.
   * What that table does list, across the whole gpt-image family, is text input
   * $5/1M, image input $8–$40/1M, image output $32–$40/1M. A single
   * `input_tokens` count cannot tell text tokens from image tokens, so every
   * input token is charged as though it were the dearer kind. $40 is the
   * ceiling of everything observed; MARGIN is applied on top.
   *
   * A defensible floor, not a proof: the true rate for this model id is
   * unpublished, and if 302 prices it above $40/1M the margin absorbs it only up
   * to $50. Confirm the real rate and revisit. The structural guarantee that we
   * cannot be paid nothing for work we bought lives in `billing-edge.ts`, which
   * charges the admission hold when a successful call cannot be priced.
   *
   * `OPENAI` is provenance, not routing — routing is the alias table's job.
   */
  "gpt-image-2": {
    provider: "OPENAI",
    unit: "PER_1M_TOKENS",
    inputPricePerMillion: UPSTREAM_CEILING_PER_MILLION * MARGIN,
    outputPricePerMillion: UPSTREAM_CEILING_PER_MILLION * MARGIN,
    contextLength: null,
    note: "302.ai gpt-image family ceiling $40/1M x MARGIN; true gpt-image-2 rate unpublished",
  },

  /**
   * gpt-image-2.5, released 2026-09-08 as two tiers that bill identically:
   * text input $5/1M, image input $8/1M, image output $30/1M, cache read $2/1M.
   *
   * A single `input_tokens` count cannot tell text tokens from image tokens, so
   * every input token is charged as the dearer kind — $8, not $5. Output takes
   * the image rate, $30. Both take MARGIN.
   *
   * Cache read is deliberately left unset: falling back to the full input rate
   * overcharges us in our own favour, which is the safe direction for a rate we
   * have not yet seen a real invoice for.
   *
   * The bare id `gpt-image-2.5` is deliberately absent from this table. OpenAI
   * released only the two suffixed ids; the bare one 404s in their docs, and
   * CLIProxyAPI forwards it upstream as-is, so it would fail at request time.
   * With no price it stays unpublished and our edge refuses it, which is the
   * outcome we want — do not add it to make the shelf look bigger.
   */
  "gpt-image-2.5-sunburst": {
    provider: "OPENAI",
    unit: "PER_1M_TOKENS",
    inputPricePerMillion: 8 * MARGIN,
    outputPricePerMillion: 30 * MARGIN,
    contextLength: null,
    note: "OpenAI list: image input $8/1M, image output $30/1M, x MARGIN",
  },
  "gpt-image-2.5-flare": {
    provider: "OPENAI",
    unit: "PER_1M_TOKENS",
    inputPricePerMillion: 8 * MARGIN,
    outputPricePerMillion: 30 * MARGIN,
    contextLength: null,
    note: "OpenAI list: image input $8/1M, image output $30/1M, x MARGIN",
  },
};

export function priceOverrideFor(modelName: string): PriceOverride | undefined {
  return PRICE_OVERRIDES[modelName];
}
