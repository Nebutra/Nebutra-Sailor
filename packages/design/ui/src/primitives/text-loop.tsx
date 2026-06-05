"use client";

import { Children, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

type MotionDivProps = React.ComponentProps<typeof motion.div>;
type MotionTransition = NonNullable<MotionDivProps["transition"]>;
type MotionVariants = NonNullable<MotionDivProps["variants"]>;

/**
 * Props for the TextLoop component.
 */
export interface TextLoopProps {
  /** Array of React nodes to cycle through */
  children: React.ReactNode[];
  /** Additional CSS classes */
  className?: string;
  /** Interval between transitions in seconds (default: 2) */
  interval?: number;
  /** Framer Motion transition config */
  transition?: MotionTransition;
  /** Custom animation variants */
  variants?: MotionVariants;
  /** Callback fired when the active index changes */
  onIndexChange?: (index: number) => void;
}

/**
 * TextLoop - Animated text cycling component
 *
 * Cycles through an array of text/content items with smooth animations.
 * Useful for hero sections, testimonials, or any rotating content display.
 *
 * @example Basic usage
 * ```tsx
 * <TextLoop>
 *   {["Hello", "World", "Welcome"].map(text => (
 *     <span key={text}>{text}</span>
 *   ))}
 * </TextLoop>
 * ```
 *
 * @example With custom interval and animation
 * ```tsx
 * <TextLoop
 *   interval={1.5}
 *   transition={{ duration: 0.5, ease: "easeInOut" }}
 * >
 *   {items.map(item => <span key={item.id}>{item.label}</span>)}
 * </TextLoop>
 * ```
 *
 * @example Inline with static text
 * ```tsx
 * <p>
 *   Beautiful templates for{" "}
 *   <TextLoop interval={1}>
 *     {["Designers", "Developers", "Everyone"].map(t => (
 *       <span key={t}>{t}</span>
 *     ))}
 *   </TextLoop>
 * </p>
 * ```
 */
export function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
}: TextLoopProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const intervalMs = interval * 1000;

    const timer = setInterval(() => {
      setCurrentIndex((current) => {
        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, shouldReduceMotion]);

  const motionVariants: MotionVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };

  return (
    <div className={cn("relative inline-block whitespace-nowrap", className)}>
      <AnimatePresence mode={shouldReduceMotion ? "sync" : "popLayout"} initial={false}>
        <motion.div
          key={currentIndex}
          initial={shouldReduceMotion ? { opacity: 1 } : "initial"}
          animate={shouldReduceMotion ? { opacity: 1 } : "animate"}
          exit={shouldReduceMotion ? { opacity: 1 } : "exit"}
          transition={shouldReduceMotion ? { duration: 0 } : transition}
          {...(!shouldReduceMotion ? { variants: variants || motionVariants } : {})}
        >
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
