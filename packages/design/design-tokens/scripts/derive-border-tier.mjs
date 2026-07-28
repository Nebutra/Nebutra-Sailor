/**
 * derive-border-tier.mjs
 *
 * Generates functional scale steps 6/7/8 (the BORDER tier) of every 12-step
 * scale, instead of aliasing them to the same primitives as steps 3/4/5 (the
 * component-BACKGROUND tier).
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * tokens/core.json ships 11-stop primitive palettes (50…950). The functional
 * layer needs 12 steps. The original author closed the 1-step shortfall by
 * pointing 6/7/8 at the same primitives as 3/4/5, which made the border tier
 * pixel-identical to the background tier. "Separate with a tonal shift instead
 * of a border" and "draw a border" then rendered the same colour, so neither
 * could be expressed.
 *
 * Adding hand-picked intermediate primitives to core.json would not survive:
 * `scripts/brand-apply.ts` rewrites color.nebutra-{blue,cyan,neutral} wholesale
 * from DEFAULT_BRAND.colors on every `brand:apply`, over a fixed 11-stop step
 * list. Any extra stop would be silently dropped and the duplication would come
 * back. So the tier is DERIVED at build time and is correct by construction for
 * any brand palette, before and after a rebrand.
 *
 * ── The rule ─────────────────────────────────────────────────────────────────
 * Steps 6/7/8 are placed at t = 0.25, 0.50, 0.75 of an OKLab interpolation from
 * step 5 (background-active) to a tier anchor A. Equal quarters means steps
 * 5→6→7→8→A form a uniform perceptual ladder: every adjacent pair is separated
 * by the same ΔL, so no pair can collapse and the ladder cannot invert.
 *
 * The anchor A is step 9 (the solid fill) — the tier below the border tier —
 * whenever the scale actually descends (light) or ascends (dark) into it:
 *
 *     |L(9) − L(5)| >= 0.06   →   A = step 9        ("solid-anchored")
 *     otherwise                →   A = step 10      ("bright-scale fallback")
 *
 * The 0.06 threshold is ~4× the ~0.015 OKLab-L just-noticeable difference for
 * large flat areas: it is the smallest span that can hold three visibly
 * separated interior steps. Bright scales (Radix calls these "bright"; yellow,
 * lime, mint, and our cyan) have a step 9 whose lightness is barely below step
 * 5 — the accent is a luminous solid, not the dark end of the ramp. Light cyan:
 * L(5)=0.8709, L(9)=0.8541, a span of 0.0168, ~1 JND for the whole tier. There
 * is no room to place three separated steps inside it, so the tier continues
 * along the ramp toward step 10 instead.
 *
 * BE EXPLICIT ABOUT WHAT THIS COSTS. Steps 6/7/8 then land BELOW step 9
 * (light cyan: 0.8388 / 0.8086 / 0.7759 against L(9)=0.8541), so the 1…12
 * ladder gains an upward step at 8→9 of +0.078 that was not there before —
 * previously the collapse sat at 5→6 (+0.048) instead. The break is moved and
 * enlarged, not removed. It cannot be removed while step 5 and step 9 are both
 * fixed: any tier that fits strictly between them is sub-JND and re-collapses.
 * Step 9 sitting off the ramp is the standard shape for a bright accent scale,
 * but on this palette it is a consequence of the derivation, not a pre-existing
 * property, and the ladder assertion below exempts step 9 for exactly that
 * reason. The honest summary is: five of six scales are strictly monotonic over
 * 1…12; light cyan is monotonic over 1…8 and over 9…12, with step 9 off-ramp.
 *
 * ── Chroma policy ────────────────────────────────────────────────────────────
 * The derived step keeps the hue and chroma produced by the interpolation, so
 * the border tier stays in the same hue family as the background tier it sits
 * on — EXCEPT where the theme opts out with `chroma: 0`.
 *
 * The dark neutral border tier opts out. core.json documents `nebutra-gray`
 * as "zero hue, zero saturation … used where blue undertone clashes — primarily
 * dark-mode borders, dividers, and elevation hairlines". That intent is
 * deliberate and is preserved: dark --neutral-6/7/8 stay achromatic. What was
 * broken there was not the hue, it was the lightness — the greys were pulled
 * from nebutra-gray-900/800/700, which are DARKER than the slate background tier
 * they must sit above, so the "border" was a hole rather than a hairline. The
 * derivation keeps chroma 0 and fixes L.
 */

// ── OKLab ⇄ sRGB ────────────────────────────────────────────────────────────
// Björn Ottosson's OKLab (https://bottosson.github.io/posts/oklab/). Same matrices
// as hexToOklch() in style-dictionary.config.mjs, plus the inverse.

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** "#rrggbb" → [r, g, b] in 0…1 sRGB. */
export function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/iu.exec(String(hex).trim());
  if (!match) return null;
  const v = match[1];
  return [
    Number.parseInt(v.slice(0, 2), 16) / 255,
    Number.parseInt(v.slice(2, 4), 16) / 255,
    Number.parseInt(v.slice(4, 6), 16) / 255,
  ];
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function rgbToHex([r, g, b]) {
  const channel = (c) =>
    Math.round(clamp01(c) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** "#rrggbb" → { L, a, b } in OKLab. */
export function hexToOklab(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`derive-border-tier: not a #rrggbb hex: ${hex}`);
  const [r, g, b] = rgb.map(srgbToLinear);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/** { L, a, b } in OKLab → "#rrggbb" (gamut-clipped by channel clamp). */
export function oklabToHex({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return rgbToHex(
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map(linearToSrgb),
  );
}

/** OKLab lightness of a hex, for reporting and for the ladder assertion. */
export const oklabL = (hex) => hexToOklab(hex).L;

/** WCAG 2.x relative luminance + contrast ratio, for reporting. */
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Derivation ──────────────────────────────────────────────────────────────

/** Interpolation positions for steps 6, 7, 8 across the 5 → anchor span. */
export const BORDER_TIER_T = { 6: 0.25, 7: 0.5, 8: 0.75 };

/**
 * Minimum |ΔL| between step 5 and step 9 for step 9 to be usable as the anchor.
 * ~4× the large-area OKLab-L JND (≈0.015): the smallest span that can hold
 * three visibly separated interior steps.
 */
export const SOLID_ANCHOR_MIN_SPAN = 0.06;

const REF_RE = /^\{([^}]+)\}$/u;

/** Follow `{a.b.c}` references through the merged DTCG tree to a literal value. */
function resolveValue(tokens, value, seen = new Set()) {
  let current = value;
  while (typeof current === "string" && REF_RE.test(current)) {
    const pathKey = REF_RE.exec(current)[1];
    if (seen.has(pathKey)) {
      throw new Error(`derive-border-tier: circular reference at {${pathKey}}`);
    }
    seen.add(pathKey);
    let node = tokens;
    for (const segment of pathKey.split(".")) {
      node = node?.[segment];
      if (node === undefined) {
        throw new Error(`derive-border-tier: unresolvable reference {${pathKey}}`);
      }
    }
    current = node.$value ?? node.value;
  }
  return current;
}

/**
 * Replace the `$value` of every scale step carrying
 * `$extensions["com.nebutra.derive"]` with a computed OKLab value.
 *
 * Mutation is confined to the freshly-parsed token object Style Dictionary
 * hands us; nothing on disk is touched.
 *
 * @param {object} tokens merged DTCG tree (core + semantic + one theme)
 * @returns {Array<{name: string, hex: string, meta: object}>} derivation log
 */
export function deriveBorderTier(tokens) {
  const log = [];
  const scales = tokens?.scale;
  if (!scales) return log;

  for (const [scaleName, scale] of Object.entries(scales)) {
    if (scaleName.startsWith("$")) continue;

    const literal = (step) => {
      const raw = scale?.[step]?.$value;
      if (raw === undefined) {
        throw new Error(`derive-border-tier: scale.${scaleName} has no step ${step}`);
      }
      return resolveValue(tokens, raw);
    };

    const derivedSteps = Object.keys(BORDER_TIER_T).filter(
      (step) => scale?.[step]?.$extensions?.["com.nebutra.derive"] !== undefined,
    );
    if (derivedSteps.length === 0) continue;

    const from = literal("5");
    const solid = literal("9");
    const span = Math.abs(oklabL(solid) - oklabL(from));
    const bright = span < SOLID_ANCHOR_MIN_SPAN;
    const anchorStep = bright ? "10" : "9";
    const anchor = literal(anchorStep);

    const fromLab = hexToOklab(from);
    const anchorLab = hexToOklab(anchor);

    for (const step of derivedSteps) {
      const options = scale[step].$extensions["com.nebutra.derive"];
      const t = BORDER_TIER_T[step];
      const achromatic = options?.chroma === 0;

      const mixed = {
        L: fromLab.L + t * (anchorLab.L - fromLab.L),
        a: achromatic ? 0 : fromLab.a + t * (anchorLab.a - fromLab.a),
        b: achromatic ? 0 : fromLab.b + t * (anchorLab.b - fromLab.b),
      };
      const hex = oklabToHex(mixed);

      scale[step].$value = hex;
      log.push({
        name: `${scaleName}-${step}`,
        hex,
        meta: {
          from,
          anchorStep,
          anchor,
          t,
          bright,
          achromatic,
          L: mixed.L,
        },
      });
    }
  }

  return log;
}

/**
 * Build-time invariant. Runs on the resolved literal values of a finished
 * scale and fails the build if the defect this module exists to fix has
 * reappeared — e.g. if the preprocessor stopped being registered and the
 * placeholder `$value` aliases leaked through.
 *
 * Checks:
 *   1. no two of steps 1…12 share a value;
 *   2. steps 1→8 (the ramp: app/component backgrounds + the border tier) are
 *      strictly monotonic in OKLab L;
 *   3. steps 9→12 (the solid + text tiers) are strictly monotonic in the same
 *      direction;
 *   4. every adjacent pair inside 5…8 is separated by at least one JND, so the
 *      border tier is visibly off the background tier (5↔6) and its own three
 *      states stay distinguishable (6↔7, 7↔8).
 *
 * Step 9 is checked against 10/11/12 but NOT against step 8: on a bright scale
 * the solid accent legitimately sits off the ramp (see the header note on light
 * cyan). Segments 1…8 and 9…12 are each verified; the 8→9 seam between them is
 * deliberately not, and that exemption is the one place this invariant is
 * weaker than "monotonic over 1…12".
 */
export const LADDER_MIN_JND = 0.015;

function checkMonotonic(problems, scaleName, label, values, stepNames, direction) {
  const present = stepNames.filter((s) => values[s]);
  for (let i = 1; i < present.length; i += 1) {
    const previous = oklabL(values[present[i - 1]]);
    const current = oklabL(values[present[i]]);
    if (Math.sign(current - previous) !== direction) {
      problems.push(
        `${scaleName} ${label} is not monotonic at step ${present[i]}: ` +
          `L(${present[i - 1]})=${previous.toFixed(4)} → L(${present[i]})=${current.toFixed(4)}`,
      );
    }
  }
}

export function assertLadder(scaleName, values) {
  const problems = [];
  const steps = Object.keys(values).sort((a, b) => Number(a) - Number(b));

  const seen = new Map();
  for (const step of steps) {
    const hex = values[step].toLowerCase();
    if (seen.has(hex)) {
      problems.push(`${scaleName}-${step} duplicates ${scaleName}-${seen.get(hex)} (${hex})`);
    } else {
      seen.set(hex, step);
    }
  }

  const ramp = ["1", "2", "3", "4", "5", "6", "7", "8"].filter((s) => values[s]);
  if (ramp.length < 2) return problems;

  const direction = Math.sign(oklabL(values[ramp.at(-1)]) - oklabL(values[ramp[0]]));
  checkMonotonic(problems, scaleName, "ramp", values, ramp, direction);
  checkMonotonic(
    problems,
    scaleName,
    "solid/text tier",
    values,
    ["9", "10", "11", "12"],
    direction,
  );

  for (const [a, b] of [
    ["5", "6"],
    ["6", "7"],
    ["7", "8"],
  ]) {
    if (!(values[a] && values[b])) continue;
    const gap = Math.abs(oklabL(values[b]) - oklabL(values[a]));
    if (gap < LADDER_MIN_JND) {
      problems.push(
        `${scaleName} steps ${a}↔${b} are only ${gap.toFixed(4)} apart in OKLab L ` +
          `(minimum ${LADDER_MIN_JND}); the border tier is not visibly separated`,
      );
    }
  }

  return problems;
}
