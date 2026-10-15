import { brand } from "@nebutra/brand/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductDetail } from "@/components/product-detail";
import { PROVIDER_LABEL, resolveListingProvider } from "@/lib/listing-catalog";
import { getBaseUrlHint } from "@/lib/model-routes";
import { getPricedModelBySlug, getPricedRelatedListings } from "@/lib/shelf-prices";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [model, t] = await Promise.all([getPricedModelBySlug(slug), getTranslations("detail")]);
  if (!model) {
    return { title: t("metaFallback") };
  }
  const provider = PROVIDER_LABEL[resolveListingProvider(model)];
  return {
    title: t("metaTitle", { model: model.publicModel }),
    description: t("metaDescription", {
      provider,
      model: model.publicModel,
      brandName: brand.name,
    }),
  };
}

/**
 * /product/detail/{model-id}, e.g. /product/detail/gemini-3.5-flash
 */
export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const model = await getPricedModelBySlug(slug);
  if (!model) notFound();

  const related = await getPricedRelatedListings(model, 8);

  return <ProductDetail model={model} related={related} baseUrl={getBaseUrlHint()} />;
}
