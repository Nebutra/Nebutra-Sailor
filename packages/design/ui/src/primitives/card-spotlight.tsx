"use client";

import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "../shared/animation/motion";
import { cn } from "../utils/cn";
import { CanvasRevealEffect } from "./canvas-reveal-effect";

export interface CardSpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spotlight radius in pixels */
  radius?: number;
  /** Spotlight background color */
  color?: string;
  /** Card content */
  children: React.ReactNode;
}

/**
 * CardSpotlight - Card with mouse-tracking spotlight effect
 *
 * A card component that displays a spotlight effect following the mouse cursor,
 * with an optional canvas reveal animation on hover.
 *
 * Requires `three` and `@react-three/fiber` to be installed for the canvas effect.
 *
 * @example
 * ```tsx
 * <CardSpotlight className="h-96 w-96">
 *   <h2 className="text-xl font-bold text-white">Title</h2>
 *   <p className="text-muted-foreground">Description content</p>
 * </CardSpotlight>
 * ```
 */
export function CardSpotlight({
  children,
  radius = 350,
  color = "var(--neutral-7)",
  className,
  ...props
}: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const handlePointerMove = ({ clientX, clientY }: PointerEvent) => {
      const { left, top } = element.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    };

    const handlePointerEnter = () => setIsHovering(true);
    const handlePointerLeave = () => setIsHovering(false);

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerenter", handlePointerEnter);
    element.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerenter", handlePointerEnter);
      element.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "group/spotlight p-10 rounded-[var(--radius-md)] relative border bg-card",
        className,
      )}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute z-0 -inset-px rounded-[var(--radius-md)] opacity-0 transition duration-300 motion-reduce:transition-none group-hover/spotlight:opacity-100"
        style={{
          backgroundColor: color,
          maskImage: useMotionTemplate`
            radial-gradient(
              ${radius}px circle at ${mouseX}px ${mouseY}px,
              white,
              transparent 80%
            )
          `,
        }}
      >
        {isHovering && !shouldReduceMotion && (
          <CanvasRevealEffect
            animationSpeed={5}
            containerClassName="bg-transparent absolute inset-0 pointer-events-none"
            colors={[
              [59, 130, 246],
              [139, 92, 246],
            ]}
            dotSize={3}
          />
        )}
      </motion.div>
      {children}
    </div>
  );
}

CardSpotlight.displayName = "CardSpotlight";
