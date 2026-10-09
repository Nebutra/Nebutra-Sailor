/**
 * What the hero field lights, as emitter shapes: the KCQ candle glyph alone (the poster and the
 * opening frame), the glyph unfolding into the live candles, then the candles with the last-price
 * line and the visitor's crosshair. Pure functions: geometry in, packed Float32Array out.
 */
import { type EmitterShape, glyphShapes } from "../../brand/glyph";
import type { ChartGeometry } from "../hero/live-chart";
import { MAX_SHAPES, SHAPE_STRIDE } from "./shaders";

export type Rgb = readonly [number, number, number];

export interface FieldPalette {
  /** Linear RGB, from the generated tokens at runtime. */
  readonly up: Rgb;
  readonly down: Rgb;
  readonly accent: Rgb;
}

/** Present exposure per mode: dark adds light to the ground, light tints it (shaders.ts). */
export const EXPOSURE = { dark: 0.4, light: 0.9 } as const;

/** Radiance per role (linear, pre-tonemap). The glyph is the brightest light on the page. */
export const RADIANCE = { glyph: 3.2, candle: 2.1, lastPrice: 1.4, crosshair: 2.4 } as const;

interface LitShape extends EmitterShape {
  readonly color: Rgb;
  readonly intensity: number;
  /** Every emitter must occlude: the tracer only finds light where the distance field has a seed. */
  readonly occludes: number;
}

/** sRGB hex (`#RRGGBB` or `#RRGGBBAA`) to linear RGB. */
export function hexToLinear(hex: string): Rgb {
  const value = hex.trim().replace("#", "");
  const channel = (offset: number) => {
    const c = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error(`Not a hex colour: ${hex}`);
  return [channel(0), channel(2), channel(4)];
}

/** Ease-in-out for on-screen morphs (`--klc-motion-ease-in-out`, cubic-bezier(0.77, 0, 0.175, 1)). */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  // Cubic Bézier y(x) solved by Newton iteration on x(s).
  const [x1, y1, x2, y2] = [0.77, 0, 0.175, 1];
  const bez = (s: number, a: number, b: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  let s = x;
  for (let i = 0; i < 8; i++) {
    const dx = 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s ** 2;
    if (Math.abs(dx) < 1e-6) break;
    s -= (bez(s, x1, x2) - x) / dx;
    s = Math.min(1, Math.max(0, s));
  }
  return bez(s, y1, y2);
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixPoint = (a: readonly [number, number], b: readonly [number, number], t: number): [number, number] => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
];
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/**
 * Where the glyph sits. The poster is drawn at POSTER_SIZE and shown with `object-fit: cover;
 * object-position: right center`; the live field places the glyph through the same mapping, so
 * when the field replaces the poster the mark does not move. It sits right of centre, near where
 * the newest candle will land, and the series unfolds leftward from it.
 */
export const POSTER_SIZE = [1600, 700] as const;
const POSTER_GLYPH = { x: 1180, y: 350, size: 238 } as const;

export function glyphFrame(width: number, height: number) {
  const scale = Math.max(width / POSTER_SIZE[0], height / POSTER_SIZE[1]);
  return {
    centre: [width - (POSTER_SIZE[0] - POSTER_GLYPH.x) * scale, height / 2 + (POSTER_GLYPH.y - POSTER_SIZE[1] / 2) * scale] as const,
    size: POSTER_GLYPH.size * scale,
  };
}

export function glyphOnly(width: number, height: number, palette: FieldPalette): LitShape[] {
  const { centre, size } = glyphFrame(width, height);
  return glyphShapes(centre, size).map((shape) => ({
    ...shape,
    color: palette.accent,
    intensity: RADIANCE.glyph,
    occludes: 1,
  }));
}

/**
 * The unfold: every candle starts as the glyph and travels to its place, the ones nearest the
 * mark first, so at `progress` 0 the field is exactly the glyph and at 1 exactly the chart.
 */
export function unfold(
  geometry: ChartGeometry,
  width: number,
  height: number,
  palette: FieldPalette,
  progress: number,
): LitShape[] {
  const [wick, body] = glyphOnly(width, height, palette) as [LitShape, LitShape];
  const { centre } = glyphFrame(width, height);
  const reach = Math.max(1, width / 2);
  const shapes: LitShape[] = [];
  for (const candle of geometry.candles) {
    const delay = (Math.min(1, Math.abs(candle.x - centre[0]) / reach) * 0.45);
    const p = easeInOut((progress - delay) / 0.55);
    const color = mixRgb(palette.accent, candle.up ? palette.up : palette.down, p);
    const intensity = mix(RADIANCE.glyph, RADIANCE.candle, p);
    const half = Math.max(0.5, candle.width / 2);
    const top = Math.min(candle.open, candle.close);
    const bottom = Math.max(Math.max(candle.open, candle.close), top + 1);
    shapes.push({
      kind: "capsule",
      a: mixPoint(wick.a, [candle.x, candle.high], p),
      b: mixPoint(wick.b, [candle.x, candle.low], p),
      radius: mix(wick.radius, Math.max(0.5, candle.width * 0.08), p),
      color,
      intensity,
      occludes: 1,
    });
    shapes.push({
      kind: "box",
      a: mixPoint(body.a, [candle.x - half, top], p),
      b: mixPoint(body.b, [candle.x + half, bottom], p),
      radius: 0,
      color,
      intensity,
      occludes: 1,
    });
  }
  if (geometry.lastPriceY !== null && progress > 0.75) {
    const t = (progress - 0.75) / 0.25;
    shapes.push({
      kind: "capsule",
      a: [0, geometry.lastPriceY],
      b: [geometry.width * t, geometry.lastPriceY],
      radius: 0.5,
      color: palette.accent,
      intensity: RADIANCE.lastPrice,
      occludes: 1,
    });
  }
  return shapes;
}

export function crosshair(point: readonly [number, number], palette: FieldPalette): LitShape {
  return { kind: "capsule", a: point, b: point, radius: 3, color: palette.accent, intensity: RADIANCE.crosshair, occludes: 1 };
}

/** Pack shapes for the storage buffer, scaling CSS pixels to field texels. */
export function packShapes(shapes: readonly LitShape[], scale: number, out?: Float32Array<ArrayBuffer>) {
  const count = Math.min(shapes.length, MAX_SHAPES);
  const data = out ?? new Float32Array(MAX_SHAPES * SHAPE_STRIDE * 4);
  shapes.slice(0, count).forEach((shape, index) => {
    const base = index * SHAPE_STRIDE * 4;
    data.set([shape.kind === "box" ? 1 : 0, shape.radius * scale, shape.occludes, 0], base);
    data.set([shape.a[0] * scale, shape.a[1] * scale, shape.b[0] * scale, shape.b[1] * scale], base + 4);
    data.set([...shape.color, shape.intensity], base + 8);
  });
  return { data, count };
}
