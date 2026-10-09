/**
 * The KCQ candle glyph (fork design.md §2.2): one wick and one body on a 16-unit grid, the same
 * stroke grid as the `KCQ` monogram. Every rendering of the mark reads this one definition: the
 * favicon, the nav lockup, the hero light emitter (as SDF segments), the dot-matrix agent field
 * and the OG image. Nothing redraws it by hand.
 */
export const GLYPH_GRID = 16;

export interface GlyphRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Wick 2 units wide, full height less one unit of air; body 8 × 8, centred. */
export const GLYPH = {
  wick: { x: 7, y: 1, width: 2, height: 14 },
  body: { x: 4, y: 4, width: 8, height: 8 },
} as const satisfies Record<"wick" | "body", GlyphRect>;

const rectPath = ({ x, y, width, height }: GlyphRect) => `M${x} ${y}h${width}v${height}h${-width}z`;

/** SVG path data in grid units (viewBox `0 0 16 16`). */
export function glyphPath(): string {
  return `${rectPath(GLYPH.wick)}${rectPath(GLYPH.body)}`;
}

/** Whether a grid-space point lies on the glyph. */
export function glyphContains(x: number, y: number): boolean {
  return [GLYPH.wick, GLYPH.body].some(
    (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height,
  );
}

/**
 * A light emitter for the radiance field, in pixels: a capsule (segment `a`–`b` with `radius`) or
 * an axis-aligned box (`a` = min corner, `b` = max corner, `radius` = corner rounding). These are
 * the two SDF primitives the field paints; candles use the same pair (wick capsule, body box).
 */
export interface EmitterShape {
  readonly kind: "capsule" | "box";
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
  readonly radius: number;
}

export function glyphShapes(centre: readonly [number, number], size: number): EmitterShape[] {
  const unit = size / GLYPH_GRID;
  const at = (x: number, y: number): [number, number] => [
    centre[0] + (x - GLYPH_GRID / 2) * unit,
    centre[1] + (y - GLYPH_GRID / 2) * unit,
  ];
  const { wick, body } = GLYPH;
  const wickX = wick.x + wick.width / 2;
  const half = (wick.width / 2) * unit;
  return [
    {
      kind: "capsule",
      a: at(wickX, wick.y + wick.width / 2),
      b: at(wickX, wick.y + wick.height - wick.width / 2),
      radius: half,
    },
    { kind: "box", a: at(body.x, body.y), b: at(body.x + body.width, body.y + body.height), radius: 0 },
  ];
}

/**
 * The glyph sampled on a dot matrix of `columns × rows` cells centred in a field; each cell
 * reports whether it lies on the mark and which band (top to bottom) it belongs to, so the agent
 * field can light the mark band by band as tool calls complete.
 */
export interface GlyphDot {
  readonly column: number;
  readonly row: number;
  readonly onGlyph: boolean;
  readonly band: number;
}

export function glyphDots(columns: number, rows: number, glyphCells: number, bands: number): GlyphDot[] {
  const left = (columns - glyphCells) / 2;
  const top = (rows - glyphCells) / 2;
  const scale = GLYPH_GRID / glyphCells;
  const dots: GlyphDot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const gx = (column + 0.5 - left) * scale;
      const gy = (row + 0.5 - top) * scale;
      const onGlyph = glyphContains(gx, gy);
      const band = onGlyph ? Math.min(bands - 1, Math.floor((gy / GLYPH_GRID) * bands)) : -1;
      dots.push({ column, row, onGlyph, band });
    }
  }
  return dots;
}
