/**
 * Spinner Component Tokens — Layer 3
 *
 * Indeterminate single-action loading feedback. Keep the surface deliberately
 * narrow: expressive loaders belong in marketing illustrations, not controls.
 */

import { primitiveRadius, primitiveSizing, primitiveTransition } from "../primitive";

export const spinnerSizes = {
  xs: 12,
  sm: 16,
  md: primitiveSizing.xs,
  lg: primitiveSizing.tiny,
} as const;

export type SpinnerSize = keyof typeof spinnerSizes;

export const spinnerTones = {
  default: "text-muted-foreground",
  foreground: "text-foreground",
  inverse: "text-primary-foreground",
} as const;

export type SpinnerTone = keyof typeof spinnerTones;

export const spinnerTokens = {
  defaultSize: "md",
  barCount: 12,
  barWidth: "24%",
  barHeight: "8%",
  barLeft: "10%",
  barTop: "4%",
  barTranslate: "146%",
  barRadius: primitiveRadius.full,
  opacity: {
    min: 0.18,
    max: 0.96,
  },
  motion: {
    duration: primitiveTransition.duration.cinematic * 2,
    easing: "linear",
  },
} as const;
