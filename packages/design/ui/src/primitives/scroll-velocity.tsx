"use client";

import type { MotionValue } from "motion/react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ScrollVelocityContainer
 *
 * @description
 * Container that provides shared scroll velocity context for child rows.
 * Wrap multiple ScrollVelocityRow components to sync their velocity.
 */
export interface ScrollVelocityContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Props for ScrollVelocityRow
 *
 * @description
 * A row of content that scrolls horizontally with speed based on scroll velocity.
 * Content is duplicated to create seamless infinite scroll effect.
 *
 * **UX Scenarios:**
 * - Marquee text with scroll-reactive speed
 * - Logo/partner carousels
 * - Testimonial tickers
 * - Feature/keyword showcases
 * - Image galleries with velocity effect
 *
 * **Performance:**
 * - Pauses when offscreen (IntersectionObserver)
 * - Pauses when tab hidden (visibilitychange)
 * - Respects prefers-reduced-motion
 */
export interface ScrollVelocityRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * Base scroll velocity (percentage of content width per second)
   * @default 5
   */
  baseVelocity?: number;
  /**
   * Scroll direction (1 = left-to-right, -1 = right-to-left)
   * @default 1
   */
  direction?: 1 | -1;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Wraps a value within a range (for seamless looping)
 */
export const wrap = (min: number, max: number, v: number): number => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

// =============================================================================
// Context
// =============================================================================

const ScrollVelocityContext = React.createContext<MotionValue<number> | null>(null);

// =============================================================================
// Container Component
// =============================================================================

/**
 * ScrollVelocityContainer - Provides shared velocity context
 *
 * @example
 * ```tsx
 * <ScrollVelocityContainer className="text-4xl font-bold">
 *   <ScrollVelocityRow baseVelocity={20} direction={1}>
 *     Forward Scroll
 *   </ScrollVelocityRow>
 *   <ScrollVelocityRow baseVelocity={20} direction={-1}>
 *     Reverse Scroll
 *   </ScrollVelocityRow>
 * </ScrollVelocityContainer>
 * ```
 */
export function ScrollVelocityContainer({
  children,
  className,
  ...props
}: ScrollVelocityContainerProps) {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const velocityFactor = useTransform(smoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1;
    const magnitude = Math.min(5, (Math.abs(v) / 1000) * 5);
    return sign * magnitude;
  });

  return (
    <ScrollVelocityContext.Provider value={velocityFactor}>
      <div className={cn("relative w-full", className)} {...props}>
        {children}
      </div>
    </ScrollVelocityContext.Provider>
  );
}

// =============================================================================
// Row Component (Public)
// =============================================================================

/**
 * ScrollVelocityRow - Scroll-speed driven horizontal content
 *
 * Can be used standalone or within ScrollVelocityContainer for shared velocity.
 */
export function ScrollVelocityRow(props: ScrollVelocityRowProps) {
  const sharedVelocityFactor = useContext(ScrollVelocityContext);

  if (sharedVelocityFactor) {
    return <ScrollVelocityRowImpl {...props} velocityFactor={sharedVelocityFactor} />;
  }
  return <ScrollVelocityRowLocal {...props} />;
}

// =============================================================================
// Internal Implementation
// =============================================================================

interface ScrollVelocityRowImplProps extends ScrollVelocityRowProps {
  velocityFactor: MotionValue<number>;
}

function ScrollVelocityRowImpl({
  children,
  baseVelocity = 5,
  direction = 1,
  className,
  velocityFactor,
  ...props
}: ScrollVelocityRowImplProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const [numCopies, setNumCopies] = useState(1);

  const baseX = useMotionValue(0);
  const baseDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const currentDirectionRef = useRef<number>(direction >= 0 ? 1 : -1);
  const unitWidth = useMotionValue(0);

  const isInViewRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const block = blockRef.current;
    if (!container || !block) return;

    const updateSizes = () => {
      const cw = container.offsetWidth || 0;
      const bw = block.scrollWidth || 0;
      unitWidth.set(bw);
      const nextCopies = bw > 0 ? Math.max(3, Math.ceil(cw / bw) + 2) : 1;
      setNumCopies((prev) => (prev === nextCopies ? prev : nextCopies));
    };

    updateSizes();

    const ro = new ResizeObserver(updateSizes);
    ro.observe(container);
    ro.observe(block);

    const io = new IntersectionObserver(([entry]) => {
      isInViewRef.current = entry?.isIntersecting ?? false;
    });
    io.observe(container);

    const handleVisibility = () => {
      isPageVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility, {
      passive: true,
    });
    handleVisibility();

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handlePRM = () => {
      prefersReducedMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", handlePRM);
    handlePRM();

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      mq.removeEventListener("change", handlePRM);
    };
  }, [unitWidth]);

  const x = useTransform([baseX, unitWidth], ([v, bw]) => {
    const width = Number(bw) || 1;
    const offset = Number(v) || 0;
    return `${-wrap(0, width, offset)}px`;
  });

  useAnimationFrame((_, delta) => {
    if (!isInViewRef.current || !isPageVisibleRef.current) return;
    const dt = delta / 1000;
    const vf = velocityFactor.get();
    const absVf = Math.min(5, Math.abs(vf));
    const speedMultiplier = prefersReducedMotionRef.current ? 1 : 1 + absVf;

    if (absVf > 0.1) {
      const scrollDirection = vf >= 0 ? 1 : -1;
      currentDirectionRef.current = baseDirectionRef.current * scrollDirection;
    }

    const bw = unitWidth.get() || 0;
    if (bw <= 0) return;
    const pixelsPerSecond = (bw * baseVelocity) / 100;
    const moveBy = currentDirectionRef.current * pixelsPerSecond * speedMultiplier * dt;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      ref={containerRef}
      className={cn("w-full overflow-hidden whitespace-nowrap", className)}
      {...props}
    >
      <motion.div
        className="inline-flex transform-gpu select-none items-center will-change-transform"
        style={{ x }}
      >
        {Array.from({ length: numCopies }).map((_, i) =>
          i === 0 ? (
            <div key={i} ref={blockRef} className="inline-flex shrink-0 items-center">
              {children}
            </div>
          ) : (
            <div key={i} aria-hidden="true" className="inline-flex shrink-0 items-center">
              {children}
            </div>
          ),
        )}
      </motion.div>
    </div>
  );
}

function ScrollVelocityRowLocal(props: ScrollVelocityRowProps) {
  const { scrollY } = useScroll();
  const localVelocity = useVelocity(scrollY);
  const localSmoothVelocity = useSpring(localVelocity, {
    damping: 50,
    stiffness: 400,
  });
  const localVelocityFactor = useTransform(localSmoothVelocity, (v) => {
    const sign = v < 0 ? -1 : 1;
    const magnitude = Math.min(5, (Math.abs(v) / 1000) * 5);
    return sign * magnitude;
  });

  return <ScrollVelocityRowImpl {...props} velocityFactor={localVelocityFactor} />;
}

export default ScrollVelocityContainer;
