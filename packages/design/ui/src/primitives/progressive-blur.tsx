"use client";

import type React from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ProgressiveBlur component
 *
 * @description
 * Creates a multi-layered progressive blur effect using stacked backdrop-filter
 * layers with gradient masks. Useful for indicating scrollable content areas.
 *
 * **UX Scenarios:**
 * - Scrollable list fade-outs
 * - Modal/dialog content overflow indicators
 * - Card content truncation with blur
 * - Navigation menu scroll indicators
 * - Image gallery edge effects
 *
 * **Technical Notes:**
 * - Uses multiple stacked divs with increasing blur values
 * - Gradient masks create smooth transition between blur levels
 * - Supports webkit prefix for Safari compatibility
 */
export interface ProgressiveBlurProps {
  /** Additional CSS classes */
  className?: string;
  /**
   * Height of the blur effect
   * @default "30%"
   */
  height?: string;
  /**
   * Position of the blur effect
   * @default "bottom"
   */
  position?: "top" | "bottom" | "both";
  /**
   * Array of blur values (in px) for progressive effect
   * @default [0.5, 1, 2, 4, 8, 16, 32, 64]
   */
  blurLevels?: number[];
  /** Optional content within the blur container */
  children?: React.ReactNode;
}

// =============================================================================
// Helper Functions
// =============================================================================

const getMaskGradient = (
  position: "top" | "bottom" | "both",
  startPercent: number,
  midPercent: number,
  endPercent: number,
): string => {
  if (position === "bottom") {
    return `linear-gradient(to bottom, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${midPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,0) ${endPercent + 12.5}%)`;
  }
  if (position === "top") {
    return `linear-gradient(to top, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${midPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,0) ${endPercent + 12.5}%)`;
  }
  return `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`;
};

const getEdgeMask = (position: "top" | "bottom" | "both", isFirst: boolean): string => {
  if (position === "both") {
    return `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`;
  }

  const direction = position === "bottom" ? "to bottom" : "to top";

  if (isFirst) {
    return `linear-gradient(${direction}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 37.5%)`;
  }
  return `linear-gradient(${direction}, rgba(0,0,0,0) 87.5%, rgba(0,0,0,1) 100%)`;
};

// =============================================================================
// Component
// =============================================================================

/**
 * ProgressiveBlur - Multi-layered progressive blur effect
 *
 * @example
 * ```tsx
 * // Basic usage at bottom of scroll container
 * <div className="relative h-[400px] overflow-auto">
 *   <div className="space-y-4 p-4">
 *     {items.map(item => <Card key={item.id} />)}
 *   </div>
 *   <ProgressiveBlur position="bottom" height="50%" />
 * </div>
 *
 * // Top and bottom blur
 * <div className="relative h-[300px] overflow-auto">
 *   <ProgressiveBlur position="both" />
 *   <Content />
 * </div>
 *
 * // Custom blur levels (less intense)
 * <ProgressiveBlur
 *   blurLevels={[0.5, 1, 2, 4, 8]}
 *   height="20%"
 * />
 * ```
 */
export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [0.5, 1, 2, 4, 8, 16, 32, 64],
  children,
}: ProgressiveBlurProps) {
  // Create array for middle blur layers
  const middleLayers = Array(Math.max(0, blurLevels.length - 2)).fill(null);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10",
        position === "top" && "top-0",
        position === "bottom" && "bottom-0",
        position === "both" && "inset-y-0",
        className,
      )}
      style={{
        height: position === "both" ? "100%" : height,
      }}
    >
      {/* First blur layer */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          backdropFilter: `blur(${blurLevels[0]}px)`,
          WebkitBackdropFilter: `blur(${blurLevels[0]}px)`,
          maskImage: getEdgeMask(position, true),
          WebkitMaskImage: getEdgeMask(position, true),
        }}
      />

      {/* Middle blur layers */}
      {middleLayers.map((_, index) => {
        const blurIndex = index + 1;
        const startPercent = blurIndex * 12.5;
        const midPercent = (blurIndex + 1) * 12.5;
        const endPercent = (blurIndex + 2) * 12.5;
        const maskGradient = getMaskGradient(position, startPercent, midPercent, endPercent);

        return (
          <div
            key={`blur-${index}`}
            className="absolute inset-0"
            style={{
              zIndex: index + 2,
              backdropFilter: `blur(${blurLevels[blurIndex]}px)`,
              WebkitBackdropFilter: `blur(${blurLevels[blurIndex]}px)`,
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            }}
          />
        );
      })}

      {/* Last blur layer */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: blurLevels.length,
          backdropFilter: `blur(${blurLevels[blurLevels.length - 1]}px)`,
          WebkitBackdropFilter: `blur(${blurLevels[blurLevels.length - 1]}px)`,
          maskImage: getEdgeMask(position, false),
          WebkitMaskImage: getEdgeMask(position, false),
        }}
      />

      {children}
    </div>
  );
}

export default ProgressiveBlur;
