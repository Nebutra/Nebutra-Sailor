"use client";

import DottedMap from "dotted-map";
import type * as React from "react";
import { cn } from "../utils/cn";

// Pre-generate map points (diagonal grid, height 55)
const map = new DottedMap({ height: 55, grid: "diagonal" });
const mapPoints = map.getPoints();

export interface DottedWorldMapProps extends React.SVGProps<SVGSVGElement> {
  /** Dot radius */
  dotRadius?: number;
  /** Dot color (CSS color or variable) */
  dotColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Additional className */
  className?: string;
}

/**
 * DottedWorldMap - SVG world map with dotted pattern
 *
 * A decorative world map component using a dotted grid pattern.
 * Useful for showing global presence or location-based features.
 *
 * @example
 * ```tsx
 * <DottedWorldMap className="w-full" dotColor="currentColor" />
 * ```
 */
export function DottedWorldMap({
  dotRadius = 0.15,
  dotColor = "currentColor",
  backgroundColor = "var(--color-background)",
  className,
  ...props
}: DottedWorldMapProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 60"
      className={cn("w-full", className)}
      style={{ background: backgroundColor }}
      {...props}
    >
      {mapPoints.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={dotRadius} fill={dotColor} />
      ))}
    </svg>
  );
}

DottedWorldMap.displayName = "DottedWorldMap";
