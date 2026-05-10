"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";
import { cn } from "../../utils/cn";

export interface TextSparklineProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The text content to display */
  children: React.ReactNode;
  /**
   * Color of the sparkline glow.
   * Use CSS custom properties for theme compatibility.
   */
  glowColor?: string;
  /** Intensity of the glow effect 0-1 (default: 0.4) */
  glowIntensity?: number;
  /** Width of the sparkline relative to text (default: 1.2 = 120%) */
  sparklineWidth?: number;
  /** Animation duration in seconds (default: 3) */
  duration?: number;
  /** Delay before animation starts in seconds (default: 0) */
  delay?: number;
  /** Whether to show the sparkline (default: true) */
  showSparkline?: boolean;
}

/**
 * TextSparkline - Adds an animated glow line effect behind text.
 *
 * Creates a subtle, animated light trail that sweeps behind the text,
 * adding visual emphasis without overwhelming the content.
 *
 * @example
 * <TextSparkline glowColor="hsl(var(--accent))">
 *   <h1>Ship Your SaaS</h1>
 * </TextSparkline>
 *
 * @example
 * // With custom settings
 * <TextSparkline
 *   glowColor="hsl(var(--primary))"
 *   glowIntensity={0.6}
 *   duration={4}
 * >
 *   <span className="text-4xl font-bold">Featured</span>
 * </TextSparkline>
 */
export const TextSparkline = React.forwardRef<HTMLDivElement, TextSparklineProps>(
  (
    {
      children,
      glowColor = "hsl(var(--accent))",
      glowIntensity = 0.4,
      sparklineWidth = 1.2,
      duration = 3,
      delay = 0,
      showSparkline = true,
      className,
      ...props
    },
    ref,
  ) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <div ref={ref} className={cn("relative inline-block", className)} {...props}>
        {/* Sparkline glow effect */}
        {showSparkline && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              transform: `scaleX(${sparklineWidth})`,
              transformOrigin: "center",
            }}
            aria-hidden="true"
          >
            {/* Animated glow line */}
            <motion.div
              className="absolute h-full"
              style={{
                width: "30%",
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${glowColor} 30%, 
                  ${glowColor} 70%, 
                  transparent 100%)`,
                opacity: glowIntensity,
                filter: "blur(8px)",
              }}
              animate={{
                x: ["-100%", "400%"],
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                repeatDelay: duration * 0.5,
                ease: "easeInOut",
              }}
            />

            {/* Secondary subtle glow */}
            <motion.div
              className="absolute h-full"
              style={{
                width: "20%",
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${glowColor} 50%, 
                  transparent 100%)`,
                opacity: glowIntensity * 0.5,
                filter: "blur(16px)",
              }}
              animate={{
                x: ["-100%", "500%"],
              }}
              transition={{
                duration: duration * 1.3,
                delay: delay + duration * 0.2,
                repeat: Infinity,
                repeatDelay: duration * 0.3,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        )}

        {/* Text content */}
        <div className="relative z-10">{children}</div>
      </div>
    );
  },
);

TextSparkline.displayName = "TextSparkline";
