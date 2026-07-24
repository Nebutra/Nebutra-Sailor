"use client";

/**
 * Type Lens GSAP runtime — follows greensock/gsap-skills:
 * gsap-core · gsap-timeline · gsap-scrolltrigger · gsap-react · gsap-performance
 */
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const TL_MOTION = {
  duration: {
    micro: 0.2,
    quick: 0.4,
    standard: 0.75,
    narrative: 1.15,
  },
  ease: {
    entrance: "power3.out",
    exit: "power2.in",
    soft: "power2.out",
  },
  stagger: {
    tight: 0.05,
    editorial: 0.09,
    gallery: 0.12,
  },
  scroll: {
    /** when card top hits ~82% of viewport */
    reveal: "top 82%",
  },
} as const;

export const TL_SELECTORS = {
  root: "[data-tl-motion-root]",
  mark: "[data-tl-mark]",
  kicker: "[data-tl-kicker]",
  tagline: "[data-tl-tagline]",
  nav: "[data-tl-nav] a",
  search: "[data-tl-search]",
  filter: "[data-tl-filter]",
  card: "[data-tl-card]",
  section: "[data-tl-section]",
  footer: "[data-tl-footer]",
} as const;

let registered = false;

export function registerTypeLensGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  gsap.config({
    // Empty optional chrome (filter bar, etc.) is normal across routes
    nullTargetWarn: false,
  });
  gsap.defaults({
    duration: TL_MOTION.duration.standard,
    ease: TL_MOTION.ease.entrance,
    overwrite: "auto",
  });
  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
  });
  registered = true;
}

export function prefersReducedTypeLensMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function refreshTypeLensScroll() {
  if (typeof window === "undefined") return;
  registerTypeLensGsap();
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger, useGSAP };
