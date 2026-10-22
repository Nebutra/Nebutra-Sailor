import { describe, expect, it } from "vitest";
import { advanceSpring, isAtRest, retarget, type SpringState } from "./sim";
import { springValue } from "./spring";

const params = { stiffness: 300, damping: 24, mass: 1 };

function run(state: SpringState, target: number, seconds: number): SpringState {
  return advanceSpring(state, target, params, seconds);
}

describe("advanceSpring", () => {
  it("converges on the target and comes to rest", () => {
    const end = run({ position: 0, velocity: 0 }, 100, 4);
    expect(end.position).toBeCloseTo(100, 2);
    expect(isAtRest(end, 100)).toBe(true);
  });

  it("is a no-op for zero elapsed time", () => {
    const start = { position: 12, velocity: 3 };
    expect(run(start, 50, 0)).toEqual(start);
  });

  it("agrees with the closed-form curve from rest", () => {
    // Same spring, same start: the advance must be the analytic curve, otherwise
    // the interrupt lane would not be showing the token's spring.
    for (const t of [0.05, 0.1, 0.2, 0.4, 0.8]) {
      const sim = run({ position: 0, velocity: 0 }, 100, t).position / 100;
      expect(Math.abs(sim - springValue(params, t))).toBeLessThan(1e-9);
    }
  });

  it("is exact in every damping regime, and splitting a step changes nothing", () => {
    const regimes = [
      { stiffness: 300, damping: 14, mass: 1 }, // underdamped
      { stiffness: 100, damping: 20, mass: 1 }, // critically damped
      { stiffness: 100, damping: 60, mass: 1 }, // overdamped
    ];
    for (const p of regimes) {
      const start = { position: 10, velocity: -40 };
      const whole = advanceSpring(start, 70, p, 0.3);
      const halves = advanceSpring(advanceSpring(start, 70, p, 0.1), 70, p, 0.2);
      expect(halves.position).toBeCloseTo(whole.position, 8);
      expect(halves.velocity).toBeCloseTo(whole.velocity, 8);
    }
  });

  it("reports a velocity that is the derivative of the position", () => {
    const start = { position: 0, velocity: 25 };
    const h = 1e-6;
    const a = advanceSpring(start, 100, params, 0.15);
    const b = advanceSpring(start, 100, params, 0.15 + h);
    expect((b.position - a.position) / h).toBeCloseTo(a.velocity, 2);
  });

  it("does not blow up on a large time step", () => {
    const end = run({ position: 0, velocity: 0 }, 100, 5);
    expect(Number.isFinite(end.position)).toBe(true);
    expect(Math.abs(end.position)).toBeLessThan(1000);
  });
});

describe("retarget", () => {
  it("keeps position and velocity exactly when the goal changes mid-flight", () => {
    const midFlight = run({ position: 0, velocity: 0 }, 100, 0.12);
    const next = retarget(midFlight);
    expect(next).toEqual(midFlight);
    expect(midFlight.velocity).not.toBe(0);
  });

  it("carries momentum through the turn: it overshoots the old direction before reversing", () => {
    const midFlight = run({ position: 0, velocity: 0 }, 100, 0.12);
    // Reverse to 0 while still moving toward 100.
    const after = run(retarget(midFlight), 0, 0.02);
    expect(after.position).toBeGreaterThan(midFlight.position - 1e-9);
  });

  it("produces a continuous trajectory across the interruption", () => {
    let state: SpringState = { position: 0, velocity: 0 };
    let target = 100;
    let last = state.position;
    let maxStep = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      if (frame === 20 || frame === 35) target = target === 100 ? 0 : 100;
      state = advanceSpring(state, target, params, 1 / 60);
      maxStep = Math.max(maxStep, Math.abs(state.position - last));
      last = state.position;
    }
    // Never teleports: no single 60fps frame moves more than a fifth of the travel.
    expect(maxStep).toBeLessThan(20);
  });
});

describe("isAtRest", () => {
  it("needs both position and velocity to be small", () => {
    expect(isAtRest({ position: 100, velocity: 0 }, 100)).toBe(true);
    expect(isAtRest({ position: 100, velocity: 50 }, 100)).toBe(false);
    expect(isAtRest({ position: 90, velocity: 0 }, 100)).toBe(false);
  });
});
