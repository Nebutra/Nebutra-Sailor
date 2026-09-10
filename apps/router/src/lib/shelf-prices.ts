import "server-only";

import { getSystemDb } from "@nebutra/db";
import { RouterBillingRepository, type RouterPriceRow } from "@nebutra/repositories";
import type { ListingModel } from "./listing-catalog";

/**
 * The rates the /v1 edge will actually charge, for every surface that quotes a
 * price to a customer.
 *
 * `getListingCatalog()` prices from the public model index. That is the right
 * source for deciding what a model *costs us* and therefore what to publish,
 * but it is not what we charge — the markup, the coverage factors and the
 * hand-set overrides all land in `model_configs` when prices are published.
 *
 * Quoting the index instead meant the shelf advertised gpt-5.6-luna at $0.20
 * while billing $0.26, and showed gpt-image-2 with no price at all while
 * selling it at $52. A storefront that undercuts its own till is the worst
 * direction for that error to run, so both the HTML shelf and the catalogue
 * JSON read this instead.
 */

/** A price row carries a rate if any column it can be sold by is set. */
function hasRate(row: RouterPriceRow): boolean {
  return num(row.inputPerMTok) > 0 || num(row.outputPerMTok) > 0 || num(row.unitPrice) > 0;
}

/** An unset price column is not free — it is a column this SKU is not sold by. */
export function num(value: number | null): number {
  return value ?? 0;
}

/** Published, priced rows by model name. Anything absent is not for sale. */
export async function publishedPriceMap(): Promise<Map<string, RouterPriceRow>> {
  const rows = await new RouterBillingRepository(getSystemDb()).listPublishedPrices();
  return new Map(rows.filter(hasRate).map((row) => [row.modelName, row]));
}

/**
 * Restate a listing's rates as the ones we charge. A model with no published
 * price keeps zeros, which the shelf already renders as "—" — honest, because
 * a model we cannot price is one the edge refuses.
 */
export function applyPublishedPrices(
  models: readonly ListingModel[],
  prices: ReadonlyMap<string, RouterPriceRow>,
): ListingModel[] {
  return models.map((model) => {
    const row = prices.get(model.publicModel);
    if (!row) return { ...model, inputPerMTok: 0, outputPerMTok: 0 };
    return {
      ...model,
      inputPerMTok: num(row.inputPerMTok),
      outputPerMTok: num(row.outputPerMTok),
    };
  });
}
