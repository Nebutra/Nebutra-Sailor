import { MarketHome } from "@/components/market-home";
import { getListingCatalog } from "@/lib/listing-catalog";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ product_type?: string }>;
};

/**
 * 302-style public homepage — API / 应用 集市门面，不是管理后台。
 * 管理请去 /dashboard · 试用请去 /use
 */
export default async function MarketHomePage({ searchParams }: Props) {
  const { product_type } = await searchParams;
  const productType = product_type === "tool" ? "tool" : "api";
  const { models, fetchedNote, source, inventoryOk, inventorySources } = await getListingCatalog();

  const inv = inventoryOk ? `库存 ${inventorySources.join(", ") || "—"}` : "库存未连通";
  const note = `${fetchedNote} · ${inv} · ${source}`;

  return <MarketHome models={models} sourceNote={note} productType={productType} />;
}
