/**
 * Input Component Tokens — Layer 3
 *
 * Component-level sizing and interaction constants. Input consumes semantic
 * colors at runtime and only derives dimensions from primitive tokens here.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
} from "../primitive";

export type InputSize = "sm" | "md" | "lg";

export const inputTokens = {
  sizes: {
    sm: {
      height: primitiveSizing.sm,
      paddingX: primitiveSpacing[2],
      fontSize: primitiveFontSize.xs,
      radius: primitiveRadius.md,
      affixInset: primitiveSpacing[2],
      affixWidth: primitiveSizing.sm,
      controlInset: primitiveSpacing[2] - primitiveSpacing[1] / 2,
      controlSize: primitiveSizing.xs,
      controlIconSize: primitiveSizing.xs - primitiveSpacing[2],
      iconSize: primitiveFontSize.sm,
    },
    md: {
      height: primitiveSizing.md,
      paddingX: primitiveSpacing[3],
      fontSize: primitiveFontSize.sm,
      radius: primitiveRadius.md,
      affixInset: primitiveSpacing[3],
      affixWidth: primitiveSizing.sm + primitiveSpacing[1],
      controlInset: primitiveSpacing[2],
      controlSize: primitiveSizing.tiny,
      controlIconSize: primitiveSizing.tiny - primitiveSpacing[2],
      iconSize: primitiveFontSize.base,
    },
    lg: {
      height: primitiveSizing.lg,
      paddingX: primitiveSpacing[4],
      fontSize: primitiveFontSize.base,
      radius: primitiveRadius.lg,
      affixInset: primitiveSpacing[4],
      affixWidth: primitiveSizing.md,
      controlInset: primitiveSpacing[3],
      controlSize: primitiveSizing.tiny,
      controlIconSize: primitiveSizing.tiny - primitiveSpacing[2],
      iconSize: primitiveFontSize.base,
    },
  },
  focusRingWidth: 3,
  fieldGap: primitiveSpacing[2] - primitiveSpacing[1] / 2,
  messageGap: primitiveSpacing[1],
} as const;
