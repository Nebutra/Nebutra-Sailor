"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import type * as React from "react";
import { type MouseEvent as ReactMouseEvent, useState } from "react";
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
  color = "#262626",
  className,
  ...props
}: CardSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const [isHovering, setIsHovering] = useState(false);
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  return (
    <div
      className={cn(
        "group/spotlight p-10 rounded-[var(--radius-md)] relative border bg-card",
        className,
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute z-0 -inset-px rounded-[var(--radius-md)] opacity-0 transition duration-300 group-hover/spotlight:opacity-100"
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
        {isHovering && (
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
