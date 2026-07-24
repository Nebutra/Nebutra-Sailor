import { ModelsCatalog } from "@/components/models-catalog";
import { getListingCatalog } from "@/lib/listing-catalog";

export const metadata = { title: "API 集市" };
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

/** 对应 302 /product/list?cate=api&tag=&brand= */
export default async function ModelsPage({ searchParams }: Props) {
  const { q, brand, tag, sort } = await searchParams;
  const { models, fetchedNote, source, inventoryOk, inventorySources } = await getListingCatalog();
  const inv = inventoryOk ? `库存 ${inventorySources.join(", ") || "—"}` : "库存未连通";
  const note = `${fetchedNote} · ${inv} · ${source}`;

  return (
    <ModelsCatalog
      models={models}
      sourceNote={note}
      initialQuery={q?.trim() ?? ""}
      {...(brand ? { initialBrand: brand } : {})}
      {...(tag ? { initialTag: tag } : {})}
      {...(sort ? { initialSort: sort } : {})}
    />
  );
}
