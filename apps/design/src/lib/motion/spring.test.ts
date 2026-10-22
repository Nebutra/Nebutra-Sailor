import { describe, expect, it } from "vitest";
import {
  clampSpring,
  dampingRatio,
  describeFeel,
  PRESET_NAMES,
  SPRING_LIMITS,
  sampleSpring,
  springCurve,
  springSettleMs,
  springToLinear,
  springValue,
} from "./spring";

const snappy = { stiffness: 400, damping: 30, mass: 1 };
const smooth = { stiffness: 170, damping: 26, mass: 1 };
const bouncy = { stiffness: 300, damping: 14, mass: 1 };

describe("springValue", () => {
  it("starts at rest and ends on the target", () => {
    for (const p of [snappy, smooth, bouncy]) {
      expect(springValue(p, 0)).toBe(0);
      expect(springValue(p, 10)).toBeCloseTo(1, 4);
    }
  });

  it("matches the analytic critically damped solution", () => {
    // k=100, m=1 -> w0=10, zeta=1 needs c=20: x(t) = 1 - e^{-w0 t}(1 + w0 t)
    const p = { stiffness: 100, damping: 20, mass: 1 };
    const t = 0.25;
    expect(springValue(p, t)).toBeCloseTo(1 - Math.exp(-10 * t) * (1 + 10 * t), 10);
  });

  it("is continuous across the critical-damping boundary", () => {
    const below = springValue({ stiffness: 100, damping: 19.9999, mass: 1 }, 0.3);
    const at = springValue({ stiffness: 100, damping: 20, mass: 1 }, 0.3);
    const above = springValue({ stiffness: 100, damping: 20.0001, mass: 1 }, 0.3);
    expect(Math.abs(below - at)).toBeLessThan(1e-4);
    expect(Math.abs(above - at)).toBeLessThan(1e-4);
  });

  it("overshoots only when underdamped", () => {
    const peak = (p: typeof snappy) =>
      Math.max(...Array.from({ length: 480 }, (_, i) => springValue(p, i / 240)));
    expect(peak(bouncy)).toBeGreaterThan(1.2);
    expect(peak(snappy)).toBeGreaterThan(1);
    expect(peak(snappy)).toBeLessThan(1.05);
    expect(peak(smooth)).toBeLessThanOrEqual(1.0005);
  });

  it("rejects non-physical parameters instead of returning NaN", () => {
    expect(() => springValue({ stiffness: 0, damping: 10, mass: 1 }, 1)).toThrow(RangeError);
    expect(() => springValue({ stiffness: 100, damping: -1, mass: 1 }, 1)).toThrow(RangeError);
    expect(() => springValue({ stiffness: 100, damping: 10, mass: 0 }, 1)).toThrow(RangeError);
    expect(() => springValue({ stiffness: Number.NaN, damping: 10, mass: 1 }, 1)).toThrow(
      RangeError,
    );
  });
});

describe("settle time and linear()", () => {
  it("scales with the natural frequency when the damping ratio is held", () => {
    // At fixed damping, a stiffer spring is *less* damped and rings for longer,
    // so settle time is not monotone in stiffness alone. Hold zeta instead:
    // 4x stiffness with 2x damping doubles the frequency and halves the time.
    const base = springSettleMs(snappy);
    const stiffer = springSettleMs({ stiffness: 1600, damping: 60, mass: 1 });
    expect(stiffer / base).toBeCloseTo(0.5, 1);
    // 4x mass with 2x damping halves the frequency and doubles the time.
    const heavier = springSettleMs({ stiffness: 400, damping: 60, mass: 4 });
    expect(heavier / base).toBeCloseTo(2, 1);
  });

  it("never reports longer than the cap, even for an undamped spring", () => {
    expect(springSettleMs({ stiffness: 100, damping: 0, mass: 1 })).toBeLessThanOrEqual(10_000);
  });

  it("pins the first sample to 0 and the last to 1", () => {
    for (const p of [snappy, smooth, bouncy]) {
      const { points } = sampleSpring(p);
      expect(points[0]).toBe(0);
      expect(points.at(-1)).toBe(1);
    }
  });

  it("emits a well-formed linear() with the requested stop count", () => {
    const css = springToLinear(bouncy, 25);
    expect(css).toMatch(/^linear\(0, [\d., -]+, 1\)$/);
    expect(css.slice(7, -1).split(", ")).toHaveLength(25);
    expect(css).not.toContain("-0,");
  });

  it("rejects a sample count that cannot describe a curve", () => {
    expect(() => sampleSpring(snappy, 1)).toThrow(RangeError);
    expect(() => sampleSpring(snappy, 2.5)).toThrow(RangeError);
  });

  it("stays within half a percent of the true curve between stops", () => {
    const { durationMs, points } = sampleSpring(bouncy);
    let worst = 0;
    for (let i = 0; i < 400; i += 1) {
      const x = (i / 399) * (points.length - 1);
      const lo = Math.floor(x);
      const hi = Math.min(points.length - 1, lo + 1);
      const interpolated = points[lo]! + (points[hi]! - points[lo]!) * (x - lo);
      const exact = springValue(bouncy, ((i / 399) * durationMs) / 1000);
      worst = Math.max(worst, Math.abs(interpolated - exact));
    }
    expect(worst).toBeLessThan(0.05);
  });
});

describe("springCurve geometry", () => {
  const size = { width: 320, height: 160, padding: 12 };

  it("starts at the bottom-left and finishes on the target line", () => {
    const curve = springCurve(smooth, size);
    expect(curve.d.startsWith(`M${size.padding},`)).toBe(true);
    const [, firstY] = curve.d.slice(1).split(" ")[0]!.split(",");
    expect(Number(firstY)).toBeCloseTo(curve.zeroY, 1);
    expect(curve.zeroY).toBeGreaterThan(curve.targetY);
  });

  it("lifts the peak above the target line only when it overshoots", () => {
    expect(springCurve(bouncy, size).peakY).toBeLessThan(springCurve(bouncy, size).targetY);
    expect(springCurve(smooth, size).peakY).toBeGreaterThanOrEqual(
      springCurve(smooth, size).targetY - 0.5,
    );
  });

  it("keeps every point inside the box", () => {
    const curve = springCurve(bouncy, size);
    const ys = [...curve.d.matchAll(/(?:M|L)[\d.]+,([\d.-]+)/g)].map((m) => Number(m[1]));
    expect(ys.length).toBeGreaterThan(20);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(size.height);
    }
  });
});

describe("lab helpers", () => {
  it("clamps slider input into the physical range", () => {
    expect(clampSpring({ stiffness: 5000, damping: -3, mass: 0 })).toEqual({
      stiffness: SPRING_LIMITS.stiffness.max,
      damping: SPRING_LIMITS.damping.min,
      mass: SPRING_LIMITS.mass.min,
    });
  });

  it("names the three presets the tokens ship", () => {
    expect(PRESET_NAMES).toEqual(["snappy", "smooth", "bouncy"]);
  });

  it("describes the feel from the damping ratio", () => {
    expect(dampingRatio(bouncy)).toBeLessThan(0.5);
    expect(describeFeel(bouncy)).toMatch(/bounc/i);
    expect(describeFeel(smooth)).toMatch(/no overshoot|critical/i);
    expect(describeFeel({ stiffness: 100, damping: 80, mass: 1 })).toMatch(/sluggish|overdamped/i);
  });
});
