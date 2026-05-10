"use client";

import { motion, type Transition } from "framer-motion";
import { cn } from "../utils/cn";

export interface BorderTrailProps {
  /** Additional className for the trail element */
  className?: string;
  /** Size of the trail element in pixels */
  size?: number;
  /** Custom framer-motion transition */
  transition?: Transition;
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
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: "linear" as const,
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn("absolute aspect-square bg-muted", className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            ...style,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
        }
        animate={{
          offsetDistance: ["0%", "100%"],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          ...(delay !== undefined ? { delay } : {}),
        }}
        {...(onAnimationComplete ? { onAnimationComplete } : {})}
      />
    </div>
  );
}
