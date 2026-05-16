/**
 * Slider Component Tokens — Layer 3
 *
 * Single-value ranged numeric input. Multi-thumb ranges belong in a dedicated
 * range primitive so the value and accessibility contracts do not blur.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveShadow,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const sliderTokens = {
  height: primitiveSizing.sm,
  trackHeight: primitiveSpacing[1] + 2,
  thumbSize: primitiveSizing.xs,
  radius: primitiveRadius.full,
  gap: primitiveSpacing[2],
  labelGap: primitiveSpacing[1],
  valueFontSize: primitiveFontSize.sm,
  track: {
    background: "hsl(var(--muted))",
    fill: "hsl(var(--primary))",
  },
  thumb: {
    background: "hsl(var(--background))",
    shadow: primitiveShadow.md,
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;
