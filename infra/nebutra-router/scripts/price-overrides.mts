/**
 * Prices for models the catalog cannot price on its own.
 *
 * `seed-model-prices.mts` fills `model_configs` from the shelf, which takes its
 * numbers from models.dev. A model models.dev does not know stays unpriced, and
 * an unpriced model is refused rather than relayed — correct, but it means a
 * model we actually sell can sit dark. This file is where such a model gets a
 * price, deliberately and in the open.
 *
 * The rule for setting one: **price from the worst case we have observed
 * upstream, never from an average.** We buy `gpt-image-2` from 302.ai, and
 * 302's public table does not list it. What that table does list, across the
 * whole gpt-image family (captured in the parity research), is:
 *
 *   text input   $5 / 1M tokens
 *   image input  $8 – $40 / 1M tokens
 *   image output $32 – $40 / 1M tokens
 *
 * A single `input_tokens` count cannot tell text tokens from image tokens, so
 * every input token is charged as though it were the dearer kind. $40 is the
 * ceiling of everything observed; ×1.25 is the margin.
 *
 * This is a defensible floor, not a proof: the true rate for this model id is
 * unpublished, and if 302 prices it above $40/1M the margin absorbs it only up
 * to $50. Confirm the real rate and revisit. The structural guarantee that we
 * cannot be paid nothing for work we bought lives in `billing-edge.ts`, which
 * charges the admission hold when a successful call cannot be priced.
 *
 *   pnpm exec tsx infra/nebutra-router/scripts/price-overrides.mts [--dry-run]
 */
import { getSystemDb } from "@nebutra/db";

const UPSTREAM_CEILING_PER_MILLION = 40;
const MARGIN = 1.25;

const OVERRIDES = [
  {
    modelName: "gpt-image-2",
    // We buy it from 302.ai through the New-API channel, which is an
    // OpenAI-compatible upstream; `OPENAI` is the closest enum value and the
    // column is provenance, not routing — routing is the alias table's job.
    provider: "OPENAI" as const,
    unit: "PER_1M_TOKENS" as const,
    // Token-metered models price from the per-million columns; `unitPrice` is
    // for the units a non-token SKU is sold in (per image, per second).
    inputPricePerMillion: UPSTREAM_CEILING_PER_MILLION * MARGIN,
    outputPricePerMillion: UPSTREAM_CEILING_PER_MILLION * MARGIN,
    contextLength: null,
    note: "302.ai gpt-image family ceiling $40/1M × 1.25; true gpt-image-2 rate unpublished",
  },
];

const dryRun = process.argv.includes("--dry-run");
const db = getSystemDb();

for (const o of OVERRIDES) {
  const line = `${o.modelName}  ${o.unit}  in $${o.inputPricePerMillion}/1M  out $${o.outputPricePerMillion}/1M  — ${o.note}`;
  if (dryRun) {
    process.stdout.write(`would upsert  ${line}\n`);
    continue;
  }
  await db.modelConfig.upsert({
    where: { modelName: o.modelName },
    create: {
      modelName: o.modelName,
      provider: o.provider,
      unit: o.unit,
      inputPricePerMillion: o.inputPricePerMillion,
      outputPricePerMillion: o.outputPricePerMillion,
      contextLength: o.contextLength,
      published: true,
      isActive: true,
    },
    update: {
      unit: o.unit,
      inputPricePerMillion: o.inputPricePerMillion,
      outputPricePerMillion: o.outputPricePerMillion,
      published: true,
      isActive: true,
    },
  });
  process.stdout.write(`upserted      ${line}\n`);
}
await db.$disconnect();
