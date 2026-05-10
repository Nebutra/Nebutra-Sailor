"use client";

import { motion } from "framer-motion";
import type * as React from "react";
import { cn } from "../utils/cn";

export interface NoisePatternCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Additional className for the card container */
  className?: string;
  /** Additional className for the noise pattern layer */
  patternClassName?: string;
  /** Additional className for the overlay layer */
  overlayClassName?: string;
}

/**
 * NoisePatternCard - Card with animated noise texture background
 *
 * Creates a sophisticated noise pattern using SVG filters.
 * The organic texture adds depth while maintaining a modern feel.
 *
 * Note: Requires Tailwind config extension for `bg-noise-pattern`.
 *
 * @example
 * ```tsx
 * <NoisePatternCard>
 *   <NoisePatternCardBody>
 *     <h3>Title</h3>
 *     <p>Description</p>
 *   </NoisePatternCardBody>
 * </NoisePatternCard>
 * ```
 */
export function NoisePatternCard({
  children,
  className,
  patternClassName,
  overlayClassName,
}: NoisePatternCardProps) {
  return (
    <motion.div
      className={cn(
        "w-full overflow-hidden rounded-[var(--radius-md)] border",
        "bg-card",
        "border-border",
        className,
      )}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div
        className={cn(
          "size-full bg-repeat bg-[length:500px_500px]",
          "bg-noise-pattern",
          patternClassName,
        )}
      >
        <div className={cn("bg-card", overlayClassName)}>{children}</div>
      </div>
    </motion.div>
  );
}

export type NoisePatternCardBodyProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * NoisePatternCardBody - Content container for NoisePatternCard
 */
export function NoisePatternCardBody({ className, ...props }: NoisePatternCardBodyProps) {
  return <div className={cn("p-4 text-left md:p-6", className)} {...props} />;
}
