import { getTranslations } from "next-intl/server";
import { type CatalogParams, ModelsCatalog } from "@/components/models-catalog";
import { getPricedListingCatalog } from "@/lib/shelf-prices";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("shelf.catalog");
  return { title: t("title") };
}

type Props = { searchParams: Promise<CatalogParams> };

/** /models?tag=&brand=&ctx=&price=&q=&sort=&view= — filtered on the server. */
export default async function ModelsPage({ searchParams }: Props) {
  const params = await searchParams;
  // Supply provenance is operator information (admin supply desk), not shelf copy.
  const { models } = await getPricedListingCatalog();
  return <ModelsCatalog models={models} params={params} />;
}
