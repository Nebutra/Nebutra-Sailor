#!/usr/bin/env tsx

/**
 * Seed `model_configs` (the Router price service) from the live shelf.
 *
 * The shelf — `getListingCatalog()` — is already the intersection of what we
 * can route (supply inventory) and what models.dev knows the price of. This
 * script writes that intersection into the one table the /v1 edge prices a
 * request from, so a charge never depends on an HTTP call to models.dev at
 * request time.
 *
 * Idempotent: upserts on `model_name`. Re-running updates prices in place and
 * creates nothing twice. It never deletes: a model that leaves the shelf is
 * unpublished (`published = false`, `is_active = false`), so historical ledger
 * rows keep a price row to join against.
 *
 * Usage (from the repo root):
 *   pnpm exec tsx infra/nebutra-router/scripts/seed-model-prices.ts
 *   pnpm exec tsx infra/nebutra-router/scripts/seed-model-prices.ts --dry-run
 *
 * Env: DATABASE_URL (+ whatever NEW_API_* / NEBUTRA_MODEL_ALIASES the shelf
 * needs to see real inventory; without them the shelf falls back to aliases and
 * the seed is correspondingly small).
 */

/**
 * The shelf lives in the Router app. `apps/router` is a CommonJS package and
 * this script is ESM, so the runtime hands us `module.exports` on `default`;
 * the cast restores the real shape without loosening the types.
 */
import type { ListingModel, ListingProvider } from "../../../apps/router/src/lib/listing-catalog";
import listingCatalogCjs from "../../../apps/router/src/lib/listing-catalog";
import { getSystemDb } from "../../../packages/platform/db/src/index";

const { getListingCatalog } =
  listingCatalogCjs as unknown as typeof import("../../../apps/router/src/lib/listing-catalog");

type AIProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE" | "SILICONFLOW" | "CUSTOM";

/** Shelf brand → the `AIProvider` enum the schema already has. */
const PROVIDER_MAP: Partial<Record<ListingProvider, AIProvider>> = {
  openai: "OPENAI",
  anthropic: "ANTHROPIC",
  google: "GOOGLE",
  deepseek: "SILICONFLOW",
  qwen: "SILICONFLOW",
  zhipu: "SILICONFLOW",
  moonshot: "SILICONFLOW",
  minimax: "SILICONFLOW",
  baichuan: "SILICONFLOW",
  yi: "SILICONFLOW",
};

/**
 * The shelf carries context as a display string ("200k", "1M"). Parse it back;
 * an unparseable value is left null rather than guessed.
 */
function parseContext(display: string): number | null {
  const m = /^([\d.]+)\s*([kKmM])?$/.exec(display.trim());
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const suffix = m[2]?.toLowerCase();
  if (suffix === "k") return Math.round(n * 1000);
  if (suffix === "m") return Math.round(n * 1_000_000);
  return Math.round(n);
}

/** A model with no price is never published — an unpriced SKU must be refusable. */
function isPriced(m: ListingModel): boolean {
  return m.inputPerMTok > 0 && m.outputPerMTok > 0;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { models, source, fetchedNote } = await getListingCatalog();

  process.stdout.write(`shelf: ${models.length} models · ${source} · ${fetchedNote}\n`);
  if (models.length === 0) {
    process.stderr.write("shelf is empty — refusing to seed\n");
    process.exitCode = 1;
    return;
  }

  const db = getSystemDb();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const m of models) {
    const published = isPriced(m) && m.sellable;
    if (!isPriced(m)) skipped += 1;

    const row = {
      provider: (PROVIDER_MAP[m.provider] ?? "CUSTOM") as AIProvider,
      inputPricePerMillion: m.inputPerMTok,
      outputPricePerMillion: m.outputPerMTok,
      currency: "USD",
      unit: "PER_1M_TOKENS" as const,
      contextLength: parseContext(m.context),
      isActive: m.sellable,
      published,
    };

    if (dryRun) {
      process.stdout.write(
        `${published ? "publish" : "hold   "} ${m.publicModel} ` +
          `in=${m.inputPerMTok} out=${m.outputPerMTok} ctx=${row.contextLength ?? "—"}\n`,
      );
      continue;
    }

    const existing = await db.modelConfig.findUnique({
      where: { modelName: m.publicModel },
      select: { id: true },
    });
    await db.modelConfig.upsert({
      where: { modelName: m.publicModel },
      create: { modelName: m.publicModel, ...row },
      update: row,
    });
    if (existing) updated += 1;
    else created += 1;
  }

  // A model that has left the shelf stops being sellable but keeps its row, so
  // old ledger entries still join to a price.
  if (!dryRun) {
    const onShelf = models.map((m) => m.publicModel);
    const retired = await db.modelConfig.updateMany({
      where: { modelName: { notIn: onShelf }, published: true },
      data: { published: false, isActive: false },
    });
    process.stdout.write(
      `created=${created} updated=${updated} unpriced_held=${skipped} retired=${retired.count}\n`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });
