"use client";

/**
 * The highlight that moves between the selected item in a set.
 *
 * Three places drew this with framer's `layoutId` — the demo section's step
 * node, the workspace role switch, the use-case tab glow. layoutId re-parents
 * one element and lets framer FLIP it, which is a lot of machinery for a shape
 * that only ever slides along a row.
 *
 * This keeps a single absolutely-positioned element in the container and tweens
 * it to wherever the active item is. No re-parenting, so nothing needs to
 * reconcile across trees, and the indicator cannot briefly exist twice the way
 * a shared layout id can when two lists mount at once.
 *
 * The active item marks itself with `data-indicator-target`; the container is
 * whatever this renders into, so it must be positioned.
 */

import { useLayoutEffect, useRef } from "react";
import { gsapMoveTo } from "@/shared/animation/gsap";

export interface SlidingIndicatorProps {
  /** Changes when the selection does — that is what re-runs the measurement. */
  activeKey: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function SlidingIndicator({ activeKey, className, style }: SlidingIndicatorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    const container = node?.parentElement;
    if (!node || !container) return;

    const target = container.querySelector<HTMLElement>("[data-indicator-target]");
    if (!target) return;

    const c = container.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const to = {
      x: t.left - c.left,
      y: t.top - c.top,
      width: t.width,
      height: t.height,
    };

    // First paint lands the indicator without a slide: there is nowhere for it
    // to have come from, and an indicator that flies in from the corner on load
    // reads as a glitch.
    if (!node.dataset.placed) {
      node.dataset.placed = "true";
      gsapMoveTo(node, { ...to, autoAlpha: 1 }, { animate: false });
      return;
    }
    gsapMoveTo(node, to, { animate: true });
  }, [activeKey]);

  return (
    <div
      aria-hidden="true"
      className={className}
      ref={ref}
      style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", ...style }}
    />
  );
}
