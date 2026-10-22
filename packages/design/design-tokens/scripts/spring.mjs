/**
 * spring.mjs
 *
 * One definition of the spring, for the build, the site and the Motion Lab.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * A spring is three numbers (stiffness, damping, mass) and a curve. CSS cannot
 * run the physics, so a CSS consumer needs the curve baked into a `linear()`
 * easing plus the time it takes to settle; a JS consumer (Motion, react-spring,
 * a WAAPI call) wants the three numbers. Authoring both by hand is how the two
 * drift: the CSS curve gets re-tuned and the JS parameters keep the old feel.
 *
 * So the tokens author only the physics (`spring.<name>.stiffness|damping|mass`
 * in core.json) and this module derives the rest — `duration` and `easing` — at
 * build time, as a preprocessor, the same way derive-border-tier.mjs derives
 * the border tier. The design site imports the same functions, so the curve on
 * the page and the curve in the stylesheet come from one place.
 *
 * ── The model ────────────────────────────────────────────────────────────────
 * A damped harmonic oscillator pulled from 0 to 1 with zero initial velocity:
 *
 *     m·x'' + c·x' + k·(x − 1) = 0         k = stiffness, c = damping, m = mass
 *
 * Solved in closed form (underdamped, critically damped, overdamped), so a
 * sample at any time is exact — no integration error, no step size to tune, and
 * a scrubbing playhead can ask for any t directly.
 *
 * This module has no Node imports on purpose: it is bundled into the browser
 * for the Lab as well as run by Style Dictionary.
 */

/** Longest a spring is allowed to run before it is called settled, in seconds. */
export const MAX_SETTLE_SECONDS = 10;

/** Distance from the target (1) under which the spring counts as at rest. */
export const REST_DELTA = 0.001;

/** Default sample count for `linear()`. 40 holds the bouncy preset to <0.5%. */
export const DEFAULT_LINEAR_SAMPLES = 40;

const EPSILON = 1e-6;

/**
 * @param {{ stiffness: number, damping: number, mass?: number }} params
 * @returns {{ stiffness: number, damping: number, mass: number }}
 */
export function normalizeSpring(params) {
  const { stiffness, damping } = params;
  const mass = params.mass ?? 1;
  if (!Number.isFinite(stiffness) || stiffness <= 0) {
    throw new RangeError(`spring stiffness must be > 0, got ${stiffness}`);
  }
  if (!Number.isFinite(damping) || damping < 0) {
    throw new RangeError(`spring damping must be >= 0, got ${damping}`);
  }
  if (!Number.isFinite(mass) || mass <= 0) {
    throw new RangeError(`spring mass must be > 0, got ${mass}`);
  }
  return { stiffness, damping, mass };
}

/** ζ — below 1 the spring overshoots, at 1 it is critically damped, above it is sluggish. */
export function dampingRatio(params) {
  const { stiffness, damping, mass } = normalizeSpring(params);
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/** ω₀ in rad/s — how fast the spring would oscillate with no damping at all. */
export function naturalFrequency(params) {
  const { stiffness, mass } = normalizeSpring(params);
  return Math.sqrt(stiffness / mass);
}

/**
 * Largest excursion past the target as a fraction of the travel (0.12 = 12%
 * overshoot). Zero when the spring does not overshoot.
 */
export function springOvershoot(params) {
  const zeta = dampingRatio(params);
  if (zeta >= 1) return 0;
  if (zeta <= 0) return 1;
  return Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta));
}

/**
 * Position at time `t` seconds, travelling 0 → 1 from rest. May exceed 1 while
 * the spring overshoots.
 */
export function springValue(params, t) {
  if (t <= 0) return 0;
  const { stiffness, damping, mass } = normalizeSpring(params);
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const decay = Math.exp(-zeta * w0 * t);

  if (Math.abs(zeta - 1) < EPSILON) {
    return 1 - decay * (1 + w0 * t);
  }
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - decay * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  const s = w0 * Math.sqrt(zeta * zeta - 1);
  return 1 - decay * (Math.cosh(s * t) + ((zeta * w0) / s) * Math.sinh(s * t));
}

/**
 * Seconds until the spring stays within `restDelta` of the target for good.
 *
 * Scanned backwards from the cap in fixed steps rather than solved for, because
 * an oscillating response has no closed-form "last time outside the band". An
 * undamped spring never settles and returns the cap.
 */
export function springSettleSeconds(params, restDelta = REST_DELTA) {
  const spring = normalizeSpring(params);
  const step = 1 / 240;
  const steps = Math.ceil(MAX_SETTLE_SECONDS / step);
  for (let i = steps; i > 0; i -= 1) {
    if (Math.abs(springValue(spring, i * step) - 1) > restDelta) {
      return Math.min(MAX_SETTLE_SECONDS, (i + 1) * step);
    }
  }
  return step;
}

/** Settle time rounded to a whole millisecond, which is what a duration token holds. */
export function springSettleMs(params, restDelta = REST_DELTA) {
  return Math.round(springSettleSeconds(params, restDelta) * 1000);
}

/**
 * The response curve as evenly spaced samples over [0, settle], the first at
 * exactly 0 and the last at exactly 1, so the animation starts and ends where
 * it is supposed to whatever the rounding did to the middle.
 *
 * @returns {{ durationMs: number, points: number[] }}
 */
export function sampleSpring(params, samples = DEFAULT_LINEAR_SAMPLES) {
  if (!Number.isInteger(samples) || samples < 2) {
    throw new RangeError(`samples must be an integer >= 2, got ${samples}`);
  }
  const spring = normalizeSpring(params);
  const durationMs = springSettleMs(spring);
  const seconds = durationMs / 1000;
  const points = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / (samples - 1)) * seconds;
    points.push(i === 0 ? 0 : i === samples - 1 ? 1 : Number(springValue(spring, t).toFixed(4)));
  }
  return { durationMs, points };
}

/** Format a number for `linear()`: no trailing zeros, no `-0`. */
function formatStop(value) {
  const text = String(Number(value.toFixed(4)));
  return text === "-0" ? "0" : text;
}

/** The curve as a CSS `linear()` easing function. */
export function springToLinear(params, samples = DEFAULT_LINEAR_SAMPLES) {
  const { points } = sampleSpring(params, samples);
  return `linear(${points.map(formatStop).join(", ")})`;
}

function isLeaf(node) {
  return typeof node === "object" && node !== null && "$value" in node;
}

const readNumber = (node) => {
  if (!isLeaf(node)) return null;
  const value = Number(node.$value);
  return Number.isFinite(value) ? value : null;
};

/**
 * Style Dictionary preprocessor body: for every `spring.<name>` group that
 * authors `stiffness`, `damping` and `mass`, add the derived leaves
 *
 *   duration   the settle time, as a DTCG duration ("412ms")
 *   easing     the response curve, as a CSS linear() string
 *
 * Mutates the merged tree in place, like deriveBorderTier. A group that already
 * authors `duration` or `easing` keeps its own — an author may pin a duration
 * shorter than the settle time on purpose.
 *
 * @returns {{ name: string, durationMs: number, easing: string }[]} derivation log
 */
export function deriveSpring(tokens) {
  const log = [];
  const group = tokens?.spring;
  if (typeof group !== "object" || group === null) return log;

  for (const [name, node] of Object.entries(group)) {
    if (name.startsWith("$") || typeof node !== "object" || node === null || isLeaf(node)) {
      continue;
    }
    const stiffness = readNumber(node.stiffness);
    const damping = readNumber(node.damping);
    const mass = readNumber(node.mass);
    if (stiffness === null || damping === null || mass === null) continue;

    const { durationMs, points } = sampleSpring({ stiffness, damping, mass });
    const easing = `linear(${points.map(formatStop).join(", ")})`;
    const meta = { "com.nebutra.derive": { space: "spring", tier: "linear()" } };

    if (!("duration" in node)) {
      node.duration = {
        $value: `${durationMs}ms`,
        $type: "duration",
        $description: `Settle time of the ${name} spring — the time it takes to come within ${REST_DELTA * 100}% of its target. Derived from stiffness, damping and mass.`,
        $extensions: meta,
      };
    }
    if (!("easing" in node)) {
      node.easing = {
        $value: easing,
        $type: "string",
        $description: `The ${name} spring's response curve as a CSS linear() easing, sampled from the physics. Play it over the matching duration token.`,
        $extensions: meta,
      };
    }
    log.push({ name, durationMs, easing });
  }
  return log;
}
