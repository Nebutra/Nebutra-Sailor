"use client";

/**
 * The marketing site's entrance primitives, kept inside the GSAP layer.
 *
 * verify-animation-governance requires every file that touches GSAP to live
 * here, and it is right to: this is the one place that knows how motion is
 * driven, so a component asking for "fade this in when it arrives" cannot also
 * decide what "drive" means. AnimateIn, SlidingIndicator and Presence were each
 * reaching for `marketingGsap` themselves until 2026-08-17.
 */

import { type RefObject, useLayoutEffect, useRef } from "react";
import {
  marketingGsap,
  prefersReducedMarketingMotion,
  registerMarketingGsap,
} from "../helpers/runtime";

/**
 * Run `build` once against the node, cleaned up on unmount.
 *
 * `inView` waits on an IntersectionObserver rather than ScrollTrigger.
 * ScrollTrigger measures globally and re-derives on refresh; in a production
 * build, where sections mount from dynamic imports after it has measured, four
 * capability cards were left at visibility:hidden and never revealed. An
 * observer attached to the element cannot disagree about where that element is.
 *
 * The deadline is the second guard: if the entrance has not run by then the
 * element is shown as-is. A failed animation should cost the animation, never
 * the content.
 */
export function useGsapEntrance<T extends HTMLElement>(
  build: (node: T) => void,
  deps: unknown[],
  { inView = false }: { inView?: boolean } = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMarketingMotion()) return;
    registerMarketingGsap();

    let context: gsap.Context | undefined;
    let observer: IntersectionObserver | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let done = false;

    const run = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      clearTimeout(deadline);
      context = marketingGsap.context(() => build(node), node);
    };

    if (inView) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) run();
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      observer.observe(node);
      deadline = setTimeout(() => {
        if (done) return;
        done = true;
        observer?.disconnect();
        marketingGsap.set(node, { autoAlpha: 1, clearProps: "transform,filter" });
      }, 5000);
    } else {
      run();
    }

    return () => {
      observer?.disconnect();
      clearTimeout(deadline);
      context?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** A tween of arbitrary vars from a from-state, for a one-off entrance. */
export function gsapFrom(node: Element | Element[], vars: gsap.TweenVars): void {
  marketingGsap.from(node, vars);
}

/** Move an element to a measured box. Used by the sliding indicator. */
export function gsapMoveTo(
  node: Element,
  to: gsap.TweenVars,
  { animate }: { animate: boolean },
): void {
  if (!animate || prefersReducedMarketingMotion()) {
    marketingGsap.set(node, to);
    return;
  }
  registerMarketingGsap();
  marketingGsap.to(node, { ...to, duration: 0.32, ease: "power3.out", overwrite: true });
}

/** Enter/exit for a node held mounted across its own removal. */
export function gsapPresence(
  node: Element,
  vars: gsap.TweenVars,
  { entering, duration, onExited }: { entering: boolean; duration: number; onExited?: () => void },
): void {
  const reduced = prefersReducedMarketingMotion();
  if (entering) {
    if (reduced) {
      marketingGsap.set(node, { autoAlpha: 1, clearProps: "transform" });
      return;
    }
    registerMarketingGsap();
    marketingGsap.from(node, { ...vars, duration, ease: "expo.out", overwrite: true });
    return;
  }
  if (reduced) {
    onExited?.();
    return;
  }
  registerMarketingGsap();
  marketingGsap.to(node, {
    ...vars,
    duration: duration * 0.8,
    ease: "power2.in",
    overwrite: true,
    onComplete: onExited,
  });
}

export { prefersReducedMarketingMotion };
