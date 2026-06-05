"use client";

import type * as React from "react";
import { type MotionStyle, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

type MotionTransition = NonNullable<React.ComponentProps<typeof motion.div>["transition"]>;

export interface BorderTrailProps {
  /** Additional className for the trail element */
  className?: string;
  /** Size of the trail element in pixels */
  size?: number;
  /** Custom framer-motion transition */
  transition?: MotionTransition;
  /** Delay before animation starts */
  delay?: number;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Additional inline styles for the trail element */
  style?: React.CSSProperties;
}

/**
 * BorderTrail - Animated border trail effect component
 *
 * Creates an animated element that travels along the border of its parent container.
 * Parent must have `position: relative` and `border-radius` for proper effect.
 *
 * @example
 * ```tsx
 * <div className="relative rounded-[var(--radius-md)]">
 *   <BorderTrail size={100} />
 *   <Content />
 * </div>
 * ```
 */
export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const shouldReduceMotion = useReducedMotion();
  const trailStyle = {
    width: size,
    offsetDistance: shouldReduceMotion ? "0%" : undefined,
    offsetPath: `rect(0 auto auto 0 round ${size}px)`,
    ...style,
  } as MotionStyle & {
    offsetDistance?: string;
    offsetPath: string;
  };
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: "linear" as const,
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-muted", className)}
        style={trailStyle}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                ...(transition ?? BASE_TRANSITION),
                ...(delay !== undefined ? { delay } : {}),
              }
        }
        {...(onAnimationComplete ? { onAnimationComplete } : {})}
        {...(shouldReduceMotion ? {} : { animate: { offsetDistance: ["0%", "100%"] } })}
      />
    </div>
  );
}
