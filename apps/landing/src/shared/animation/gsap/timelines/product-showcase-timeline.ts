"use client";

import { createMarketingTimeline, marketingMotion } from "../helpers/runtime";

export function createProductShowcaseTimeline(root: Element) {
  const timeline = createMarketingTimeline();
  const panels = root.querySelectorAll("[data-gsap-showcase='panel']");
  const metrics = root.querySelectorAll("[data-gsap-showcase='metric']");
  const paths = root.querySelectorAll("[data-gsap-showcase='path']");

  timeline
    .from(panels, { autoAlpha: 0, y: 18, stagger: marketingMotion.stagger.tight }, 0)
    .from(metrics, { autoAlpha: 0, y: 10, stagger: marketingMotion.stagger.standard }, 0.16)
    .from(
      paths,
      {
        autoAlpha: 0,
        scaleX: 0,
        transformOrigin: "left center",
        stagger: marketingMotion.stagger.tight,
      },
      0.22,
    );

  return timeline;
}
