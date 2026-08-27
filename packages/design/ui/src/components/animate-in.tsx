"use client";

/**
 * Compatibility re-export — the governed AnimateIn lives with the primitives
 * so `/components` and `/primitives` cannot drift on default preset or rails.
 */
export {
  AnimateIn,
  AnimateInGroup,
  type AnimateInGroupProps,
  type AnimateInProps,
  AnimateSwap,
  type AnimateSwapProps,
} from "../primitives/animate-in";
