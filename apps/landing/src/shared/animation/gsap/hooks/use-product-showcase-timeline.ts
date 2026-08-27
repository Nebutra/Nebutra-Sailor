"use client";

import { type MarketingAnimationScope, resolveMarketingAnimationScope } from "../helpers/runtime";
import { createProductShowcaseTimeline } from "../timelines/product-showcase-timeline";
import { useMarketingGsap } from "./use-landing-gsap";

export function useProductShowcaseTimeline(
  scope: MarketingAnimationScope,
  dependencies: unknown[] = [],
) {
  return useMarketingGsap(
    () => {
      const root = resolveMarketingAnimationScope(scope);
      if (!root) return undefined;
      createProductShowcaseTimeline(root);
      return undefined;
    },
    { dependencies, scope },
  );
}
