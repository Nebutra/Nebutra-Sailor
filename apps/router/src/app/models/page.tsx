import { getTranslations } from "next-intl/server";
import { ModelsCatalog } from "@/components/models-catalog";
import { getPricedListingCatalog } from "@/lib/shelf-prices";

export async function generateMetadata() {
  const t = await getTranslations("shelf.catalog");
  return { title: t("title") };
}
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    brand?: string;
    tag?: string;
    cate?: string;
    sort?: string;
  }>;
};

/** /models?tag=&brand=&q=&sort= — filtered on the server. */
export default async function ModelsPage({ searchParams }: Props) {
  const { q, brand, tag, sort } = await searchParams;
  // Supply provenance is operator information (admin supply desk), not shelf copy.
  const { models } = await getPricedListingCatalog();

  return (
    <ModelsCatalog
      models={models}
      initialQuery={q?.trim() ?? ""}
      {...(brand ? { initialBrand: brand } : {})}
      {...(tag ? { initialTag: tag } : {})}
      {...(sort ? { initialSort: sort } : {})}
    />
  );
}
