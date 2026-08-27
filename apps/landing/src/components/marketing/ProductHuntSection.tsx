"use client";

import { ProductHuntBadge, ProductHuntUpvoteBadge, SocialProofBar } from "@nebutra/marketing";

interface ProductHuntSectionProps {
  postSlug: string;
  stats?: SocialProofStats;
  className?: string;
}

interface SocialProofStats {
  users?: number;
  rating?: number;
  productHuntUpvotes?: number;
}

/**
 * Product Hunt promotion section for landing page
 */
export function ProductHuntSection({ postSlug, stats, className }: ProductHuntSectionProps) {
  const defaultStats: SocialProofStats = {
    users: 1000,
    rating: 4.9,
    productHuntUpvotes: 500,
    ...stats,
  };

  return (
    <section className={className}>
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        {/* Social Proof Stats */}
        <SocialProofBar stats={defaultStats} variant="badges" animated className="mb-8" />

        {/* Product Hunt Badges */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <ProductHuntBadge
            postSlug={postSlug}
            theme="light"
            size="large"
            altText="Nebutra on Product Hunt"
            className=""
          />
          <ProductHuntUpvoteBadge postSlug={postSlug} theme="light" size="medium" className="" />
        </div>
      </div>
    </section>
  );
}

export default ProductHuntSection;
