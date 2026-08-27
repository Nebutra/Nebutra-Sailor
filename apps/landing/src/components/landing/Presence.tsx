"use client";

/**
 * Keeps children mounted long enough to animate out.
 *
 * React removes a node the moment its condition goes false, so an exit
 * animation has nothing left to animate — which is the entire reason
 * AnimatePresence exists. This does the same job in about forty lines: hold the
 * node, play the exit tween, then let it go.
 *
 * Deliberately narrower than AnimatePresence. There is no `mode`, no key-based
 * swapping and no layout coordination, because the two callers left on this
 * site need one thing: a panel that fades out before it disappears.
 */

import type * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsapPresence } from "@/shared/animation/gsap";

export interface PresenceProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  /** From-vars for the entrance; the exit plays the same shape in reverse. */
  from?: gsap.TweenVars;
  duration?: number;
}

export function Presence({
  show,
  children,
  className,
  from = { autoAlpha: 0, y: -20 },
  duration = 0.28,
}: PresenceProps) {
  const [mounted, setMounted] = useState(show);
  const ref = useRef<HTMLDivElement>(null);
  const wasShown = useRef(show);

  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (show) {
      if (wasShown.current && mounted) return;
      wasShown.current = true;
      gsapPresence(node, from, { entering: true, duration });
      return;
    }

    if (!wasShown.current) return;
    wasShown.current = false;
    gsapPresence(node, from, {
      entering: false,
      duration,
      onExited: () => setMounted(false),
    });
  }, [show, mounted, duration, from]);

  if (!mounted) return null;

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
