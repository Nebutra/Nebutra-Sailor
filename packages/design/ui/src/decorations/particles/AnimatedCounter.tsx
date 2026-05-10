"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import * as React from "react";
import { cn } from "../../utils/cn";

export interface AnimatedCounterProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Target value to count to */
  value: number;
  /** Duration of animation in seconds */
  duration?: number;
  /** Decimal places to show */
  decimals?: number;
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., "%", "+") */
  suffix?: string;
  /** Easing function */
  easing?: "easeOut" | "easeInOut" | "easeOutBack";
  /** Whether to start animation when in view */
  startOnView?: boolean;
  /** Format number with commas */
  formatWithCommas?: boolean;
}

/**
 * AnimatedCounter - Animated number counter with easing and number burst effect.
 *
 * Creates a smooth counting animation from 0 to the target value when
 * the element comes into view.
 *
 * @example
 * <AnimatedCounter value={1000} suffix="+" duration={2} />
 * <AnimatedCounter value={99.9} suffix="%" decimals={1} />
 */
export const AnimatedCounter = React.forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  (
    {
      value,
      duration = 2,
      decimals = 0,
      prefix = "",
      suffix = "",
      easing = "easeOut",
      startOnView = true,
      formatWithCommas = true,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLSpanElement>(null);
    const isInView = useInView(containerRef, { once: true, margin: "-50px" });
    const count = useMotionValue(0);
    const [displayValue, setDisplayValue] = React.useState("0");

    // Easing configurations
    const easings = {
      easeOut: [0.16, 1, 0.3, 1],
      easeInOut: [0.4, 0, 0.2, 1],
      easeOutBack: [0.34, 1.56, 0.64, 1],
    } as const;

    const rounded = useTransform(count, (latest) => {
      const rounded = decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString();

      if (formatWithCommas && decimals === 0) {
        return Number(rounded).toLocaleString();
      }
      return rounded;
    });

    React.useEffect(() => {
      const unsubscribe = rounded.on("change", (v) => {
        setDisplayValue(v);
      });
      return unsubscribe;
    }, [rounded]);

    React.useEffect(() => {
      if (!startOnView || isInView) {
        const controls = animate(count, value, {
          duration,
          ease: easings[easing] as unknown as [number, number, number, number],
        });

        return controls.stop;
      }
    }, [count, value, duration, easing, isInView, startOnView, easings]);

    return (
      <span
        ref={(node) => {
          // Handle both refs
          (containerRef as React.MutableRefObject<HTMLSpanElement | null>).current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn("tabular-nums", className)}
        {...props}
      >
        {prefix}
        <motion.span>{displayValue}</motion.span>
        {suffix}
      </span>
    );
  },
);

AnimatedCounter.displayName = "AnimatedCounter";
