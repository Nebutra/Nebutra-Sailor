/**
 * Textarea Component Tokens — Layer 3
 *
 * Mirrors the Input focus and radius contract while preserving textarea-specific
 * vertical sizing.
 */

import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
} from "../primitive";

export const textareaTokens = {
  minHeight: primitiveSizing["2xl"],
  paddingX: primitiveSpacing[3],
  paddingY: primitiveSpacing[2],
  fontSize: primitiveFontSize.sm,
  radius: primitiveRadius.md,
  focusRingWidth: 3,
} as const;
