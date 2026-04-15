"use client";

import { Waves, type WavesProps } from "@paper-design/shaders-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { BRAND_FALLBACK, getBrandPrimary } from "../utils/brand-colors";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface WavesBgProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Partial<Omit<WavesProps, "style">> {}

// =============================================================================
// Component
// =============================================================================

/**
 * WavesBg - Brand-matched waves shader background
 *
 * Wraps @paper-design/shaders-react Waves with Nebutra brand defaults.
 * Absolutely positioned, fills parent, z-index -10.
 *
 * @example
 * ```tsx
 * <div className="relative min-h-screen">
 *   <WavesBg />
 *   <Content />
 * </div>
 * ```
 *
 * @example Custom wave settings
 * ```tsx
 * <WavesBg
 *   colorFront="#0BF1C3"
 *   colorBack="#0033FE"
 *   frequency={3}
 *   amplitude={0.5}
 * />
 * ```
 */
export function WavesBg({
  className,
  colorFront,
  colorBack = BRAND_FALLBACK.backDark,
  ...props
}: WavesBgProps) {
  const [resolvedFront, setResolvedFront] = useState<string>(colorFront ?? BRAND_FALLBACK.primary);

  useEffect(() => {
    setResolvedFront(colorFront ?? getBrandPrimary());
  }, [colorFront]);

  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      <Waves
        style={{ height: "100%", width: "100%" }}
        colorFront={resolvedFront}
        colorBack={colorBack}
        {...props}
      />
    </div>
  );
}

WavesBg.displayName = "WavesBg";
