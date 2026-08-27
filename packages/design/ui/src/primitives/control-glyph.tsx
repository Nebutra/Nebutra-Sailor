/**
 * Control glyphs — the tick and dash drawn inside a checkbox.
 *
 * These are deliberately NOT in `@nebutra/icons`. That package is generated:
 * `src/index.ts` and every file in `src/components/` are rewritten from
 * `src/svg/*.svg` by `pnpm --filter @nebutra/icons generate`, and the barrel it
 * writes declares its source as vercel.com/geist/icons. A hand-authored glyph
 * placed there would either be erased by the next generate run or become a
 * non-Geist file inside a set that claims to be pure Geist.
 *
 * They also cannot BE the Geist icons. `Check` is fill-based: a 16x16 outlined
 * path whose tick runs corner to corner with ~1px of padding and a nominal 1.5px
 * weight, tuned to stand alone on a text baseline. A checkbox tick is stroke-based
 * and must sit visibly inset from the box border, which means a different inset,
 * a different weight, and — critically — inheriting `stroke` and `fill` from the
 * control surface so the same glyph can be hidden by painting it in the box's own
 * colour. `<Check className="h-3 w-3" />` renders none of that.
 *
 * Geometry: authored in a 16-unit viewBox at 1:1 with the rendered 16px control,
 * so `strokeWidth` is also the rendered pixel weight. The tick spans x 4.8..11.2
 * (30% inset each side) and y 5.6..10, optically centred a hair high the way a
 * checkmark reads.
 *
 * Colour: no `fill` or `stroke` attribute is set. Both inherit, which is what lets
 * a control paint the tick in its own background to hide it (the unchecked state)
 * without unmounting it. A control that wants the triangle interior transparent
 * instead passes `fill="none"`.
 */
import type * as React from "react";

export interface ControlGlyphProps extends React.SVGProps<SVGSVGElement> {
  /** Rendered size in px. The viewBox is 16, so 16 keeps stroke width at 1:1. */
  size?: number | string;
}

const DEFAULT_STROKE_WIDTH = 1.6;

/** Checkmark for a checked checkbox. */
export function CheckGlyph({
  size = 16,
  width,
  height,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  ...props
}: ControlGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      viewBox="0 0 16 16"
      width={width ?? size}
      height={height ?? size}
      {...props}
    >
      <path
        d="M11.2 5.6L6.8 10L4.8 8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

/** Horizontal dash for a partially-checked (indeterminate) checkbox. */
export function IndeterminateGlyph({
  size = 16,
  width,
  height,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  ...props
}: ControlGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      viewBox="0 0 16 16"
      width={width ?? size}
      height={height ?? size}
      {...props}
    >
      <line
        x1="4"
        x2="12"
        y1="8"
        y2="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
