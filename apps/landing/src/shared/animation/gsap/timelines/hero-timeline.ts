"use client";

import { createMarketingTimeline, marketingMotion } from "../helpers/runtime";

export function createHeroTimeline(root: Element) {
  const timeline = createMarketingTimeline();
  const eyebrow = root.querySelectorAll("[data-gsap-hero='eyebrow']");
  const title = root.querySelectorAll("[data-gsap-hero='title']");
  const copy = root.querySelectorAll("[data-gsap-hero='copy']");
  const actions = root.querySelectorAll("[data-gsap-hero='action']");
  const visual = root.querySelectorAll("[data-gsap-hero='visual']");

  timeline
    .from(eyebrow, { autoAlpha: 0, y: 8, duration: marketingMotion.duration.quick }, 0)
    .from(title, { autoAlpha: 0, y: 18, duration: marketingMotion.duration.standard }, 0.08)
    .from(copy, { autoAlpha: 0, y: 12, duration: marketingMotion.duration.standard }, 0.18)
    .from(actions, { autoAlpha: 0, y: 10, stagger: marketingMotion.stagger.tight }, 0.28)
    .from(visual, { autoAlpha: 0, y: 24, scale: 0.98 }, 0.18);

  return timeline;
}
