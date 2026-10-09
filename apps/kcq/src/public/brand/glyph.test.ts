import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GLYPH, GLYPH_GRID, glyphContains, glyphDots, glyphPath, glyphShapes } from "./glyph";

describe("KCQ candle glyph", () => {
  it("is one wick and one body on the 16-unit grid", () => {
    expect(glyphPath()).toBe("M7 1h2v14h-2zM4 4h8v8h-8z");
    expect(GLYPH.wick.x + GLYPH.wick.width / 2).toBe(GLYPH_GRID / 2);
    expect(GLYPH.body.x + GLYPH.body.width / 2).toBe(GLYPH_GRID / 2);
  });

  it("is the favicon's only shape, so every rendering of the mark is the same mark", () => {
    const favicon = readFileSync(new URL("../../../public/favicon.svg", import.meta.url), "utf8");
    expect(favicon.match(/ d="([^"]+)"/)?.[1]).toBe(glyphPath());
  });

  it("becomes a wick capsule and a body box for the light field", () => {
    const [wick, body] = glyphShapes([80, 80], 160);
    expect(wick).toMatchObject({ kind: "capsule", a: [80, 20], b: [80, 140], radius: 10 });
    expect(body).toMatchObject({ kind: "box", a: [40, 40], b: [120, 120] });
  });

  it("samples onto the dot matrix in top-to-bottom bands", () => {
    const dots = glyphDots(16, 16, 16, 4);
    const lit = dots.filter((dot) => dot.onGlyph);
    expect(lit.length).toBe(dots.filter((dot) => glyphContains(dot.column + 0.5, dot.row + 0.5)).length);
    expect(new Set(lit.map((dot) => dot.band))).toEqual(new Set([0, 1, 2, 3]));
    const top = lit.find((dot) => dot.band === 0)!;
    const bottom = lit.find((dot) => dot.band === 3)!;
    expect(top.row).toBeLessThan(bottom.row);
  });
});
