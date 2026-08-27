/**
 * Toast Component Tokens — Layer 3
 *
 * Toast is a transient acknowledgement surface. Timing, stack density,
 * and action geometry are component semantics, while color remains on
 * semantic tokens exposed by the theme.
 */

import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveShadow,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const toastTokens = {
  width: 420,
  radius: primitiveRadius.xl,
  shadow: primitiveShadow.lg,
  stack: {
    visibleToasts: 3,
    gap: primitiveSpacing[2],
    offset: primitiveSpacing[4],
    mobileOffset: primitiveSpacing[4],
  },
  duration: {
    default: 3000,
    undo: 7000,
  },
  action: {
    radius: primitiveRadius.md,
    paddingX: primitiveSpacing[3],
    paddingY: primitiveSpacing[1],
  },
  typography: {
    titleSize: primitiveFontSize.sm,
    descriptionSize: primitiveFontSize.xs,
    lineHeight: 21,
    titleWeight: primitiveFontWeight.medium,
  },
  motion: {
    duration: primitiveTransition.duration.reveal,
    easing: "cubic-bezier(.25,.75,.6,.98)",
  },
} as const;
