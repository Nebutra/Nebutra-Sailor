import { describe, expect, it } from "vitest";
import { glyphShapes } from "../../brand/glyph";
import type { ChartGeometry } from "../hero/live-chart";
import { easeInOut, glyphFrame, glyphOnly, hexToLinear, packShapes, POSTER_SIZE, unfold } from "./field-shapes";
import { MAX_SHAPES, SHAPE_STRIDE } from "./shaders";

const palette = { up: hexToLinear("#089981"), down: hexToLinear("#f23645"), accent: hexToLinear("#4C77C6") };
const geometry: ChartGeometry = {
  width: 800,
  height: 400,
  lastPriceY: 180,
  candles: [
    { x: 100, width: 8, open: 200, close: 150, high: 120, low: 220, up: true },
    { x: 700, width: 8, open: 150, close: 190, high: 140, low: 210, up: false },
  ],
};

describe("light field emitters", () => {
  it("converts token hex to linear light", () => {
    expect(hexToLinear("#FFFFFF")).toEqual([1, 1, 1]);
    expect(hexToLinear("#000000")).toEqual([0, 0, 0]);
    expect(hexToLinear("#4C77C6")[2]).toBeCloseTo(0.5647, 3);
  });

  it("places the glyph exactly where the poster shows it, at any panel size", () => {
    const poster = glyphFrame(POSTER_SIZE[0], POSTER_SIZE[1]);
    expect(poster).toEqual({ centre: [1180, 350], size: 238 });
    // object-fit: cover; object-position: right center on a narrow mobile panel
    const mobile = glyphFrame(358, 320);
    const scale = 320 / 700;
    expect(mobile.centre[0]).toBeCloseTo(358 - (1600 - 1180) * scale, 5);
    expect(mobile.size).toBeCloseTo(238 * scale, 5);
  });

  it("opens as the glyph alone and lands exactly on the chart", () => {
    const start = unfold(geometry, 800, 400, palette, 0);
    const glyph = glyphOnly(800, 400, palette);
    expect(start[0]).toMatchObject({ a: glyph[0]!.a, b: glyph[0]!.b, color: palette.accent });
    expect(start).toHaveLength(4);
    const end = unfold(geometry, 800, 400, palette, 1);
    const near = (actual: readonly number[], expected: readonly number[]) =>
      actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 9));
    expect(end[0]).toMatchObject({ kind: "capsule", a: [100, 120], b: [100, 220] });
    near(end[0]!.color, palette.up);
    expect(end[1]).toMatchObject({ kind: "box", a: [96, 150], b: [104, 200] });
    near(end[3]!.color, palette.down);
    expect(end.at(-1)).toMatchObject({ a: [0, 180], b: [800, 180], color: palette.accent });
  });

  it("eases in and out, from 0 to 1", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBeCloseTo(1, 6);
    expect(easeInOut(0.2)).toBeLessThan(0.2);
    expect(easeInOut(0.8)).toBeGreaterThan(0.8);
  });

  it("packs shapes into the storage layout, scaled to field texels", () => {
    const shapes = glyphShapes([10, 10], 16).map((shape) => ({ ...shape, color: [1, 0, 0] as const, intensity: 2, occludes: 1 }));
    const { data, count } = packShapes(shapes, 0.5);
    expect(count).toBe(2);
    expect(data.length).toBe(MAX_SHAPES * SHAPE_STRIDE * 4);
    expect(Array.from(data.slice(12, 24))).toEqual([1, 0, 1, 0, 3, 3, 7, 7, 1, 0, 0, 2]);
  });
});
