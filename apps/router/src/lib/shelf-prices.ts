import "server-only";

import { getSystemDb } from "@nebutra/db";
import { RouterBillingRepository, type RouterPriceRow } from "@nebutra/repositories";
import {
  getListedModelBySlug,
  getListingCatalog,
  getRelatedListings,
  type ListingModel,
} from "./listing-catalog";

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

/**
 * The shelf, and lookups into it, priced at what the edge will charge.
 *
 * These live here rather than in `listing-catalog` because they read the price
 * table through Prisma, and `listing-catalog` is imported by client components
 * for its labels and formatters. Putting a Prisma import there dragged `dns`,
 * `fs` and `net` into the browser bundle and broke the build — `server-only`
 * did not catch it first because the unresolvable Node built-ins surfaced
 * before the boundary check did.
 *
 * So the split is a build constraint as much as a naming one: the raw catalogue
 * is client-safe, and anything that knows our real prices stays on the server.
 */
export async function getPricedListingCatalog(): Promise<
  Awaited<ReturnType<typeof getListingCatalog>>
> {
  const [catalog, prices] = await Promise.all([getListingCatalog(), publishedPriceMap()]);
  return { ...catalog, models: applyPublishedPrices(catalog.models, prices) };
}

/** One model by slug, priced. */
export async function getPricedModelBySlug(slug: string): Promise<ListingModel | null> {
  const model = await getListedModelBySlug(slug);
  if (!model) return null;
  const prices = await publishedPriceMap();
  return applyPublishedPrices([model], prices)[0] ?? null;
}

/** Related models for the detail page, priced. */
export async function getPricedRelatedListings(
  seed: ListingModel,
  limit = 6,
): Promise<ListingModel[]> {
  const [related, prices] = await Promise.all([
    getRelatedListings(seed, limit),
    publishedPriceMap(),
  ]);
  return applyPublishedPrices(related, prices);
}
