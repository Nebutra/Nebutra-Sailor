/**
 * Family views — what each token page renders, assembled from the model.
 *
 * The rule this file exists to hold: a family is either ENUMERABLE from the
 * DTCG source or it is DECLARED ABSENT. There is no third option and no
 * hand-written list. `MISSING_FAMILIES` below is the honest answer for the two
 * families the brief asks for that the source does not contain — and it says
 * where those values actually come from instead, so a reader is not left
 * thinking the page forgot them.
 */

import {
  type ContrastRole,
  type ContrastVerdict,
  contrastRatio,
  judge,
  type Oklch,
  over,
  parseColor,
  toOklch,
} from "./color";
import { group, type Mode, type Token, type TokenSet, tokenSet } from "./model";
import { type UtilityInfo, utilityFor } from "./theme-registry";

// ─── role assignment (structural) ────────────────────────────────────────────

/**
 * The tier each step of a 12-step scale occupies.
 *
 * Not a preference of this app: the tiering is stated in the header of
 * `packages/design/design-tokens/scripts/derive-border-tier.mjs`, which names
 * "steps 3/4/5 (the component-BACKGROUND tier)", "steps 6/7/8 (the BORDER
 * tier)", "step 9 (the solid fill)" and checks "steps 9→12 (the solid + text
 * tiers)". `themes/light.json` says the same thing per step in its
 * `$description`s, which the page prints beside every row so the two can be
 * compared by eye.
 */
const SCALE_STEP_ROLE: Record<string, ContrastRole> = {
  "1": "surface",
  "2": "surface",
  "3": "surface",
  "4": "surface",
  "5": "surface",
  "6": "boundary",
  "7": "boundary",
  "8": "boundary",
  "9": "fill",
  "10": "fill",
  "11": "text",
  "12": "text",
};

/** Semantic-role slots whose name states they are a boundary. */
const BOUNDARY_NAMES = new Set(["border", "input", "ring", "sidebar-border", "sidebar-ring"]);

/** Semantic-role slots whose name states they are a surface a fill sits on. */
const SURFACE_PREFIXES = ["background", "card", "popover", "muted", "sidebar", "surface", "input"];

/**
 * Assign a contrast role from a token's STRUCTURE — its step number inside a
 * scale, or the naming convention the pipeline already depends on (the `X` /
 * `X-foreground` pairing is resolved by name in `measure()` below, so the same
 * convention is load-bearing either way).
 *
 * A token that matches nothing is `unknown`, which shows the measurement with no
 * threshold rather than guessing a bar for it.
 */
export function roleOf(token: Token): ContrastRole {
  if (token.group === "scale") {
    const step = token.name.split(".").at(-1) ?? "";
    return SCALE_STEP_ROLE[step] ?? "unknown";
  }

  const name = token.cssVar;
  if (!name) return "unknown";
  // `--foreground` is body text; `--x-foreground` is text on the `--x` fill.
  if (name === "foreground" || name.endsWith("-foreground")) return "text";
  if (BOUNDARY_NAMES.has(name)) return "boundary";
  if (name.endsWith("-border") || name.endsWith("-ring")) return "boundary";
  if (SURFACE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}-`))) {
    return "surface";
  }
  if (token.group === "shadcn" || token.group === "brand" || token.group === "status") {
    // Everything left in the semantic tier is something you paint on top of a
    // surface: primary, secondary, accent, destructive, success, warning, info.
    return "fill";
  }
  return "unknown";
}

// ─── measured colour ─────────────────────────────────────────────────────────

export interface MeasuredColor {
  token: Token;
  /** Opaque hex to paint the swatch with — composited if the token has alpha. */
  hex: string | null;
  alpha: number;
  oklch: Oklch | null;
  /** The notation the source stores, e.g. `hsl-channels`. */
  notation: string | null;
  /** Role assigned structurally by `roleOf`. */
  role: ContrastRole;
  /**
   * Contrast against the mode's own `--background`, for orientation. Carries no
   * verdict: most tokens are not meant to sit on the page background, and
   * grading them against it produces nonsense — `--primary-foreground` is white,
   * which is 1.00:1 on a white page and perfectly correct on its blue fill.
   */
  vsPage: number | null;
  /**
   * Every pairing the SOURCE defines for this token, each with the backdrop it
   * is actually used against. Empty when the source defines no backdrop — which
   * the page says, instead of inventing one.
   */
  pairings: Pairing[];
}

export interface Pairing {
  /** The other half of the pair. */
  backdrop: Token;
  /** Why these two are paired, e.g. "declared pair" or "step 3 of the same scale". */
  basis: string;
  verdict: ContrastVerdict;
  /**
   * `true` when clearing the bar is a conformance requirement (text on its own
   * fill). `false` when the bar is a reference line rather than a rule — a
   * decorative separator is outside WCAG 1.4.11, so the site prints the number
   * against 3:1 without claiming a violation.
   */
  normative: boolean;
}

function hexOf(token: Token | undefined, backdropHex: string): string | null {
  if (!token) return null;
  const parsed = parseColor(token.resolved);
  return parsed ? over(parsed, backdropHex) : null;
}

/**
 * Build the pairings for one token. Every backdrop chosen here is one the source
 * itself relates to the token: the declared `X` / `X-foreground` pair, or a step
 * of the token's own 12-step scale.
 */
function pairingsFor(
  set: TokenSet,
  token: Token,
  role: ContrastRole,
  flat: string,
  pageHex: string,
): Pairing[] {
  const pairings: Pairing[] = [];
  const add = (
    backdrop: Token | undefined,
    basis: string,
    barRole: ContrastRole,
    normative: boolean,
  ) => {
    const backdropHex = hexOf(backdrop, pageHex);
    if (!backdrop || !backdropHex) return;
    pairings.push({
      backdrop,
      basis,
      verdict: judge(contrastRatio(flat, backdropHex), barRole),
      normative,
    });
  };

  const name = token.cssVar;

  // ── the declared X / X-foreground pair, from either side ──────────────────
  if (name !== "foreground" && name?.endsWith("-foreground")) {
    add(
      set.byVar.get(name.slice(0, -"-foreground".length)),
      "the fill this foreground is declared for",
      "text",
      true,
    );
  } else if (name) {
    add(set.byVar.get(`${name}-foreground`), "the foreground declared for this fill", "text", true);
  }

  // ── steps of the token's own scale ────────────────────────────────────────
  if (token.group === "scale") {
    const [family, step] = token.name.split(".");
    const stepVar = (n: string) => set.byVar.get(`${family}-${n}`);

    if (role === "text") {
      add(stepVar("1"), `step 1 of the ${family} scale (app background)`, "text", true);
      add(stepVar("3"), `step 3 of the ${family} scale (component background)`, "text", true);
    }
    if (role === "boundary") {
      add(
        stepVar("3"),
        `step 3 of the ${family} scale — the component background this border encloses`,
        "boundary",
        false,
      );
    }
    if (role === "fill" && pairings.length === 0) {
      // Steps 9/10 are solid fills, but the source declares no foreground for
      // them. Stating that is the honest output; picking white or black to
      // measure against would be this app inventing a token pairing.
      void step;
    }
  }

  // ── body text, which pairs with the surfaces rather than with a fill ──────
  if (
    role === "text" &&
    token.group === "shadcn" &&
    (name === "foreground" || !name?.endsWith("-foreground"))
  ) {
    add(set.background, "the page background", "text", true);
    add(set.byVar.get("card"), "the card surface", "text", true);
  }

  // ── semantic boundaries ───────────────────────────────────────────────────
  if (role === "boundary" && token.group === "shadcn") {
    add(set.background, "the page background", "boundary", false);
    add(set.byVar.get("card"), "the card surface", "boundary", false);
  }

  return pairings;
}

function measure(set: TokenSet, token: Token): MeasuredColor {
  const parsed = parseColor(token.resolved);
  const pageHex = set.background ? parseColor(set.background.resolved)?.hex : undefined;
  const role = roleOf(token);

  if (!parsed || !pageHex) {
    return {
      token,
      hex: parsed?.hex ?? null,
      alpha: parsed?.alpha ?? 1,
      oklch: parsed ? toOklch(parsed.hex) : null,
      notation: parsed?.notation ?? null,
      role,
      vsPage: null,
      pairings: [],
    };
  }

  // A translucent token only exists over something; it is composited onto the
  // page background, and the swatch is painted the same way so the number and
  // the colour on screen agree.
  const flat = over(parsed, pageHex);

  return {
    token,
    hex: flat,
    alpha: parsed.alpha,
    oklch: toOklch(flat),
    notation: parsed.notation,
    role,
    vsPage: contrastRatio(flat, pageHex),
    pairings: pairingsFor(set, token, role, flat, pageHex),
  };
}

export function measured(mode: Mode, tokens: Token[]): MeasuredColor[] {
  const set = tokenSet(mode);
  return tokens.map((token) => measure(set, token));
}

/** Pairings that miss a bar they are required to clear. The page leads with these. */
export function failures(entries: MeasuredColor[]): { entry: MeasuredColor; pairing: Pairing }[] {
  return entries.flatMap((entry) =>
    entry.pairings
      .filter((pairing) => pairing.normative && pairing.verdict.passes === false)
      .map((pairing) => ({ entry, pairing })),
  );
}

/** Pairings below a reference line that is not a hard requirement. */
export function belowReference(
  entries: MeasuredColor[],
): { entry: MeasuredColor; pairing: Pairing }[] {
  return entries.flatMap((entry) =>
    entry.pairings
      .filter((pairing) => !pairing.normative && pairing.verdict.passes === false)
      .map((pairing) => ({ entry, pairing })),
  );
}

// ─── colour: the 12-step functional scales ───────────────────────────────────

export interface Scale {
  /** `neutral` | `blue` | `cyan` | whatever the source adds next. */
  name: string;
  steps: MeasuredColor[];
}

/** Every 12-step scale in the source, in source order, with every step measured. */
export function scales(mode: Mode): Scale[] {
  const byScale = new Map<string, Token[]>();
  for (const token of group(mode, "scale")) {
    // split() always yields at least one element, but the index signature does
    // not know that; the whole name is the honest fallback.
    const family = token.name.split(".")[0] ?? token.name;
    const list = byScale.get(family) ?? [];
    list.push(token);
    byScale.set(family, list);
  }
  return [...byScale].map(([name, tokens]) => ({ name, steps: measured(mode, tokens) }));
}

/** The primitive palettes (`color.*`) the scales alias into. */
export function palettes(mode: Mode): Scale[] {
  const byPalette = new Map<string, Token[]>();
  for (const token of group(mode, "color")) {
    const segments = token.name.split(".");
    // `color.nebutra-blue.500` is a palette stop; `color.status.danger` is not.
    const family = segments.length > 1 ? (segments[0] ?? "single") : "single";
    const list = byPalette.get(family) ?? [];
    list.push(token);
    byPalette.set(family, list);
  }
  return [...byPalette].map(([name, tokens]) => ({ name, steps: measured(mode, tokens) }));
}

/** The semantic role tokens (`shadcn.*`) — the bare-HSL-channel tier. */
export function semanticRoles(mode: Mode): MeasuredColor[] {
  return measured(mode, group(mode, "shadcn"));
}

/** Brand and status aliases. */
export function aliases(mode: Mode): MeasuredColor[] {
  return measured(mode, [...group(mode, "brand"), ...group(mode, "status")]).filter(
    (entry) => entry.token.type === "color" || entry.hex !== null,
  );
}

/** The Geist-compatibility tier (`ds.*`). */
export function compatTier(mode: Mode): MeasuredColor[] {
  return measured(mode, group(mode, "ds"));
}

// ─── elevation ───────────────────────────────────────────────────────────────

export interface ElevationStep {
  token: Token;
  /**
   * How to reach this step. Derived, not typed out: `elevation.ambient-sm` emits
   * `--elevation-ambient-sm`, the `@theme` block aliases it to
   * `--shadow-ambient-sm`, and Tailwind turns that into `shadow-ambient-sm`. The
   * middle link is verified against the stylesheet, so a step that was never
   * aliased is reported as `var()`-only instead of being given a class that
   * silently does nothing.
   */
  use: UtilityInfo;
  /** The other mode's value for the same step, when it differs. */
  otherMode: string | null;
}

export function elevationRamp(mode: Mode): ElevationStep[] {
  const other = tokenSet(mode === "light" ? "dark" : "light");
  return group(mode, "elevation").map((token) => {
    const counterpart = token.cssVar ? other.byVar.get(token.cssVar) : undefined;
    return {
      token,
      use: utilityFor(`shadow-${token.name}`, `shadow-${token.name}`, token.cssVar),
      otherMode:
        counterpart && counterpart.resolved !== token.resolved ? counterpart.resolved : null,
    };
  });
}

// ─── shape, motion, type ─────────────────────────────────────────────────────

export interface SimpleToken {
  token: Token;
  /**
   * How to consume the token: the Tailwind utility if one is really registered
   * in the `@theme` block, otherwise the `var()` form that does work. Checked
   * against the stylesheet rather than assumed — see `theme-registry.ts`.
   */
  use: UtilityInfo;
}

/**
 * @param themeVar the `@theme` variable a utility would read, given the token
 * @param utility the class name that variable would produce
 */
function withUtility(
  tokens: Token[],
  naming: (token: Token) => { themeVar: string; utility: string } | null,
): SimpleToken[] {
  return tokens.map((token) => {
    const named = naming(token);
    return {
      token,
      use: named
        ? utilityFor(named.themeVar, named.utility, token.cssVar)
        : {
            utility: null,
            fallback:
              token.cssVar === null ? "not emitted as a variable" : `var(--${token.cssVar})`,
            requires: "—",
          },
    };
  });
}

/**
 * Radius steps. `size.radius.*` in core.json emits `--radius-<step>`, and
 * Tailwind exposes `rounded-<step>`. `radius.default` in semantic.json emits the
 * bare `--radius` that shadcn components read, and has no utility of its own.
 */
export function radiusSteps(mode: Mode): SimpleToken[] {
  const tokens = [
    ...group(mode, "size").filter((token) => token.name.startsWith("radius.")),
    ...group(mode, "radius"),
  ];
  return withUtility(tokens, (token) => {
    if (token.group === "radius") return null;
    const step = token.name.slice("radius.".length);
    return { themeVar: `radius-${step}`, utility: `rounded-${step}` };
  });
}

/**
 * Container max-widths.
 *
 * Note where these come from: `core.json` declares `size.container.*` and
 * `semantic.json` re-declares `container.*`, and BOTH name the same CSS variable
 * (`--container-text`). The build emits it once, from the last declaration — so
 * the tokens rendered here are semantic.json's, and core.json's are shadowed.
 * The model computes that the same way the build does, which is why reading the
 * `size` group for containers finds nothing.
 */
export function containerSteps(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "container"), () => null);
}

/** Responsive breakpoints, if the source declares them. */
export function breakpointSteps(mode: Mode): SimpleToken[] {
  const tokens = group(mode, "size").filter((token) => token.name.startsWith("breakpoint."));
  return withUtility(tokens, () => null);
}

export function durations(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "duration"), (token) => ({
    themeVar: `duration-${token.name}`,
    utility: `duration-${token.name}`,
  }));
}

export function easings(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "easing"), (token) => ({
    themeVar: `ease-${token.name}`,
    utility: `ease-${token.name}`,
  }));
}

/**
 * Composite motion tokens: the `transition` shorthand and the focus-ring
 * shorthand, plus the `motion.duration.*` semantic aliases over `duration.*`.
 * Grouped together because they are all built out of the two families above.
 */
export function motionComposites(mode: Mode): SimpleToken[] {
  return withUtility(
    [...group(mode, "motion"), ...group(mode, "transition"), ...group(mode, "focusRing")],
    () => null,
  );
}

/**
 * Effect tokens that are neither colour nor shadow: the inset hairline ring and
 * the faint overlay wash. Both change between modes, so both are rendered in
 * both modes on the elevation page.
 */
export function effects(mode: Mode): SimpleToken[] {
  return withUtility([...group(mode, "ring"), ...group(mode, "overlay")], () => null);
}

export function fontStacks(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "fontFamily"), (token) => ({
    themeVar: `font-${token.name}`,
    utility: `font-${token.name}`,
  }));
}

export function tracking(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "tracking"), (token) => ({
    themeVar: `tracking-${token.name}`,
    utility: `tracking-${token.name}`,
  }));
}

export function leading(mode: Mode): SimpleToken[] {
  return withUtility(group(mode, "leading"), (token) => ({
    themeVar: `leading-${token.name}`,
    utility: `leading-${token.name}`,
  }));
}

/**
 * Every DTCG group some page on this site renders.
 *
 * `unclaimed()` is the complement, and it is RENDERED, not swallowed: the token
 * index shows it as a list. A group added to the source therefore appears on the
 * site immediately — as an unclaimed token with its value and its variable name —
 * and stays visible until someone gives it a proper page. The failure mode this
 * closes is a token existing in the source and nowhere on the site.
 */
const CLAIMED_GROUPS = new Set([
  "color",
  "scale",
  "shadcn",
  "ds",
  "brand",
  "status",
  "elevation",
  "size",
  "radius",
  "container",
  "duration",
  "easing",
  "motion",
  "transition",
  "focusRing",
  "ring",
  "overlay",
  "fontFamily",
  "tracking",
  "leading",
]);

export function unclaimed(mode: Mode): Token[] {
  return tokenSet(mode).tokens.filter((token) => !CLAIMED_GROUPS.has(token.group));
}

// ─── families the source does NOT contain ────────────────────────────────────

export interface MissingFamily {
  family: string;
  /** Where the values actually come from today. */
  actualSource: string;
  /** What adding it to the DTCG source would take. */
  consequence: string;
}

/**
 * Declared absences.
 *
 * The brief asks for spacing and a type scale. Neither is in
 * `packages/design/design-tokens/tokens/**`, so neither gets a generated page.
 * Saying so is the correct output: a spacing page built by hand here would be a
 * second, unverified scale, and the first time Tailwind's changed the two would
 * silently disagree.
 *
 * This list is the ONLY hand-maintained token statement in the app, and it
 * exists to say "not in the source" — never to supply a value. Each entry is
 * checked at build time by `assertStillMissing()`.
 */
export const MISSING_FAMILIES: MissingFamily[] = [
  {
    family: "spacing",
    actualSource:
      "Tailwind v4's built-in spacing scale (a 0.25rem base multiplier), consumed directly as p-4 / gap-6 / space-y-2. No spacing token is declared in the DTCG source, so there is nothing here to generate from.",
    consequence:
      "Adding a `spacing` group to core.json would give the ramp a name, a description per step, and a page on this site — and would let a rebrand retune density. Until then the scale is Tailwind's, not the design system's.",
  },
  {
    family: "font size / type scale",
    actualSource:
      "Tailwind v4's built-in text-* scale. The source declares font FAMILIES (fontFamily), letter-spacing (tracking) and line-height (leading) — the three families rendered on the type page — but no font-size ramp.",
    consequence:
      "A `fontSize` group in core.json would make heading sizes reviewable and rebrandable. The absence is why tracking and leading are tokenised but the size they apply to is not.",
  },
];

/**
 * Build-time guard for the list above: if a family named absent later appears in
 * the source, this throws instead of letting the page keep claiming it is
 * missing. The shrink direction is the only one that needs no code change —
 * a new group shows up automatically via `unclaimed()`.
 */
export function assertStillMissing(mode: Mode): void {
  const present = new Set(tokenSet(mode).tokens.map((token) => token.group));
  const nowPresent = (
    [
      ["spacing", "spacing"],
      ["fontSize", "font size / type scale"],
    ] as const
  ).filter(([group]) => present.has(group));

  if (nowPresent.length > 0) {
    throw new Error(
      `[apps/design] MISSING_FAMILIES in src/lib/tokens/families.ts still claims ` +
        `${nowPresent.map(([, label]) => label).join(", ")} is absent from the DTCG source, ` +
        "but the source now declares it. Delete the entry and render the family instead.",
    );
  }
}
