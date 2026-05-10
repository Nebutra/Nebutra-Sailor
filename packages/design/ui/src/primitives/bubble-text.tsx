"use client";

import { useState } from "react";
import { cn } from "../utils/cn";

export interface BubbleTextProps {
  /** Text content to display */
  children: string;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  /**
   * Number of characters affected by hover ripple (each direction)
   * @default 2
   */
  rippleDistance?: number;
}

/**
 * BubbleText - Interactive text with hover ripple effect
 *
 * @description
 * Text component where hovering over a character creates a "bubble" effect -
 * the hovered character becomes bold and bright, with neighboring characters
 * having a gradual falloff effect.
 *
 * @example
 * ```tsx
 * <BubbleText className="text-5xl text-indigo-300">
 *   Hover over me
 * </BubbleText>
 * ```
 *
 * @example With custom element
 * ```tsx
 * <BubbleText as="h1" className="text-6xl text-blue-400">
 *   Hero Title
 * </BubbleText>
 * ```
 */
export function BubbleText({
  children,
  className,
  as: Component = "h2",
  rippleDistance = 2,
}: BubbleTextProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <Component
      onMouseLeave={() => setHoveredIndex(null)}
      className={cn("text-center text-5xl font-thin", className)}
    >
      {children.split("").map((char, idx) => {
        const distance = hoveredIndex !== null ? Math.abs(hoveredIndex - idx) : null;

        let charClasses = "transition-all duration-300 ease-in-out cursor-default";

        if (distance !== null && distance <= rippleDistance) {
          switch (distance) {
            case 0:
              charClasses += " font-black brightness-150";
              break;
            case 1:
              charClasses += " font-medium brightness-125";
              break;
            case 2:
              charClasses += " font-light";
              break;
            default:
              break;
          }
        }

        return (
          <span key={idx} onMouseEnter={() => setHoveredIndex(idx)} className={charClasses}>
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </Component>
  );
}
