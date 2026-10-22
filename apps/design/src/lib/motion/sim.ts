/**
 * A spring you can interrupt.
 *
 * The closed form in `spring.ts` answers "where is a spring that started from
 * rest at t?". That stops being true the moment the target changes mid-flight:
 * the element is somewhere, moving at some speed, and the new spring has to
 * start from *that*. So the interrupt test keeps `{ position, velocity }` as the
 * state and advances it from there. Changing the target changes nothing but the
 * target — which is the whole point, and why `retarget` is an identity function.
 *
 * The equation of motion is linear, so the advance is the exact solution for an
 * arbitrary starting velocity rather than a numerical integration: no step size
 * to tune, no drift, and a long frame (a backgrounded tab) lands where a short
 * one would have.
 */

import { normalizeSpring } from "@nebutra/design-tokens/scripts/spring.mjs";
import type { SpringParams } from "./spring";

export interface SpringState {
  position: number;
  velocity: number;
}

/** Below this distance and speed (in the same unit as the travel) a spring is at rest. */
const REST_EPSILON = 0.05;

/** Matches the threshold the token package uses to call a spring critically damped. */
const CRITICAL_EPSILON = 1e-6;

/**
 * Advance `seconds` toward `target`. Works on the offset from the target,
 * e = position - target, which obeys e'' + (c/m) e' + (k/m) e = 0.
 */
export function advanceSpring(
  state: SpringState,
  target: number,
  params: SpringParams,
  seconds: number,
): SpringState {
  if (seconds <= 0) return state;
  const { stiffness, damping, mass } = normalizeSpring(params);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const decayRate = zeta * w0;
  const e0 = state.position - target;
  const v0 = state.velocity;
  const decay = Math.exp(-decayRate * seconds);
  // Coefficient of the second basis function, shared by all three regimes.
  const lead = v0 + decayRate * e0;

  let offset: number;
  let velocity: number;
  if (Math.abs(zeta - 1) < CRITICAL_EPSILON) {
    const slope = lead;
    offset = decay * (e0 + slope * seconds);
    velocity = decay * (slope - w0 * (e0 + slope * seconds));
  } else if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const cos = Math.cos(wd * seconds);
    const sin = Math.sin(wd * seconds);
    const b = lead / wd;
    offset = decay * (e0 * cos + b * sin);
    velocity = decay * (-decayRate * (e0 * cos + b * sin) + wd * (b * cos - e0 * sin));
  } else {
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const cosh = Math.cosh(s * seconds);
    const sinh = Math.sinh(s * seconds);
    const c = lead / s;
    offset = decay * (e0 * cosh + c * sinh);
    velocity = decay * (-decayRate * (e0 * cosh + c * sinh) + s * (c * cosh + e0 * sinh));
  }
  return { position: target + offset, velocity };
}

/** A new goal keeps position and velocity: momentum is not reset by a click. */
export function retarget(state: SpringState): SpringState {
  return { ...state };
}

export function isAtRest(state: SpringState, target: number): boolean {
  return (
    Math.abs(state.position - target) < REST_EPSILON && Math.abs(state.velocity) < REST_EPSILON
  );
}
