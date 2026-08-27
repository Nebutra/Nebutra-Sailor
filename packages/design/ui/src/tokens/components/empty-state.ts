/**
 * Empty State Component Tokens — Layer 3
 *
 * Zero-content surfaces need stable geometry across product screens. Components
 * consume these through local CSS variables instead of raw spacing/font values.
 */

import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
} from "../primitive";

export const emptyStateTokens = {
  root: {
    minHeight: {
      sm: primitiveSpacing[16] * 2,
      md: primitiveSpacing[24] * 2,
      lg: primitiveSpacing[16] * 4,
    },
    paddingX: {
      sm: primitiveSpacing[4],
      md: primitiveSpacing[6],
      lg: primitiveSpacing[8],
    },
    paddingY: {
      sm: primitiveSpacing[8],
      md: primitiveSpacing[10],
      lg: primitiveSpacing[14],
    },
    radius: primitiveRadius.lg,
  },
  content: {
    maxWidth: primitiveSpacing[14] * 8,
    descriptionMaxWidth: primitiveSpacing[12] * 8,
    stackGap: primitiveSpacing[4],
    copyGap: primitiveSpacing[2],
    actionsGap: primitiveSpacing[2],
  },
  icon: {
    size: primitiveSizing.lg,
    radius: primitiveRadius.lg,
  },
  typography: {
    title: {
      sm: primitiveFontSize.sm,
      md: primitiveFontSize.base,
      lg: primitiveFontSize.lg,
    },
    description: {
      sm: primitiveFontSize.xs,
      md: primitiveFontSize.sm,
      lg: primitiveFontSize.sm,
    },
    titleWeight: primitiveFontWeight.semibold,
    titleLineHeight: primitiveSpacing[6],
    descriptionLineHeight: primitiveSpacing[6],
  },
} as const;
