"use client";

import { type ComponentPropsWithoutRef, type CSSProperties, useEffect } from "react";
import { cn } from "../utils/cn";

// =============================================================================
// CSS Animation Injection
// =============================================================================

const SHINY_TEXT_STYLE_ID = "nebutra-shiny-text-keyframes";

function injectShinyTextKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SHINY_TEXT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = SHINY_TEXT_STYLE_ID;
  style.textContent = `
    @keyframes shiny-text {
      0%, 90%, 100% {
        background-position: calc(-100% - var(--shiny-width)) 0;
      }
      30%, 60% {
        background-position: calc(100% + var(--shiny-width)) 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// Types
// =============================================================================

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  /** Width of the shimmer highlight in pixels */
  shimmerWidth?: number;
  /** Animation duration in seconds */
  duration?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AnimatedShinyText - Text with animated light glare shimmer effect
 *
 * @description
 * Creates a shimmering light effect that pans across text,
 * making it appear as if light is reflecting off the surface.
 *
 * @example Basic usage
 * ```tsx
 * <AnimatedShinyText>✨ Introducing Magic UI</AnimatedShinyText>
 * ```
 *
 * @example Custom shimmer width
 * ```tsx
 * <AnimatedShinyText shimmerWidth={200} className="text-xl font-bold">
 *   Premium Feature
 * </AnimatedShinyText>
 * ```
 *
 * @example In a badge
 * ```tsx
 * <div className="rounded-full border px-4 py-1">
 *   <AnimatedShinyText>🎉 New Release</AnimatedShinyText>
 * </div>
 * ```
 */
export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
  duration = 8,
  style,
  ...props
}: AnimatedShinyTextProps) {
  // Inject keyframes on mount
  useEffect(() => {
    injectShinyTextKeyframes();
  }, []);

  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          animation: `shiny-text ${duration}s infinite`,
          backgroundSize: "var(--shiny-width) 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          backgroundPosition: "0 0",
          backgroundRepeat: "no-repeat",
          transition: "background-position 1s cubic-bezier(.6,.6,0,1) infinite",
          ...style,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-muted-foreground/70",
        // Shine gradient
        "bg-gradient-to-r from-transparent via-black/80 via-50% to-transparent dark:via-white/80",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
