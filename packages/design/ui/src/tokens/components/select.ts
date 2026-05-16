/**
 * Select Component Tokens — Layer 3
 *
 * Native short-list select and compound listbox trigger share the same control
 * geometry. Complex searchable selection stays in Combobox.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export type SelectSize = "xsmall" | "small" | "medium" | "large";

export const selectTokens = {
  sizes: {
    xsmall: {
      height: primitiveSizing.tiny,
      paddingX: primitiveSpacing[2] - primitiveSpacing[1] / 2,
      fontSize: primitiveFontSize.xs,
      radius: primitiveRadius.md,
      iconInset: primitiveSpacing[2] - primitiveSpacing[1] / 2,
      iconBoxSize: primitiveSizing.xs,
      iconSize: primitiveFontSize.sm,
    },
    small: {
      height: primitiveSizing.sm,
      paddingX: primitiveSpacing[3],
      fontSize: primitiveFontSize.sm,
      radius: primitiveRadius.md,
      iconInset: primitiveSpacing[3],
      iconBoxSize: primitiveSizing.sm,
      iconSize: primitiveFontSize.base,
    },
    medium: {
      height: primitiveSizing.md,
      paddingX: primitiveSpacing[3],
      fontSize: primitiveFontSize.sm,
      radius: primitiveRadius.md,
      iconInset: primitiveSpacing[3],
      iconBoxSize: primitiveSizing.sm,
      iconSize: primitiveFontSize.base,
    },
    large: {
      height: primitiveSizing.lg,
      paddingX: primitiveSpacing[3],
      fontSize: primitiveFontSize.base,
      radius: primitiveRadius.lg,
      iconInset: primitiveSpacing[3],
      iconBoxSize: primitiveSizing.md,
      iconSize: primitiveFontSize.base,
    },
  },
  labelSize: 13,
  focusRingWidth: 3,
  fieldGap: primitiveSpacing[2],
  messageGap: primitiveSpacing[2],
  motion: {
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.default,
  },
} as const;
