/**
 * Table Component Tokens — Layer 3
 *
 * Tables are dense comparison surfaces. These tokens lock row rhythm,
 * numeric alignment, and container geometry without letting callers reach
 * into primitive color scales.
 */

import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const tableTokens = {
  wrapper: {
    minWidth: 248,
    padding: primitiveSpacing[6],
    radius: primitiveRadius.lg,
  },
  row: {
    radius: primitiveRadius.sm,
  },
  cell: {
    paddingX: primitiveSpacing[2],
    paddingY: 10,
  },
  header: {
    height: primitiveSpacing[10],
  },
  typography: {
    size: primitiveFontSize.sm,
    headingWeight: primitiveFontWeight.medium,
    bodyWeight: primitiveFontWeight.normal,
  },
  spacer: {
    bodyTop: primitiveSpacing[3],
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;
