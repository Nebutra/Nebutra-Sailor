import { brand } from "@nebutra/brand/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { PROVIDER_LABEL, resolveListingProvider } from "@/lib/listing-catalog";
import { getPricedModelBySlug, getPricedRelatedListings } from "@/lib/shelf-prices";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = await getPricedModelBySlug(slug);
  if (!model) {
    return { title: "模型详情" };
  }
  const provider = PROVIDER_LABEL[resolveListingProvider(model)];
  return {
    title: `${model.publicModel} · API 价格与文档`,
    description: `${provider} ${model.publicModel} — ${brand.name} Router 可售货架详情、价格与接入说明。`,
  };
}

/**
 * 对齐 302: /product/detail/{model-id}
 * 例: /product/detail/gemini-3.5-flash
 */
export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const model = await getPricedModelBySlug(slug);
  if (!model) notFound();

  const related = await getPricedRelatedListings(model, 8);

  return <ProductDetail model={model} related={related} />;
}
