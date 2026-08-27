/**
 * Accessibility Primitives
 *
 * Utilities and patterns for building accessible UI.
 */

import type { CSSProperties } from "react";

type StyleObject = CSSProperties & Record<string, unknown>;

/**
 * Visually hidden but accessible to screen readers
 */
export const visuallyHidden: StyleObject = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Focus ring styles for keyboard navigation
 */
export const focusRing: StyleObject = {
  outline: "2px solid",
  outlineColor: "accent.fg",
  outlineOffset: "2px",
};

/**
 * Skip link for keyboard users
 */
export const skipLinkStyle: StyleObject = {
  ...visuallyHidden,
  "&:focus": {
    position: "fixed",
    top: 2,
    left: 2,
    width: "auto",
    height: "auto",
    padding: 2,
    margin: 0,
    overflow: "visible",
    clip: "auto",
    whiteSpace: "normal",
    backgroundColor: "canvas.default",
    color: "fg.default",
    zIndex: 9999,
    ...focusRing,
  },
};

/**
 * Common ARIA attributes
 */
export const ariaPatterns = {
  /** For loading states */
  loading: {
    "aria-busy": true,
    "aria-live": "polite" as const,
  },
  /** For expandable sections */
  expandable: (expanded: boolean) => ({
    "aria-expanded": expanded,
  }),
  /** For current page in navigation */
  currentPage: {
    "aria-current": "page" as const,
  },
  /** For required form fields */
  required: {
    "aria-required": true,
  },
  /** For invalid form fields */
  invalid: (message?: string) => ({
    "aria-invalid": true,
    ...(message && { "aria-errormessage": message }),
  }),
};

/**
 * Minimum touch target size (WCAG 2.5.5)
 */
export const minTouchTarget = {
  minWidth: 44,
  minHeight: 44,
} as const;

/**
 * Reduced motion media query check
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Color contrast requirements
 */
export const contrastRequirements = {
  /** WCAG AA for normal text */
  normalText: 4.5,
  /** WCAG AA for large text (18px+ or 14px+ bold) */
  largeText: 3,
  /** WCAG AAA for normal text */
  normalTextAAA: 7,
  /** WCAG AAA for large text */
  largeTextAAA: 4.5,
} as const;
