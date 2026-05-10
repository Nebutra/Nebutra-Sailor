"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../utils/cn";

/**
 * Props for the AnimatedGradientText component
 */
export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<"span"> {
  /** Speed multiplier for the gradient animation (default: 1) */
  speed?: number;
  /** Starting color of the gradient */
  colorFrom?: string;
  /** Ending color of the gradient */
  colorTo?: string;
}

/**
 * AnimatedGradientText - Scrolling gradient text effect
 *
 * A text component with a continuously scrolling gradient background.
 * The gradient moves horizontally creating a shimmering effect.
 *
 * **Note:** Requires CSS animation to be added to your global styles:
 * ```css
 * @keyframes gradient {
 *   to { background-position: var(--bg-size, 300%) 0; }
 * }
 * .animate-gradient {
 *   animation: gradient 8s linear infinite;
 * }
 * ```
 *
 * @example Basic usage
 * ```tsx
 * <AnimatedGradientText>Animated Text</AnimatedGradientText>
 * ```
 *
 * @example Custom colors
 * ```tsx
 * <AnimatedGradientText colorFrom="#ff0080" colorTo="#7928ca">
 *   Pink to Purple
 * </AnimatedGradientText>
 * ```
 *
 * @example Faster animation
 * ```tsx
 * <AnimatedGradientText speed={2}>
 *   Fast Gradient
 * </AnimatedGradientText>
 * ```
 *
 * @example As heading
 * ```tsx
 * <h1 className="text-4xl font-bold">
 *   <AnimatedGradientText>Welcome</AnimatedGradientText>
 * </h1>
 * ```
 */
export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#0033FE",
  colorTo = "#0BF1C3",
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={
        {
          "--bg-size": `${speed * 300}%`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
        } as React.CSSProperties
      }
      className={cn(
        "animate-gradient inline bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * CSS keyframes required for AnimatedGradientText.
 * Add this to your global CSS or Tailwind config.
 */
export const ANIMATED_GRADIENT_CSS = `
@keyframes gradient {
  to {
    background-position: var(--bg-size, 300%) 0;
  }
}

.animate-gradient {
  animation: gradient 8s linear infinite;
}
`;
