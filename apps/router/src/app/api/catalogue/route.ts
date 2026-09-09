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
 * `sellable` is the honest field: a model is on the shelf only when supply
 * inventory confirms the edge can actually serve it, so an empty `data` means
 * the station has nothing to sell and should not take traffic.
 */
interface CatalogueEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  context: string;
  pricing: { inputPerMTok: number; outputPerMTok: number; currency: "USD" };
}

function toEntry(m: ListingModel): CatalogueEntry {
  return {
    id: m.publicModel,
    name: m.name,
    description: m.description,
    category: m.category,
    provider: m.provider,
    context: m.context,
    pricing: {
      inputPerMTok: m.inputPerMTok,
      outputPerMTok: m.outputPerMTok,
      currency: "USD",
    },
  };
}

export async function GET() {
  try {
    const { models, source, inventoryOk, inventorySources } = await getListingCatalog();
    const sellable = models.filter((m) => m.sellable);
    return Response.json(
      {
        object: "list",
        data: sellable.map(toEntry),
        supply: {
          ok: inventoryOk,
          sources: inventorySources,
          source,
          listed: models.length,
          sellable: sellable.length,
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
    return Response.json(
      {
        object: "list",
        data: [],
        supply: {
          ok: false,
          sources: [],
          error: error instanceof Error ? error.message : "catalogue unavailable",
        },
      },
      // Never 502: Cloudflare would replace this body with its own error page.
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
