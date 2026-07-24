"use client";

import { type MarketingAnimationScope, resolveMarketingAnimationScope } from "../helpers/runtime";
import { createHeroTimeline } from "../timelines/hero-timeline";
import { useMarketingGsap } from "./use-landing-gsap";

export function useHeroAnimation(scope: MarketingAnimationScope, dependencies: unknown[] = []) {
  return useMarketingGsap(
    () => {
      const root = resolveMarketingAnimationScope(scope);
      if (!root) return undefined;
      createHeroTimeline(root);
      return undefined;
    },
    { dependencies, scope },
  );
}
