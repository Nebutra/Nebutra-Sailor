"use client";

import { createMarketingTimeline, marketingMotion } from "../helpers/runtime";

export function createFeatureTimeline(root: Element) {
  const timeline = createMarketingTimeline();
  const features = root.querySelectorAll("[data-gsap-feature]");

  timeline.fromTo(
    features,
    { autoAlpha: 0, y: 20, scale: 0.98 },
    {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      stagger: marketingMotion.stagger.standard,
      duration: marketingMotion.duration.standard,
    },
  );

  return timeline;
}
