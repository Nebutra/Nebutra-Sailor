/**
 * Input Component Tokens — Layer 3
 *
 * Height locked to 40px (Geist md default).
 * Supports prefix/suffix slots and clearable.
 */

import { primitiveFontSize, primitiveRadius, primitiveSpacing } from "../primitive";

export const inputTokens = {
  /** Fixed height — aligns with button md for consistent form rows */
  height: 40, // px — primitiveSizing.md

  paddingX: primitiveSpacing[3], // 12px
  borderRadius: primitiveRadius.md, // 6px
  fontSize: primitiveFontSize.sm, // 14px

  /** Size of the × clear button icon */
  clearButtonSize: 16,

  /** Gap between prefix/suffix icon and input text */
  prefixSuffixGap: primitiveSpacing[2], // 8px

  /** Width reserved for prefix/suffix containers */
  affixWidth: 36, // px
} as const;
