"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

export interface DotMatrixProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Dot size in pixels (default: 2) */
  dotSize?: number;
  /** Gap between dots in pixels (default: 16) */
  gap?: number;
  /**
   * Dot color. Accepts any valid CSS color value.
   * - Use "currentColor" to inherit text color (default)
   * - Use CSS variables: "hsl(var(--border))" for theme compatibility
   */
  color?: string;
  /** Opacity 0-1 (default: 0.04) */
  opacity?: number;
}

/**
 * DotMatrix - A subtle dot grid background pattern.
 *
 * Creates a minimal, high-density dot pattern that adds texture
 * without cognitive load. Ideal for hero sections and CTAs.
 *
 * @example
 * // Using currentColor (inherits text color)
 * <DotMatrix opacity={0.04} />
 *
 * @example
 * // Using semantic CSS variables
 * <DotMatrix color="hsl(var(--border))" opacity={0.06} />
 */
export const DotMatrix = React.forwardRef<HTMLDivElement, DotMatrixProps>(
  ({ dotSize = 2, gap = 16, color = "currentColor", opacity = 0.04, className, ...props }, ref) => {
    const patternSize = dotSize + gap;

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 pointer-events-none", className)}
        style={{
          backgroundImage: `radial-gradient(circle, ${color} ${dotSize / 2}px, transparent ${dotSize / 2}px)`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          backgroundPosition: `${gap / 2}px ${gap / 2}px`,
          opacity,
        }}
        aria-hidden="true"
        {...props}
      />
    );
  },
);

DotMatrix.displayName = "DotMatrix";
