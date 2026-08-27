/**
 * MultiSelect Component Tokens — Layer 3
 *
 * Compact menu selector for dense filters and permission scopes. Runtime
 * colors stay semantic in the primitive; this file owns dimensions, shape,
 * and motion only.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export type MultiSelectWidth = "sm" | "md" | "lg";

export const multiSelectTokens = {
  width: {
    sm: primitiveSpacing[10] * 6,
    md: primitiveSpacing[10] * 7,
    lg: primitiveSpacing[10] * 8,
  },
  trigger: {
    height: primitiveSizing.md,
    paddingX: primitiveSpacing[3],
    gap: primitiveSpacing[2],
    radius: primitiveRadius.md,
    fontSize: primitiveFontSize.sm,
    iconSize: primitiveSpacing[4],
  },
  content: {
    padding: primitiveSpacing[1],
    radius: primitiveRadius.lg,
    maxHeight: primitiveSpacing[24] * 4,
  },
  row: {
    minHeight: primitiveSizing.md,
    paddingX: primitiveSpacing[2],
    paddingY: primitiveSpacing[1] + primitiveSpacing[1] / 2,
    gap: primitiveSpacing[2],
    radius: primitiveRadius.md,
    fontSize: primitiveFontSize.sm,
    descriptionSize: primitiveFontSize.xs,
    checkboxSize: primitiveSizing.xs,
    checkboxIconSize: primitiveFontSize.sm,
    actionMinWidth: primitiveSpacing[10] * 2 - primitiveSpacing[1],
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    popoverDuration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.default,
  },
} as const;
