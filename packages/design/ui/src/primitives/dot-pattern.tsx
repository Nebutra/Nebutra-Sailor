"use client";

import { motion } from "motion/react";
import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

export interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  /** Horizontal spacing between dots (default: 16) */
  width?: number;
  /** Vertical spacing between dots (default: 16) */
  height?: number;
  /** X-offset of the entire pattern */
  x?: number;
  /** Y-offset of the entire pattern */
  y?: number;
  /** X-offset of individual dots (default: 1) */
  cx?: number;
  /** Y-offset of individual dots (default: 1) */
  cy?: number;
  /** Radius of each dot (default: 1) */
  cr?: number;
  /** Additional CSS classes */
  className?: string;
  /** Enable glowing animation effect */
  glow?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DotPattern - SVG dot pattern background
 *
 * @description
 * Creates an animated or static dot pattern background using SVG.
 * The pattern automatically adjusts to fill its container.
 * Supports optional glowing animation effect.
 *
 * @example Basic usage
 * ```tsx
 * <div className="relative h-[500px] w-full overflow-hidden">
 *   <DotPattern />
 * </div>
 * ```
 *
 * @example With glow effect
 * ```tsx
 * <div className="relative h-[500px] w-full overflow-hidden">
 *   <DotPattern glow className="text-primary/50" />
 * </div>
 * ```
 *
 * @example Custom spacing and size
 * ```tsx
 * <DotPattern
 *   width={20}
 *   height={20}
 *   cr={1.5}
 *   className="text-muted-foreground/30"
 * />
 * ```
 *
 * @example With linear gradient mask
 * ```tsx
 * <DotPattern
 *   className={cn(
 *     "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)]"
 *   )}
 * />
 * ```
 */
export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const dots = React.useMemo(() => {
    const cols = Math.ceil(dimensions.width / width);
    const rows = Math.ceil(dimensions.height / height);
    const count = cols * rows;

    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: col * width + cx + x,
        y: row * height + cy + y,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      };
    });
  }, [dimensions.width, dimensions.height, width, height, cx, cy, x, y]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-foreground/20",
        className,
      )}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-gradient`}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((dot) => (
        <motion.circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={cr}
          fill={glow ? `url(#${id}-gradient)` : "currentColor"}
          {...(glow
            ? {
                initial: { opacity: 0.4, scale: 1 },
                animate: { opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1] },
                transition: {
                  duration: dot.duration,
                  repeat: Infinity,
                  repeatType: "reverse" as const,
                  delay: dot.delay,
                  ease: "easeInOut",
                },
              }
            : {})}
        />
      ))}
    </svg>
  );
}
