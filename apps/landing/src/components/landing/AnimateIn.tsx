"use client";

/**
 * Entrance animation for the marketing site, driven by GSAP.
 *
 * The props are unchanged on purpose. This component is the seam between one
 * hundred and ninety-five call sites and whatever actually moves them, so
 * swapping the engine is one file rather than a hundred and ninety-five edits.
 *
 * It used to be framer-motion, while apps/landing/src/shared/animation/gsap
 * held a complete GSAP layer with no callers at all — two motion systems, one
 * of them shipping and the other only weighing. This is the same brand motion
 * language, expressed once.
 *
 * Two behaviours are load-bearing and preserved:
 *
 *   • Reduced motion returns a plain div. No GSAP is touched, nothing is
 *     hidden, and there is nothing to fail.
 *   • Nothing is hidden server-side. framer wrote `opacity: 0` into the SSR
 *     markup, which is why the hero's h1 carries a comment about being
 *     disqualified from LCP attribution — and why a JS failure left the page
 *     blank rather than static. The from-state is set in a layout effect, so
 *     the browser has painted real content before anything moves and a failure
 *     to load GSAP leaves a settled page instead of an invisible one.
 */

import type * as React from "react";
import { useLayoutEffect, useRef } from "react";
import {
  marketingGsap,
  prefersReducedMarketingMotion,
  registerMarketingGsap,
  ScrollTrigger,
} from "@/shared/animation/gsap";

/** The brand motion language, as GSAP from-vars. Mirrors @nebutra/brand's
 *  emerge / flow signatures rather than restating them by feel. */
const PRESETS = {
  emerge: { from: { autoAlpha: 0, y: 16, filter: "blur(6px)" }, duration: 0.5, ease: "expo.out" },
  flow: { from: { autoAlpha: 0, x: -20 }, duration: 0.3, ease: "power3.out" },
  fade: { from: { autoAlpha: 0 }, duration: 0.3, ease: "power2.out" },
  fadeUp: { from: { autoAlpha: 0, y: 16 }, duration: 0.4, ease: "expo.out" },
  scale: { from: { autoAlpha: 0, scale: 0.95 }, duration: 0.4, ease: "expo.out" },
} as const;

type Preset = keyof typeof PRESETS;

const STAGGER = { fast: 0.05, normal: 0.1, slow: 0.2 } as const;

/**
 * Kept as an export because the marketing layout mounts it. It no longer needs
 * to provide anything — GSAP registers itself on first use — so it is a
 * passthrough rather than a provider, and deleting it would be a second change
 * in a different app for no gain.
 */
export function MarketingMotionProvider({ children }: { children: React.ReactNode }) {
  return children;
}

/** Shared plumbing: run `build` once against the node, cleaned up on unmount. */
function useEntrance(build: (node: HTMLElement) => (() => void) | undefined, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMarketingMotion()) return;
    registerMarketingGsap();
    const context = marketingGsap.context(() => build(node), node);
    return () => context.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

export interface AnimateInProps {
  children: React.ReactNode;
  preset?: Preset;
  delay?: number;
  duration?: number;
  inView?: boolean;
  className?: string;
}

export function AnimateIn({
  children,
  preset = "emerge",
  delay = 0,
  duration,
  inView = false,
  className,
}: AnimateInProps) {
  const spec = PRESETS[preset];
  const ref = useEntrance(
    (node) => {
      marketingGsap.from(node, {
        ...spec.from,
        duration: duration ?? spec.duration,
        ease: spec.ease,
        delay,
        ...(inView ? { scrollTrigger: { trigger: node, start: "top 90%", once: true } } : {}),
      });
      return undefined;
    },
    [preset, delay, duration, inView],
  );

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}

export interface AnimateInGroupProps {
  children: React.ReactNode;
  stagger?: keyof typeof STAGGER;
  inView?: boolean;
  className?: string;
}

export function AnimateInGroup({
  children,
  stagger = "normal",
  inView = false,
  className,
}: AnimateInGroupProps) {
  const ref = useEntrance(
    (node) => {
      // Direct children only: a group staggers the row it wraps, and its
      // children are frequently AnimateIn themselves, which run their own.
      const targets = Array.from(node.children);
      if (targets.length === 0) return undefined;
      marketingGsap.from(targets, {
        autoAlpha: 0,
        y: 16,
        duration: 0.4,
        ease: "expo.out",
        stagger: STAGGER[stagger],
        ...(inView ? { scrollTrigger: { trigger: node, start: "top 90%", once: true } } : {}),
      });
      return undefined;
    },
    [stagger, inView],
  );

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}

export { ScrollTrigger };
