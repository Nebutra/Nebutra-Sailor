import { describe, expect, it } from "vitest";
import { logoPlateFromPixels } from "../logo-plate";

const SIDE = 16;

/** A SIDE×SIDE RGBA image: `fill` everywhere, `mark` in the centre square. */
function image(fill: number[], mark: number[]): Uint8ClampedArray {
  const px = new Uint8ClampedArray(SIDE * SIDE * 4);
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++) {
      const inside = x >= 4 && x < 12 && y >= 4 && y < 12;
      px.set(inside ? mark : fill, (y * SIDE + x) * 4);
    }
  return px;
}

const lightness = (hex: string) => Number.parseInt(hex.slice(1, 3), 16);

describe("logoPlateFromPixels", () => {
  it("puts a white mark on transparency on a dark plate — never on white", () => {
    const plate = logoPlateFromPixels(image([0, 0, 0, 0], [255, 255, 255, 255]), SIDE);
    expect(plate?.own).toBe(false);
    expect(lightness(plate?.plate ?? "#ffffff")).toBeLessThan(64);
  });

  it("puts a dark mark on transparency on a light plate", () => {
    const plate = logoPlateFromPixels(image([0, 0, 0, 0], [20, 30, 80, 255]), SIDE);
    expect(lightness(plate?.plate ?? "#000000")).toBeGreaterThan(200);
  });

  it("keeps a logo that brings its own background on that colour", () => {
    const plate = logoPlateFromPixels(image([1, 1, 1, 255], [255, 255, 255, 255]), SIDE);
    expect(plate).toEqual({ plate: "#010101", own: true });
  });

  it("tints a colourful mark's plate towards its hue, and a neutral one towards the House grays", () => {
    const red = logoPlateFromPixels(image([0, 0, 0, 0], [200, 20, 20, 255]), SIDE)?.plate ?? "";
    const [r, , b] = [1, 3, 5].map((i) => Number.parseInt(red.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b ?? 0);
    const white = logoPlateFromPixels(image([0, 0, 0, 0], [255, 255, 255, 255]), SIDE)?.plate ?? "";
    const [wr, , wb] = [1, 3, 5].map((i) => Number.parseInt(white.slice(i, i + 2), 16));
    expect(wb).toBeGreaterThan(wr ?? 0);
  });

  it("has nothing to say about an empty image", () => {
    expect(logoPlateFromPixels(image([0, 0, 0, 0], [0, 0, 0, 0]), SIDE)).toBeNull();
  });
});
