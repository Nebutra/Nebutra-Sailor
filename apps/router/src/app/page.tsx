import { MarketHome } from "@/components/market-home";
import { getPricedListingCatalog } from "@/lib/shelf-prices";

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
  // Supply provenance (inventory source, cache age) is operator information:
  // it lives on admin.nebutra.com's supply desk, not on the public shelf.
  const { models } = await getPricedListingCatalog();

  return <MarketHome models={models} productType={productType} />;
}
