"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

export interface HexGridProps extends React.SVGProps<SVGSVGElement> {
  /** Hex cell radius in pixels (default: 24) */
  size?: number;
  /** Hex stroke/fill color (default: "#0033FE") */
  color?: string;
  /** Hex opacity (default: 0.12) */
  opacity?: number;
  /** Stroke width in pixels (default: 1) */
  strokeWidth?: number;
  /** Enable subtle animated glow effect on individual hexagons (default: false) */
  glow?: boolean;
  /** Fill hexagons instead of just stroke (default: false) */
  filled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Geometry Helpers
// =============================================================================

/**
 * Generate SVG path data for a single flat-top hexagon centered at (cx, cy).
 *
 * Flat-top hex vertices (starting from rightmost, clockwise):
 *   (cx + r,       cy)
 *   (cx + r/2,     cy + h/2)
 *   (cx - r/2,     cy + h/2)
 *   (cx - r,       cy)
 *   (cx - r/2,     cy - h/2)
 *   (cx + r/2,     cy - h/2)
 *
 * where h = r * sqrt(3)
 */
function hexPath(cx: number, cy: number, r: number): string {
  const h = r * Math.sqrt(3);
  const hw = h / 2;
  const hr = r / 2;

  return [
    `M${cx + r},${cy}`,
    `L${cx + hr},${cy + hw}`,
    `L${cx - hr},${cy + hw}`,
    `L${cx - r},${cy}`,
    `L${cx - hr},${cy - hw}`,
    `L${cx + hr},${cy - hw}`,
    "Z",
  ].join(" ");
}

// =============================================================================
// Component
// =============================================================================

/**
 * HexGrid - SVG hexagonal tessellation background
 *
 * @description
 * Renders a flat-top hexagonal grid pattern that fills its container.
 * Derived from Nebutra's hexagonal N logo — the core visual DNA.
 * Supports optional glow animation and filled mode.
 *
 * @example Basic usage
 * ```tsx
 * <div className="relative h-[500px] w-full overflow-hidden">
 *   <HexGrid />
 * </div>
 * ```
 *
 * @example With glow effect
 * ```tsx
 * <div className="relative h-[500px] w-full overflow-hidden">
 *   <HexGrid glow color="#0BF1C3" opacity={0.15} />
 * </div>
 * ```
 *
 * @example Filled hexagons with gradient mask
 * ```tsx
 * <HexGrid
 *   filled
 *   size={32}
 *   className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"
 * />
 * ```
 */
export function HexGrid({
  size = 24,
  color = "#0033FE",
  opacity: hexOpacity = 0.12,
  strokeWidth = 1,
  glow = false,
  filled = false,
  className,
  ...props
}: HexGridProps) {
  const rawId = useId();
  // Sanitize the React useId() output (which often contains colons like ':R1:')
  // so it's safe to use as a CSS class/animation name without CSS.escape() which fails in SSR.
  const id = rawId.replace(/:/g, "");
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

  // Flat-top hexagon geometry
  const hexWidth = size * 2;
  const hexHeight = size * Math.sqrt(3);
  const horizSpacing = hexWidth * 0.75;
  const vertSpacing = hexHeight;

  const hexagons = React.useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];

    // Calculate grid dimensions with extra padding for centering and edge coverage
    const cols = Math.ceil(dimensions.width / horizSpacing) + 2;
    const rows = Math.ceil(dimensions.height / vertSpacing) + 2;

    // Offset to center the pattern
    const totalWidth = (cols - 1) * horizSpacing + hexWidth;
    const totalHeight = (rows - 1) * vertSpacing + hexHeight;
    const offsetX = (dimensions.width - totalWidth) / 2 + size;
    const offsetY = (dimensions.height - totalHeight) / 2 + hexHeight / 2;

    const result: Array<{
      cx: number;
      cy: number;
      path: string;
      delay: number;
      duration: number;
    }> = [];

    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const cx = col * horizSpacing + offsetX;
        // Even columns are offset vertically by half the hex height
        const cy = row * vertSpacing + (col % 2 === 0 ? 0 : vertSpacing / 2) + offsetY;

        result.push({
          cx,
          cy,
          path: hexPath(cx, cy, size),
          delay: Math.random() * 4,
          duration: Math.random() * 2 + 3,
        });
      }
    }

    return result;
  }, [dimensions.width, dimensions.height, size, horizSpacing, vertSpacing, hexWidth, hexHeight]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      {...props}
    >
      {glow && (
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}
      <style>
        {glow
          ? `
          @keyframes hex-glow-${id} {
            0%, 100% { opacity: ${hexOpacity}; }
            50% { opacity: ${Math.min(hexOpacity * 3, 0.6)}; }
          }
        `
          : ""}
      </style>
      {hexagons.map((hex) => (
        <path
          key={`${hex.cx}-${hex.cy}`}
          d={hex.path}
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={hexOpacity}
          style={
            glow
              ? {
                  animation: `hex-glow-${CSS.escape(id)} ${hex.duration}s ease-in-out ${hex.delay}s infinite`,
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}
