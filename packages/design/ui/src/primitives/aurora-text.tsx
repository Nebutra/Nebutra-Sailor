"use client";

import type React from "react";
import { memo } from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AuroraText component
 *
 * @description
 * Animated gradient text with aurora-like color shifting effect.
 * Uses CSS animation with background-position and subtle transform.
 *
 * **UX Scenarios:**
 * - Hero section headlines
 * - Brand name highlights
 * - Feature titles
 * - Premium/special content emphasis
 * - Marketing copy accents
 *
 * **Requires Tailwind config:**
 * ```js
 * animation: {
 *   aurora: "aurora 8s ease-in-out infinite alternate",
 * },
 * keyframes: {
 *   aurora: {
 *     "0%": { backgroundPosition: "0% 50%", transform: "rotate(-5deg) scale(0.9)" },
 *     "25%": { backgroundPosition: "50% 100%", transform: "rotate(5deg) scale(1.1)" },
 *     "50%": { backgroundPosition: "100% 50%", transform: "rotate(-3deg) scale(0.95)" },
 *     "75%": { backgroundPosition: "50% 0%", transform: "rotate(3deg) scale(1.05)" },
 *     "100%": { backgroundPosition: "0% 50%", transform: "rotate(-5deg) scale(0.9)" },
 *   },
 * },
 * ```
 */
export interface AuroraTextProps {
  /** Text content to display */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /**
   * Array of colors for the gradient
   * @default ["hsl(var(--primary))", "var(--brand-accent)", "var(--brand-tertiary)", "var(--primary)"]
   */
  colors?: string[];
  /**
   * Animation speed multiplier (higher = faster)
   * @default 1
   */
  speed?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AuroraText - Animated aurora gradient text effect
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AuroraText>Aurora Text</AuroraText>
 *
 * // Custom colors
 * <AuroraText colors={["hsl(var(--primary))", "var(--brand-accent)", "var(--brand-tertiary)"]}>
 *   Custom Colors
 * </AuroraText>
 *
 * // Faster animation
 * <AuroraText speed={2}>Fast Aurora</AuroraText>
 *
 * // As heading
 * <h1 className="text-6xl font-bold">
 *   <AuroraText>Welcome</AuroraText>
 * </h1>
 * ```
 */
export const AuroraText = memo(
  ({
    children,
    className = "",
    colors = [
      "hsl(var(--primary))",
      "var(--brand-accent)",
      "var(--brand-tertiary)",
      "hsl(var(--primary))",
    ],
    speed = 1,
  }: AuroraTextProps) => {
    const shouldReduceMotion = useReducedMotion();

    const gradientStyle: React.CSSProperties = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      // When reduced-motion is active, omit animationDuration entirely so the
      // CSS animation never plays — just a static gradient.
      ...(shouldReduceMotion ? null : { animationDuration: `${10 / speed}s` }),
    };

    return (
      <span className={cn("relative inline-block", className)}>
        {/* Screen reader text */}
        <span className="sr-only">{children}</span>
        {/* Visual aurora text */}
        <span
          className={cn(
            "relative bg-[length:200%_auto] bg-clip-text text-transparent",
            !shouldReduceMotion && "animate-aurora",
          )}
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    );
  },
);

AuroraText.displayName = "AuroraText";

export default AuroraText;
