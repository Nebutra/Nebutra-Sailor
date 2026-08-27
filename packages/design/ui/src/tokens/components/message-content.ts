/**
 * MessageContent Component Tokens — Layer 3
 *
 * Spacing and shape constants for AI markdown surfaces. Runtime color stays
 * semantic through Tailwind token utilities in the primitive.
 */

import { primitiveRadius, primitiveSpacing } from "../primitive";

export type MessageContentDensity = "compact" | "comfortable";

export const messageContentTokens = {
  code: {
    radius: primitiveRadius.lg,
    padding: primitiveSpacing[3],
  },
  inlineCode: {
    radius: primitiveRadius.sm,
    paddingX: primitiveSpacing[1],
    paddingY: primitiveSpacing[1] / 2,
  },
  table: {
    radius: primitiveRadius.lg,
  },
  density: {
    compact: {
      paragraphMargin: primitiveSpacing[1],
      headingMargin: primitiveSpacing[1] + primitiveSpacing[1] / 2,
      preMargin: primitiveSpacing[2],
    },
    comfortable: {
      paragraphMargin: primitiveSpacing[2],
      headingMargin: primitiveSpacing[3],
      preMargin: primitiveSpacing[3],
    },
  },
} as const;
