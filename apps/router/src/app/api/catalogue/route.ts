import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { RouterBillingRepository, type RouterPriceRow } from "@nebutra/repositories";
import { getListingCatalog, type ListingModel } from "@/lib/listing-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The shelf, as JSON, without a key.
 *
 * `/v1/models` is the OpenAI-compatible surface and requires a customer key —
 * it answers what *that key* may call. This route answers a different question:
 * what the station is currently able to sell at all. A prospective customer
 * reads it before signing up, and the deploy pipeline reads it to decide
 * whether router.nebutra.com is worth pointing DNS at. Both need it open.
 *
 * Two facts have to agree before a model appears here. Supply inventory must
 * confirm the edge can serve it, and the billing spine must hold a published
 * price for it. Quoting the open model index instead of our own price table is
 * how the shelf came to advertise a model at zero that settles at fifty.
 */
interface CatalogueEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  context: string;
  pricing: {
    unit: string;
    currency: string;
    inputPerMTok: number;
    outputPerMTok: number;
    cacheReadPerMTok: number;
    cacheWritePerMTok: number;
    unitPrice: number;
  };
}

/** A price row carries a rate if any of the fields it can be sold by is set. */
function hasRate(row: RouterPriceRow): boolean {
  return rate(row.inputPerMTok) > 0 || rate(row.outputPerMTok) > 0 || rate(row.unitPrice) > 0;
}

/** An unset price column is not free — it is a column this SKU is not sold by. */
function rate(value: number | null): number {
  return value ?? 0;
}

function toEntry(model: ListingModel, price: RouterPriceRow): CatalogueEntry {
  return {
    id: model.publicModel,
    name: model.name,
    description: model.description,
    category: model.category,
    provider: model.provider,
    context: model.context,
    pricing: {
      unit: price.unit,
      currency: price.currency,
      inputPerMTok: rate(price.inputPerMTok),
      outputPerMTok: rate(price.outputPerMTok),
      cacheReadPerMTok: rate(price.cacheReadPerMTok),
      cacheWritePerMTok: rate(price.cacheWritePerMTok),
      unitPrice: rate(price.unitPrice),
    },
  };
}

export async function GET() {
  try {
    const [{ models, source, inventoryOk, inventorySources }, priceRows] = await Promise.all([
      getListingCatalog(),
      new RouterBillingRepository(getSystemDb()).listPublishedPrices(),
    ]);

    const prices = new Map(priceRows.filter(hasRate).map((row) => [row.modelName, row]));
    const sellable = models.filter((model) => model.sellable);

    const data: CatalogueEntry[] = [];
    for (const model of sellable) {
      const price = prices.get(model.publicModel);
      if (price) data.push(toEntry(model, price));
    }

    return Response.json(
      {
        object: "list",
        data,
        supply: {
          ok: inventoryOk,
          sources: inventorySources,
          source,
          listed: models.length,
          sellable: sellable.length,
          priced: data.length,
        },
      },
      {
        headers: {
          "cache-control": "public, max-age=60, stale-while-revalidate=300",
          "access-control-allow-origin": "*",
        },
      },
    );
  } catch (error) {
    logger.error("[router] catalogue unavailable", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      {
        object: "list",
        data: [],
        supply: { ok: false, sources: [], listed: 0, sellable: 0, priced: 0 },
      },
      // Never 502: Cloudflare would replace this body with its own error page.
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
