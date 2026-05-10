"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "../../utils/cn";

export interface FloatingSpotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of floating spots (default: 12) */
  count?: number;
  /** Minimum spot size in pixels (default: 40) */
  minSize?: number;
  /** Maximum spot size in pixels (default: 120) */
  maxSize?: number;
  /**
   * Spot color.
   * Use CSS custom properties for theme compatibility:
   * - "hsl(var(--accent))" for accent color
   * - "hsl(var(--primary))" for primary brand color
   */
  color?: string;
  /** Minimum opacity 0-1 (default: 0.05) */
  minOpacity?: number;
  /** Maximum opacity 0-1 (default: 0.15) */
  maxOpacity?: number;
  /** Animation cycle duration in seconds (default: 20) */
  cycleDuration?: number;
  /** Blur amount in pixels (default: 40) */
  blur?: number;
}

interface Spot {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

/**
 * FloatingSpots - Animated floating light spots for ambient depth.
 *
 * Creates softly glowing, slowly drifting light spots that add
 * atmospheric depth to sections. Uses subtle blur for ethereal effect.
 *
 * @example
 * // Using semantic CSS variables (recommended)
 * <FloatingSpots color="hsl(var(--accent))" />
 *
 * @example
 * // Using custom hex colors (for decorative/artistic purposes)
 * <FloatingSpots color="#0BF1C3" />
 */
export const FloatingSpots = React.forwardRef<HTMLDivElement, FloatingSpotsProps>(
  (
    {
      count = 12,
      minSize = 40,
      maxSize = 120,
      color = "hsl(var(--accent))",
      minOpacity = 0.05,
      maxOpacity = 0.15,
      cycleDuration = 20,
      blur = 40,
      className,
      ...props
    },
    ref,
  ) => {
    const spots = React.useMemo<Spot[]>(() => {
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: minSize + Math.random() * (maxSize - minSize),
        opacity: minOpacity + Math.random() * (maxOpacity - minOpacity),
        duration: cycleDuration * (0.8 + Math.random() * 0.4),
        delay: Math.random() * -cycleDuration,
        driftX: (Math.random() - 0.5) * 30,
        driftY: (Math.random() - 0.5) * 30,
      }));
    }, [count, minSize, maxSize, minOpacity, maxOpacity, cycleDuration]);

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}
        aria-hidden="true"
        {...props}
      >
        {spots.map((spot) => (
          <motion.div
            key={spot.id}
            className="absolute rounded-full"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: spot.size,
              height: spot.size,
              backgroundColor: color,
              filter: `blur(${blur}px)`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              x: [0, spot.driftX, 0, -spot.driftX / 2, 0],
              y: [0, spot.driftY / 2, spot.driftY, 0],
              opacity: [spot.opacity, spot.opacity * 1.3, spot.opacity],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: spot.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: spot.delay,
            }}
          />
        ))}
      </div>
    );
  },
);

FloatingSpots.displayName = "FloatingSpots";
