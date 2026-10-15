import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { Suspense } from "react";
import { MarketHome } from "@/components/market-home";
import { HomeSkeleton } from "@/components/shelf-skeleton";
import { getBaseUrlHint } from "@/lib/model-routes";
import { getPricedListingCatalog } from "@/lib/shelf-prices";

export const dynamic = "force-dynamic";

async function Shelf() {
  // Supply provenance (inventory source, cache age) is operator information:
  // it lives on the admin supply desk, not on the public shelf.
  const { models } = await getPricedListingCatalog();
  return (
    <MarketHome models={models} baseUrl={getBaseUrlHint()} sampleModel={DEFAULT_PUBLIC_MODEL} />
  );
}

/**
 * Public home. The shell paints at once; the shelf streams into a skeleton of
 * its own shape (the root loading.tsx spinner is sized for console pages).
 */
export default function MarketHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Shelf />
    </Suspense>
  );
}
