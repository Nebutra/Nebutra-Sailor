"use client";

import type React from "react";
import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

/**
 * Marquee animation keyframes
 * Injected into document head via useEffect to ensure proper loading
 */
const MARQUEE_STYLE_ID = "nebutra-marquee-keyframes";
const marqueeStyles = `
@keyframes nebutra-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-100% - var(--gap, 1rem))); }
}
@keyframes nebutra-marquee-vertical {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(-100% - var(--gap, 1rem))); }
}
`;

/**
 * Hook to inject marquee styles into document head
 */
function useMarqueeStyles() {
  useEffect(() => {
    // Check if styles already exist
    if (typeof document !== "undefined" && !document.getElementById(MARQUEE_STYLE_ID)) {
      const styleEl = document.createElement("style");
      styleEl.id = MARQUEE_STYLE_ID;
      styleEl.textContent = marqueeStyles;
      document.head.appendChild(styleEl);
    }
  }, []);
}

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /** Optional CSS class name to apply custom styles */
  className?: string;
  /** Whether to reverse the animation direction */
  reverse?: boolean;
  /** Whether to pause the animation on hover */
  pauseOnHover?: boolean;
  /** Content to be displayed in the marquee */
  children: React.ReactNode;
  /** Whether to animate vertically instead of horizontally */
  vertical?: boolean;
  /** Number of times to repeat the content */
  repeat?: number;
  /** If true, automatically repeats children enough to fill the visible area */
  autoFill?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** ARIA live region politeness */
  ariaLive?: "off" | "polite" | "assertive";
  /** ARIA role */
  ariaRole?: string;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ariaLabel,
  ariaLive = "off",
  ariaRole = "marquee",
  ...props
}: MarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Inject styles into document head
  useMarqueeStyles();

  // Animation name based on direction
  const animationName = vertical ? "nebutra-marquee-vertical" : "nebutra-marquee";

  return (
    <div
      {...props}
      ref={marqueeRef}
      data-slot="marquee"
      className={cn(
        "group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
      style={
        {
          "--duration": "40s",
          ...props.style,
        } as React.CSSProperties
      }
      aria-label={ariaLabel}
      aria-live={ariaLive}
      role={ariaRole}
      tabIndex={0}
    >
      {Array.from({ length: repeat }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around",
            vertical ? "flex-col [gap:var(--gap)]" : "flex-row [gap:var(--gap)]",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
          style={{
            animation: `${animationName} var(--duration, 40s) linear infinite`,
            animationDirection: reverse ? "reverse" : "normal",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export type { MarqueeProps };
