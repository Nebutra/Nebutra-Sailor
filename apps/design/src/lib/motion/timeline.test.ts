import { describe, expect, it } from "vitest";
import { itemOffset, itemOpacity, staggerDelays, timelineDurationMs } from "./timeline";

const spring = { stiffness: 400, damping: 30, mass: 1 };

describe("staggerDelays", () => {
  it("steps by the gap and starts at zero", () => {
    expect(staggerDelays(4, 60)).toEqual([0, 60, 120, 180]);
  });

  it("handles empty and single lists", () => {
    expect(staggerDelays(0, 60)).toEqual([]);
    expect(staggerDelays(1, 60)).toEqual([0]);
  });

  it("rejects a negative gap or count", () => {
    expect(() => staggerDelays(-1, 60)).toThrow(RangeError);
    expect(() => staggerDelays(3, -5)).toThrow(RangeError);
  });
});

describe("timelineDurationMs", () => {
  it("ends when the last item has settled", () => {
    expect(timelineDurationMs(5, 60, 400)).toBe(4 * 60 + 400);
    expect(timelineDurationMs(0, 60, 400)).toBe(0);
    expect(timelineDurationMs(1, 60, 400)).toBe(400);
  });
});

describe("itemOffset", () => {
  it("is the full distance before the item starts and zero once it has settled", () => {
    expect(itemOffset(0, 120, spring, 8)).toBe(8);
    expect(itemOffset(119, 120, spring, 8)).toBe(8);
    expect(Math.abs(itemOffset(5000, 120, spring, 8))).toBeLessThan(0.01);
  });

  it("is monotone toward zero for a spring that does not overshoot", () => {
    const smooth = { stiffness: 170, damping: 26, mass: 1 };
    let previous = Number.POSITIVE_INFINITY;
    for (let t = 0; t <= 1000; t += 25) {
      const value = itemOffset(t, 0, smooth, 16);
      expect(value).toBeLessThanOrEqual(previous + 1e-6);
      previous = value;
    }
  });

  it("lets a bouncy spring pass through its target", () => {
    const bouncy = { stiffness: 300, damping: 14, mass: 1 };
    const samples = Array.from({ length: 80 }, (_, i) => itemOffset(i * 10, 0, bouncy, 16));
    expect(Math.min(...samples)).toBeLessThan(-1);
  });
});

describe("itemOpacity", () => {
  it("is clamped to [0, 1] even while the spring overshoots", () => {
    const bouncy = { stiffness: 300, damping: 14, mass: 1 };
    for (let t = 0; t <= 1200; t += 10) {
      const value = itemOpacity(t, 0, bouncy);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("is invisible before its turn and opaque after", () => {
    expect(itemOpacity(10, 200, spring)).toBe(0);
    expect(itemOpacity(5000, 200, spring)).toBeCloseTo(1, 3);
  });
});
