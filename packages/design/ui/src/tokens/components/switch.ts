/**
 * Switch Component Tokens — Layer 3
 *
 * Segmented radio selector for 2–3 mutually exclusive views of the same
 * surface. Boolean settings belong to Toggle, not this primitive.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const switchSizes = {
  small: {
    height: primitiveSizing.sm,
    controlHeight: primitiveSizing.tiny,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[3],
    iconSize: primitiveSizing.xs - 4,
    minWidth: 64,
    fontSize: primitiveFontSize.xs,
  },
  medium: {
    height: primitiveSizing.md,
    controlHeight: primitiveSizing.sm,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[3],
    iconSize: primitiveSizing.xs,
    minWidth: 72,
    fontSize: primitiveFontSize.sm,
  },
  large: {
    height: primitiveSizing.lg,
    controlHeight: primitiveSizing.md,
    padding: primitiveSpacing[1],
    paddingX: primitiveSpacing[4],
    iconSize: primitiveSizing.tiny,
    minWidth: 88,
    fontSize: primitiveFontSize.base,
  },
} as const;

export type SwitchSize = keyof typeof switchSizes;

export const switchTokens = {
  radius: primitiveRadius.lg,
  controlRadius: primitiveRadius.md,
  gap: primitiveSpacing[1],
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;
