"use client";

import type React from "react";
import { memo } from "react";
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
   * @default ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"]
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
 * <AuroraText colors={["#00ff87", "#60efff", "#0061ff"]}>
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
    colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
    speed = 1,
  }: AuroraTextProps) => {
    const gradientStyle: React.CSSProperties = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      animationDuration: `${10 / speed}s`,
    };

    return (
      <span className={cn("relative inline-block", className)}>
        {/* Screen reader text */}
        <span className="sr-only">{children}</span>
        {/* Visual aurora text */}
        <span
          className="animate-aurora relative bg-[length:200%_auto] bg-clip-text text-transparent"
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
