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

const UPSTREAM_CEILING_PER_MILLION = 40;
const MARGIN = 1.25;

export const PRICE_OVERRIDES: Record<string, PriceOverride> = {
  /**
   * We buy `gpt-image-2` from 302.ai and 302's public table does not list it.
   * What that table does list, across the whole gpt-image family, is text input
   * $5/1M, image input $8–$40/1M, image output $32–$40/1M. A single
   * `input_tokens` count cannot tell text tokens from image tokens, so every
   * input token is charged as though it were the dearer kind. $40 is the
   * ceiling of everything observed; ×1.25 is the margin.
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
    note: "302.ai gpt-image family ceiling $40/1M x 1.25; true gpt-image-2 rate unpublished",
  },
};

export function priceOverrideFor(modelName: string): PriceOverride | undefined {
  return PRICE_OVERRIDES[modelName];
}
