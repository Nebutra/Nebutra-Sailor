"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";

export interface GridFeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Feature icon */
  icon: LucideIcon;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Grid pattern size */
  gridSize?: number;
}

/**
 * GridFeatureCard - Feature card with decorative grid pattern background
 *
 * Displays a feature with icon, title, description and a decorative
 * grid pattern overlay. Used in feature grids and lists.
 */
export function GridFeatureCard({
  icon: Icon,
  title,
  description,
  gridSize = 20,
  className,
  ...props
}: GridFeatureCardProps) {
  const pattern = React.useMemo(() => generateRandomPattern(5), []);

  return (
    <div className={cn("relative overflow-hidden p-6", className)} {...props}>
      <DecorativeGridOverlay size={gridSize} pattern={pattern} />
      <Icon className="size-6 text-foreground/75" strokeWidth={1} aria-hidden />
      <h3 className="mt-10 text-sm md:text-base">{title}</h3>
      <p className="relative z-20 mt-2 text-xs font-light text-muted-foreground">{description}</p>
    </div>
  );
}

GridFeatureCard.displayName = "GridFeatureCard";

/** Decorative grid overlay for the card */
function DecorativeGridOverlay({ size = 20, pattern }: { size?: number; pattern: number[][] }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/[0.01] opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
        <GridPatternSvg
          width={size}
          height={size}
          x="-12"
          y="4"
          squares={pattern}
          className="absolute inset-0 h-full w-full fill-foreground/5 stroke-foreground/25 mix-blend-overlay"
        />
      </div>
    </div>
  );
}

interface GridPatternSvgProps extends React.SVGProps<SVGSVGElement> {
  width: number;
  height: number;
  x: string;
  y: string;
  squares?: number[][];
}

/** SVG grid pattern */
function GridPatternSvg({ width, height, x, y, squares, ...props }: GridPatternSvgProps) {
  const patternId = React.useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares && (
        <svg aria-hidden="true" x={x} y={y} className="overflow-visible">
          {squares.map(([squareX, squareY], index) => (
            <rect
              key={index}
              strokeWidth="0"
              width={width + 1}
              height={height + 1}
              x={(squareX ?? 0) * width}
              y={(squareY ?? 0) * height}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

/** Generate random grid pattern */
function generateRandomPattern(length: number): number[][] {
  return Array.from({ length }, () => [
    Math.floor(Math.random() * 4) + 7,
    Math.floor(Math.random() * 6) + 1,
  ]);
}
