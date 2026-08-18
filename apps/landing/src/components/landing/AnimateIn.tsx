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
import { gsapFrom, useGsapEntrance } from "@/shared/animation/gsap";

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

export interface AnimateInProps {
  children: React.ReactNode;
  preset?: Preset;
  delay?: number;
  duration?: number;
  inView?: boolean;
  className?: string;
  /**
   * Extra from-vars merged over the preset, for the one-off an entrance needs
   * that the five presets do not describe — the invoice card's 3D tilt, for
   * instance. Prefer a preset; this exists so a single unusual entrance does
   * not become a reason to import GSAP into a leaf component.
   */
  from?: Record<string, unknown>;
}

export function AnimateIn({
  children,
  preset = "emerge",
  delay = 0,
  duration,
  inView = false,
  className,
  from,
}: AnimateInProps) {
  const spec = PRESETS[preset];
  const ref = useGsapEntrance<HTMLDivElement>(
    (node) => {
      gsapFrom(node, {
        ...spec.from,
        ...from,
        duration: duration ?? spec.duration,
        ease: spec.ease,
        delay,
      });
    },
    [preset, delay, duration, inView],
    { inView },
  );

  return (
    <div className={className} data-animate-in="" ref={ref}>
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
  const ref = useGsapEntrance<HTMLDivElement>(
    (node) => {
      // Only children that do not animate themselves. A child that is an
      // AnimateIn sets its own from-state, and two tweens each driving
      // autoAlpha on the same element fight: whichever lands second wins, and
      // when that is the hidden one the element never comes back. That is how
      // three cards in the design-system bento stayed at visibility:hidden
      // after everything had scrolled past them.
      const targets = Array.from(node.children).filter(
        (child) => !(child instanceof HTMLElement && child.dataset.animateIn !== undefined),
      );
      if (targets.length === 0) return;
      gsapFrom(targets, {
        autoAlpha: 0,
        y: 16,
        duration: 0.4,
        ease: "expo.out",
        stagger: STAGGER[stagger],
      });
    },
    [stagger, inView],
    { inView },
  );

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
