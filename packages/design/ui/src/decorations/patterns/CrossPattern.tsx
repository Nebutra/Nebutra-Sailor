"use client";

import * as React from "react";
import { cn } from "../../utils/cn";

export interface CrossPatternProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of each cross in pixels (default: 6) */
  crossSize?: number;
  /** Gap between crosses in pixels (default: 32) */
  gap?: number;
  /** Line thickness in pixels (default: 1) */
  strokeWidth?: number;
  /**
   * Cross color. Accepts any valid CSS color value.
   * - Use "currentColor" to inherit text color (default)
   * - Use CSS variables: "hsl(var(--border))" for theme compatibility
   */
  color?: string;
  /** Opacity 0-1 (default: 0.03) */
  opacity?: number;
}

/**
 * CrossPattern - A subtle cross/plus sign background pattern.
 *
 * Creates a technical, grid-like pattern with small crosses.
 * Ideal for feature sections and technical content areas.
 *
 * @example
 * // Using currentColor (inherits text color)
 * <CrossPattern opacity={0.03} />
 *
 * @example
 * // Using semantic CSS variables
 * <CrossPattern color="hsl(var(--muted-foreground))" opacity={0.05} />
 */
export const CrossPattern = React.forwardRef<HTMLDivElement, CrossPatternProps>(
  (
    {
      crossSize = 6,
      gap = 32,
      strokeWidth = 1,
      color = "currentColor",
      opacity = 0.03,
      className,
      ...props
    },
    ref,
  ) => {
    const patternSize = crossSize + gap;
    const halfCross = crossSize / 2;
    const halfStroke = strokeWidth / 2;

    // SVG pattern for crosses
    const svgPattern = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${patternSize}" height="${patternSize}" viewBox="0 0 ${patternSize} ${patternSize}">
      <rect 
        x="${halfCross - halfStroke}" 
        y="0" 
        width="${strokeWidth}" 
        height="${crossSize}" 
        fill="${color}" 
      />
      <rect 
        x="0" 
        y="${halfCross - halfStroke}" 
        width="${crossSize}" 
        height="${strokeWidth}" 
        fill="${color}" 
      />
    </svg>
  `.trim();

    const encodedSvg = encodeURIComponent(svgPattern);

    return (
      <div
        ref={ref}
        className={cn("absolute inset-0 pointer-events-none", className)}
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodedSvg}")`,
          backgroundSize: `${patternSize}px ${patternSize}px`,
          opacity,
        }}
        aria-hidden="true"
        {...props}
      />
    );
  },
);

CrossPattern.displayName = "CrossPattern";
