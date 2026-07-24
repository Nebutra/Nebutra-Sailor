"use client";

import { marketingGsap, marketingMotion, ScrollTrigger } from "../helpers/runtime";

export function createScrollRevealTimeline(root: Element) {
  const targets = root.querySelectorAll("[data-gsap-reveal]");

  return ScrollTrigger.batch(targets, {
    interval: 0.08,
    start: marketingMotion.scroll.revealStart,
    once: true,
    onEnter: (elements) => {
      marketingGsap.fromTo(
        elements,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: marketingMotion.duration.standard,
          ease: marketingMotion.ease.entrance,
          stagger: marketingMotion.stagger.standard,
        },
      );
    },
  });
}
