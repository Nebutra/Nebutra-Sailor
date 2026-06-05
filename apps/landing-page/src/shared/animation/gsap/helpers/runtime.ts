"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const MARKETING_MOTION_QUERIES = {
  reduce: "(prefers-reduced-motion: reduce)",
  finePointer: "(pointer: fine)",
  desktop: "(min-width: 1024px)",
  wide: "(min-width: 1440px)",
} as const;

export const MARKETING_GSAP_SELECTORS = {
  root: "[data-marketing-motion-root]",
  hero: "[data-gsap-hero]",
  reveal: "[data-gsap-reveal]",
  feature: "[data-gsap-feature]",
  showcase: "[data-gsap-showcase]",
  parallax: "[data-gsap-parallax]",
  pin: "[data-gsap-pin]",
  scrub: "[data-gsap-scrub]",
} as const;

export const marketingMotion = {
  duration: {
    micro: 0.16,
    quick: 0.32,
    standard: 0.72,
    narrative: 1.2,
  },
  ease: {
    entrance: "power3.out",
    exit: "power2.in",
    narrative: "power3.inOut",
    linear: "none",
  },
  stagger: {
    tight: 0.04,
    standard: 0.08,
    editorial: 0.14,
  },
  scroll: {
    revealStart: "top 82%",
    narrativeStart: "top top",
    narrativeEnd: "+=140%",
    scrub: 0.8,
  },
} as const;

export type MarketingAnimationScope = { current: Element | null } | Element | string;

let isRegistered = false;

export function registerMarketingGsap() {
  if (isRegistered) return;

  gsap.registerPlugin(useGSAP, ScrollTrigger);
  gsap.config({
    nullTargetWarn: process.env.NODE_ENV !== "production",
  });
  gsap.defaults({
    duration: marketingMotion.duration.standard,
    ease: marketingMotion.ease.entrance,
    overwrite: "auto",
  });
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });
  ScrollTrigger.defaults({
    markers: false,
  });

  isRegistered = true;
}

export function prefersReducedMarketingMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia(MARKETING_MOTION_QUERIES.reduce).matches;
}

export function resolveMarketingAnimationScope(scope?: MarketingAnimationScope) {
  if (typeof window === "undefined" || !scope) return null;
  if (typeof scope === "string") return document.querySelector(scope);
  if ("current" in scope) return scope.current;
  return scope;
}

export function createMarketingTimeline(vars: gsap.TimelineVars = {}) {
  registerMarketingGsap();

  return gsap.timeline({
    ...vars,
    defaults: {
      duration: marketingMotion.duration.standard,
      ease: marketingMotion.ease.entrance,
      ...vars.defaults,
    },
  });
}

export function createMarketingMatchMedia(scope?: Element | string) {
  registerMarketingGsap();
  return gsap.matchMedia(scope);
}

export function refreshMarketingScrollMotion() {
  if (typeof window === "undefined") return;
  registerMarketingGsap();
  ScrollTrigger.refresh();
}

export function killMarketingScrollMotion(scope?: Element) {
  registerMarketingGsap();

  for (const trigger of ScrollTrigger.getAll()) {
    const triggerElement = trigger.trigger;

    if (!scope || (triggerElement instanceof Element && scope.contains(triggerElement))) {
      trigger.kill();
    }
  }
}

export { gsap as marketingGsap, ScrollTrigger, useGSAP };
