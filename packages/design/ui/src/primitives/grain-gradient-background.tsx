"use client";

import { GrainGradient, type GrainGradientProps } from "@paper-design/shaders-react";
import type * as React from "react";
import { cn } from "../utils/cn";

export interface GrainGradientBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Partial<Omit<GrainGradientProps, "style">> {}

/**
 * GrainGradientBackground - Animated grain gradient shader background
 *
 * A WebGL-powered animated background with grain texture effect.
 * Supports multiple colors, softness, noise, and various shapes.
 *
 * @example
 * ```tsx
 * <div className="relative min-h-screen">
 *   <GrainGradientBackground
 *     colors={["#5100ff", "#00ff80", "#ffcc00"]}
 *     softness={0.8}
 *     noise={0.1}
 *     speed={0.5}
 *   />
 *   <Content />
 * </div>
 * ```
 */
export function GrainGradientBackground({ className, ...props }: GrainGradientBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      <GrainGradient style={{ height: "100%", width: "100%" }} {...props} />
    </div>
  );
}

GrainGradientBackground.displayName = "GrainGradientBackground";

/** @deprecated Use GrainGradientBackground instead */
export const GrainCloudsBackground = GrainGradientBackground;
/** @deprecated Use GrainGradientBackgroundProps instead */
export type GrainCloudsBackgroundProps = GrainGradientBackgroundProps;
