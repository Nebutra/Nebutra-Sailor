/**
 * Responsive Primitives
 *
 * Breakpoints and responsive utilities.
 */

/**
 * Breakpoint values (Primer-compatible)
 */
export const breakpoints = {
  xs: 0,
  sm: 544,
  md: 768,
  lg: 1012,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;
export type BreakpointValue = (typeof breakpoints)[Breakpoint];

/**
 * Media query strings for each breakpoint
 */
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
} as const;

/**
 * Check if current viewport is at or above breakpoint
 */
export function isBreakpoint(bp: Breakpoint): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= breakpoints[bp];
}

/**
 * Get current breakpoint
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "lg";

  const width = window.innerWidth;
  if (width >= breakpoints.xl) return "xl";
  if (width >= breakpoints.lg) return "lg";
  if (width >= breakpoints.md) return "md";
  if (width >= breakpoints.sm) return "sm";
  return "xs";
}

/**
 * Responsive value helper
 * Creates array for Primer's responsive prop format
 */
export function responsive<T>(values: { xs?: T; sm?: T; md?: T; lg?: T; xl?: T }): T[] {
  return [values.xs, values.sm, values.md, values.lg, values.xl].filter(
    (v) => v !== undefined,
  ) as T[];
}

/**
 * Common responsive patterns
 */
export const responsivePatterns = {
  /** Hide on mobile */
  hideOnMobile: {
    display: ["none", "none", "block"],
  },
  /** Show only on mobile */
  showOnMobile: {
    display: ["block", "block", "none"],
  },
  /** Stack on mobile, row on desktop */
  stackToRow: {
    flexDirection: ["column", "column", "row"],
  },
  /** Full width on mobile, auto on desktop */
  fullToAuto: {
    width: ["100%", "100%", "auto"],
  },
} as const;
