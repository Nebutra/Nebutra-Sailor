/**
 * Textarea Component Tokens — Layer 3
 *
 * Mirrors the Input focus and radius contract while preserving textarea-specific
 * vertical sizing.
 */

import { primitiveFontSize, primitiveRadius, primitiveSpacing } from "../primitive";

export type TextareaSize = "sm" | "md" | "lg";

export const textareaTokens = {
  sizes: {
    sm: {
      minHeight: primitiveSpacing[20],
      paddingX: primitiveSpacing[2],
      paddingY: primitiveSpacing[2],
      fontSize: primitiveFontSize.xs,
      radius: primitiveRadius.md,
    },
    md: {
      minHeight: primitiveSpacing[24],
      paddingX: primitiveSpacing[3],
      paddingY: primitiveSpacing[2],
      fontSize: primitiveFontSize.sm,
      radius: primitiveRadius.md,
    },
    lg: {
      minHeight: primitiveSpacing[24],
      paddingX: primitiveSpacing[4],
      paddingY: primitiveSpacing[3],
      fontSize: primitiveFontSize.base,
      radius: primitiveRadius.lg,
    },
  },
  labelSize: primitiveFontSize.sm,
  focusRingWidth: 3,
  fieldGap: primitiveSpacing[2] - primitiveSpacing[1] / 2,
  messageGap: primitiveSpacing[1],
} as const;
