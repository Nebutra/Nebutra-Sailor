"use client";

import { type MarketingAnimationScope, resolveMarketingAnimationScope } from "../helpers/runtime";
import { createScrollRevealTimeline } from "../timelines/scroll-timeline";
import { useMarketingGsap } from "./use-landing-gsap";

export function useScrollReveal(scope: MarketingAnimationScope, dependencies: unknown[] = []) {
  return useMarketingGsap(
    () => {
      const root = resolveMarketingAnimationScope(scope);
      if (!root) return undefined;
      createScrollRevealTimeline(root);
      return undefined;
    },
    { dependencies, scope },
  );
}
