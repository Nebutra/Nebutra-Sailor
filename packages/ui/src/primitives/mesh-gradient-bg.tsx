"use client";

import { MeshGradient, type MeshGradientProps } from "@paper-design/shaders-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import {
  BRAND_FALLBACK,
  getBrandAccent,
  getBrandPrimary,
  getBrandTertiary,
} from "../utils/brand-colors";
import { cn } from "../utils/cn";

// =============================================================================
// Brand Defaults
// =============================================================================

/** SSR fallback palette — used until CSS vars resolve on the client. */
const BRAND_COLORS_FALLBACK = [
  BRAND_FALLBACK.primary,
  BRAND_FALLBACK.accent,
  BRAND_FALLBACK.tertiary,
  BRAND_FALLBACK.primaryDark,
] as const;

// =============================================================================
// Types
// =============================================================================

export interface MeshGradientBgProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Partial<Omit<MeshGradientProps, "style">> {}

// =============================================================================
// Component
// =============================================================================

/**
 * MeshGradientBg - Brand-matched mesh gradient shader background
 *
 * Wraps @paper-design/shaders-react MeshGradient with Nebutra brand defaults.
 * Absolutely positioned, fills parent, z-index -10.
 *
 * @example
 * ```tsx
 * <div className="relative min-h-screen">
 *   <MeshGradientBg />
 *   <Content />
 * </div>
 * ```
 *
 * @example Custom colors and speed
 * ```tsx
 * <MeshGradientBg
 *   colors={["#0BF1C3", "#0033FE", "#000830"]}
 *   speed={0.5}
 *   distortion={0.4}
 * />
 * ```
 */
export function MeshGradientBg({ className, colors, speed = 0.3, ...props }: MeshGradientBgProps) {
  const [resolvedColors, setResolvedColors] = useState<string[]>(
    colors ? [...colors] : [...BRAND_COLORS_FALLBACK],
  );

  useEffect(() => {
    if (colors) {
      setResolvedColors([...colors]);
      return;
    }
    setResolvedColors([
      getBrandPrimary(),
      getBrandAccent(),
      getBrandTertiary(),
      BRAND_FALLBACK.primaryDark,
    ]);
  }, [colors]);

  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      <MeshGradient
        style={{ height: "100%", width: "100%" }}
        colors={resolvedColors}
        speed={speed}
        {...props}
      />
    </div>
  );
}

MeshGradientBg.displayName = "MeshGradientBg";
