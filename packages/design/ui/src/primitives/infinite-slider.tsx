"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import * as React from "react";
import { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import { cn } from "../utils/cn";

export interface InfiniteSliderProps {
  /** Content to scroll infinitely */
  children: React.ReactNode;
  /** Gap between items in pixels */
  gap?: number;
  /** Animation duration in seconds (or use speed for px/s) */
  duration?: number;
  /** Duration when hovered */
  durationOnHover?: number;
  /** Speed in pixels per second (alternative to duration) */
  speed?: number;
  /** Speed when hovered in pixels per second */
  speedOnHover?: number;
  /** Scroll direction */
  direction?: "horizontal" | "vertical";
  /** Reverse scroll direction */
  reverse?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * InfiniteSlider - Continuous scrolling content container
 *
 * Creates an infinite scrolling effect by duplicating children.
 * Supports both horizontal and vertical scrolling.
 *
 * @example
 * ```tsx
 * <InfiniteSlider gap={24} speed={50}>
 *   <img src="/logo1.svg" alt="Logo 1" />
 *   <img src="/logo2.svg" alt="Logo 2" />
 * </InfiniteSlider>
 * ```
 */
export function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  speed,
  speedOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [_key, setKey] = useState(0);

  // Calculate duration from speed if provided
  const effectiveDuration = React.useMemo(() => {
    if (speed) {
      const size = direction === "horizontal" ? width : height;
      return size > 0 ? (size + gap) / speed : duration;
    }
    return currentDuration;
  }, [speed, width, height, gap, direction, currentDuration, duration]);

  const effectiveDurationOnHover = React.useMemo(() => {
    if (speedOnHover) {
      const size = direction === "horizontal" ? width : height;
      return size > 0 ? (size + gap) / speedOnHover : durationOnHover;
    }
    return durationOnHover;
  }, [speedOnHover, width, height, gap, direction, durationOnHover]);

  useEffect(() => {
    let controls: ReturnType<typeof animate> | undefined;
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    const activeDuration = isTransitioning
      ? effectiveDurationOnHover || effectiveDuration
      : effectiveDuration;

    if (isTransitioning) {
      controls = animate(translation, [translation.get(), to], {
        ease: "linear",
        duration: activeDuration * Math.abs((translation.get() - to) / contentSize),
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: "linear",
        duration: activeDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    return controls?.stop;
  }, [
    translation,
    effectiveDuration,
    effectiveDurationOnHover,
    width,
    height,
    gap,
    isTransitioning,
    direction,
    reverse,
  ]);

  const hoverProps =
    durationOnHover || speedOnHover
      ? {
          onHoverStart: () => {
            setIsTransitioning(true);
            if (durationOnHover) setCurrentDuration(durationOnHover);
          },
          onHoverEnd: () => {
            setIsTransitioning(true);
            setCurrentDuration(duration);
          },
        }
      : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === "horizontal" ? { x: translation } : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
