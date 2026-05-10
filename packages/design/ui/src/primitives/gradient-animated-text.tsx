"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export type GradientVariant = 1 | 2 | 3;
export type GradientTheme = "neon" | "ai" | "custom";

export interface GradientAnimatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Text content */
  children: string;
  /** Gradient variant (1, 2, or 3) - each has different animation timing */
  variant?: GradientVariant;
  /** Color theme preset */
  theme?: GradientTheme;
  /** Custom gradient start color (CSS color) */
  gradientFrom?: string;
  /** Custom gradient end color (CSS color) */
  gradientTo?: string;
  /** Animation duration in seconds */
  duration?: number;
}

const THEME_COLORS: Record<GradientTheme, Record<GradientVariant, { from: string; to: string }>> = {
  neon: {
    1: { from: "#39ff14", to: "#00ffff" }, // green → cyan
    2: { from: "#ff073a", to: "#ff6ec7" }, // red-pink → magenta
    3: { from: "#faff00", to: "#00f0ff" }, // yellow → electric blue
  },
  ai: {
    1: { from: "#39ff14", to: "#ff00ff" }, // green → magenta
    2: { from: "#ff6ec7", to: "#00fffb" }, // magenta → cyan
    3: { from: "#faff00", to: "#00f0ff" }, // yellow → blue
  },
  custom: {
    1: { from: "#6366f1", to: "#8b5cf6" }, // indigo → violet
    2: { from: "#ec4899", to: "#f43f5e" }, // pink → rose
    3: { from: "#14b8a6", to: "#06b6d4" }, // teal → cyan
  },
};

// Animation keyframes for each variant
const ANIMATION_KEYFRAMES = {
  foreground: {
    1: `
      @keyframes gradient-fg-1 {
        from, 16.667%, to { opacity: 1; }
        33.333%, 83.333% { opacity: 0; }
      }
    `,
    2: `
      @keyframes gradient-fg-2 {
        from, to { opacity: 0; }
        33.333%, 50% { opacity: 1; }
        16.667%, 66.667% { opacity: 0; }
      }
    `,
    3: `
      @keyframes gradient-fg-3 {
        from, 50%, to { opacity: 0; }
        66.667%, 83.333% { opacity: 1; }
      }
    `,
  },
  background: {
    1: `
      @keyframes gradient-bg-1 {
        from, 16.667%, to { opacity: 0; }
        25%, 91.667% { opacity: 1; }
      }
    `,
    2: `
      @keyframes gradient-bg-2 {
        from, to { opacity: 1; }
        33.333%, 50% { opacity: 0; }
        25%, 58.333% { opacity: 1; }
      }
    `,
    3: `
      @keyframes gradient-bg-3 {
        from, 58.333%, 91.667%, to { opacity: 1; }
        66.667%, 83.333% { opacity: 0; }
      }
    `,
  },
};

/**
 * GradientAnimatedText - Animated gradient text with cycling opacity
 *
 * Creates a text element with a gradient background that animates
 * through different opacity states, creating a cycling highlight effect.
 *
 * @example
 * ```tsx
 * <div className="flex">
 *   <GradientAnimatedText variant={1} theme="neon">Build.</GradientAnimatedText>
 *   <GradientAnimatedText variant={2} theme="neon">Ship.</GradientAnimatedText>
 *   <GradientAnimatedText variant={3} theme="neon">Scale.</GradientAnimatedText>
 * </div>
 * ```
 */
export function GradientAnimatedText({
  children,
  variant = 1,
  theme = "neon",
  gradientFrom,
  gradientTo,
  duration = 8,
  className,
  style,
  ...props
}: GradientAnimatedTextProps) {
  const colors = THEME_COLORS[theme][variant];
  const fromColor = gradientFrom ?? colors.from;
  const toColor = gradientTo ?? colors.to;

  const styleId = `gradient-anim-${variant}`;

  // Inject keyframes on mount
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(styleId)) return;

    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      ${ANIMATION_KEYFRAMES.foreground[variant]}
      ${ANIMATION_KEYFRAMES.background[variant]}
    `;
    document.head.appendChild(styleEl);

    return () => {
      // Keep styles - they may be used by other instances
    };
  }, [variant, styleId]);

  return (
    <span
      data-content={children}
      className={cn("relative", className)}
      style={{
        ...style,
      }}
      {...props}
    >
      {/* Background text (solid color, animated opacity) */}
      <span
        className="absolute inset-0 z-0"
        style={{
          animation: `gradient-bg-${variant} ${duration}s infinite`,
        }}
        aria-hidden="true"
      >
        {children}
      </span>

      {/* Foreground text (gradient, animated opacity) */}
      <span
        className="relative z-10 bg-gradient-to-r bg-clip-text text-transparent"
        style={{
          backgroundImage: `linear-gradient(to right, ${fromColor}, ${toColor})`,
          animation: `gradient-fg-${variant} ${duration}s infinite`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

GradientAnimatedText.displayName = "GradientAnimatedText";
