"use client";

import { type MarketingAnimationScope, resolveMarketingAnimationScope } from "../helpers/runtime";
import { createFeatureTimeline } from "../timelines/feature-timeline";
import { useMarketingGsap } from "./use-landing-gsap";

export function useFeatureTimeline(scope: MarketingAnimationScope, dependencies: unknown[] = []) {
  return useMarketingGsap(
    () => {
      const root = resolveMarketingAnimationScope(scope);
      if (!root) return undefined;
      createFeatureTimeline(root);
      return undefined;
    },
    { dependencies, scope },
  );
}
