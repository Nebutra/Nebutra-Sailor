"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Returns true if the user has enabled prefers-reduced-motion.
 * Use this to disable animations, skip transitions, or simplify motion.
 *
 * Wraps framer-motion's `useReducedMotion` so callers don't need framer-motion
 * as a direct import just for accessibility checks.
 *
 * @example
 * const shouldReduce = useReducedMotion();
 * const transition = shouldReduce ? { duration: 0 } : brandSpring.default;
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
