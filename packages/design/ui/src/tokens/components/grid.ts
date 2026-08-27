/**
 * Grid Component Tokens — Layer 3
 *
 * Two-dimensional guide layouts for docs, marketing, and feature breakdowns.
 * The primitive consumes these values through local CSS variables so guide
 * contrast, clipping, and responsive math stay centralized.
 */

import { primitiveRadius, primitiveSpacing } from "../primitive";

export const gridTokens = {
  guide: {
    width: 1,
    color: "hsl(var(--border))",
  },
  cell: {
    minBlockSize: primitiveSpacing[12], // 48px
    padding: primitiveSpacing[3], // 12px
    solidBackground: "hsl(var(--background))",
    debugBackground: "hsl(var(--muted) / 0.28)",
  },
  radius: primitiveRadius.md, // 6px
  breakpoints: {
    md: 768,
    lg: 1024,
  },
} as const;

export type GridBreakpoint = keyof typeof gridTokens.breakpoints | "sm";
