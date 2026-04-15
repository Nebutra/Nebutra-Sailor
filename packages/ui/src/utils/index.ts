/**
 * Utility Functions
 */

/**
 * Merge class names — canonical implementation from ./cn.ts
 * Uses twMerge(clsx(...)) to correctly resolve Tailwind class conflicts.
 */
export { cn } from "./cn";

/**
 * Breakpoint values (matches Primer)
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 544,
  md: 768,
  lg: 1012,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Check if viewport is at or above breakpoint
 */
export function isBreakpointUp(breakpoint: Breakpoint): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

export {
  BRAND_FALLBACK,
  getBrandAccent,
  getBrandPrimary,
  getBrandTertiary,
  readCssVar,
} from "./brand-colors";
