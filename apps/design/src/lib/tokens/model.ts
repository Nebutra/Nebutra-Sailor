/**
 * The token model behind every page under `app/(tokens)`.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * The design system's token source is `packages/design/design-tokens/tokens/*.json`
 * (W3C DTCG). Everything downstream — `build/css/*.css`,
 * `packages/design/tokens/styles.css`, the Tailwind preset, the TS export — is
 * generated from it. This module reads THAT source and nothing else, so a token
 * added to the source appears on the site at the next build with no edit here.
 *
 * There is no fallback list. If a family is not in the source, the page says the
 * family is not in the source. A hand-written swatch is the exact failure this
 * app was built to prevent: CLAUDE.md once carried the single line
 * `--blue-9 | Primary solid fill`, and that line produced 31 call sites leaking
 * the VI identity lock onto component surfaces.
 *
 * ── How it mirrors the build ────────────────────────────────────────────────-
 * `style-dictionary.config.mjs` builds each mode from three sources in order —
 * core, semantic, then the theme — and applies the border-tier preprocessor
 * before resolution. This module performs the same three steps with the same
 * imported functions:
 *
 *   1. merge  core.json → semantic.json → themes/<mode>.json  (later wins)
 *   2. derive `deriveBorderTier()` — the SAME function the build calls, so
 *      scale steps 6/7/8 hold their computed values, not their placeholders
 *   3. name   `pathToCssVarName()` — the SAME namer the build emits with, with
 *      the same last-declaration-wins rule for a duplicated variable name
 *
 * Every one of those three is imported from the token package. None is
 * reimplemented. A rename in the pipeline is a rename on the page.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToCssVarName } from "@nebutra/design-tokens/scripts/css-var-name.mjs";
import { deriveBorderTier } from "@nebutra/design-tokens/scripts/derive-border-tier.mjs";

// ─── locating the token source ────────────────────────────────────────────────

const TOKENS_DIR = join("packages", "design", "design-tokens", "tokens");
const PROBE = join(TOKENS_DIR, "core.json");

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let up = 0; up < 6; up += 1) {
    if (existsSync(join(dir, PROBE))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `[apps/design] Could not locate ${PROBE} walking up from ${process.cwd()}. ` +
      "The token browser is generated from the DTCG source; it has no hardcoded token list " +
      "to fall back to, and will not render a stale one.",
  );
}

const REPO_ROOT = findRepoRoot();

export type Mode = "light" | "dark";
export const MODES: readonly Mode[] = ["light", "dark"];

/** The DTCG files, in the order the build merges them. */
export const SOURCE_FILES = {
  core: `${TOKENS_DIR}/core.json`,
  semantic: `${TOKENS_DIR}/semantic.json`,
  light: `${TOKENS_DIR}/themes/light.json`,
  dark: `${TOKENS_DIR}/themes/dark.json`,
} as const;

export type SourceKey = keyof typeof SOURCE_FILES;

function readTokenFile(key: SourceKey): TokenNode {
  return JSON.parse(readFileSync(join(REPO_ROOT, SOURCE_FILES[key]), "utf8")) as TokenNode;
}

// ─── DTCG shapes ──────────────────────────────────────────────────────────────

interface TokenLeafRaw {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

interface TokenNode {
  [key: string]: TokenNode | TokenLeafRaw | string | undefined;
}

function isLeaf(node: unknown): node is TokenLeafRaw {
  return typeof node === "object" && node !== null && "$value" in node;
}

// ─── the layer model (item 3 of the brief) ───────────────────────────────────

/**
 * Which of the three DTCG source files a token's winning declaration came from.
 * This is the layer people get wrong, so the site labels it on every row.
 */
export type Layer = "primitive" | "semantic" | "mode";

const LAYER_BY_SOURCE: Record<SourceKey, Layer> = {
  core: "primitive",
  semantic: "semantic",
  light: "mode",
  dark: "mode",
};

/**
 * The tier a token occupies inside its file — derived from its top-level DTCG
 * group, which is the only place this information exists.
 */
export type Tier =
  | "primitive-palette"
  | "functional-scale"
  | "semantic-role"
  | "semantic-alias"
  | "compat"
  | "elevation"
  | "foundation";

const TIER_BY_GROUP: Record<string, Tier> = {
  color: "primitive-palette",
  scale: "functional-scale",
  shadcn: "semantic-role",
  brand: "semantic-alias",
  status: "semantic-alias",
  ds: "compat",
  elevation: "elevation",
};

export const TIER_LABEL: Record<Tier, string> = {
  "primitive-palette": "primitive palette",
  "functional-scale": "functional 12-step scale",
  "semantic-role": "semantic role",
  "semantic-alias": "semantic alias",
  compat: "Geist-compat tier",
  elevation: "elevation ramp",
  foundation: "foundation",
};

// ─── the resolved token ──────────────────────────────────────────────────────

export interface Token {
  /** DTCG path, e.g. `["scale", "neutral", "9"]`. */
  path: string[];
  /** Top-level DTCG group, e.g. `scale`. */
  group: string;
  /** Path below the group, e.g. `neutral.9`. */
  name: string;
  /** The CSS custom property the pipeline emits, WITHOUT `--`. */
  cssVar: string | null;
  /** DTCG `$type`. */
  type: string;
  /** `$value` exactly as authored in the winning file — alias braces intact. */
  authored: string;
  /** After alias resolution and border-tier derivation. */
  resolved: string;
  /** The token's own `$description`, verbatim. Never paraphrased. */
  description: string | null;
  /**
   * The description of the SLOT this token fills, which is what states its role.
   *
   * `themes/light.json` documents the 12-step scale ("default border",
   * "secondary text"); `themes/dark.json` re-declares the same slots with dark
   * values and no descriptions, because the role does not change between modes —
   * only the value does. So a dark token with no description of its own borrows
   * the light declaration of the same CSS variable, and the page labels it as
   * borrowed. Still read out of the source; never authored here.
   */
  slotDescription: string | null;
  /** True when `slotDescription` came from the other mode's declaration. */
  slotDescriptionBorrowed: boolean;
  /** Which file's declaration won for this mode. */
  source: SourceKey;
  layer: Layer;
  tier: Tier;
  /** True when `authored` is a `{a.b.c}` alias. */
  isAlias: boolean;
  /** The alias target path, when aliased. */
  aliasTarget: string | null;
  /** Set when the build COMPUTES this value rather than reading it. */
  derivation: { space: string; tier: string } | null;
  /** True when the resolved value still contains `var(...)`. */
  runtimeOnly: boolean;
  /**
   * Other files that also declare this same CSS variable, earlier in the merge.
   * A non-empty list is an override — the thing readers most often miss.
   */
  overrides: SourceKey[];
}

export interface TokenSet {
  mode: Mode;
  tokens: Token[];
  byVar: Map<string, Token>;
  /** The mode's own page background and body text, resolved. */
  background: Token | undefined;
  foreground: Token | undefined;
  /** What `deriveBorderTier` computed for this mode, for the layer-model page. */
  derivations: { name: string; hex: string; anchorStep: string; t: number; bright: boolean }[];
}

// ─── merge / derive / resolve ────────────────────────────────────────────────

/**
 * Merge one DTCG file over another, the way Style Dictionary's include/source
 * ordering does: later files win.
 *
 * A LEAF is replaced whole rather than field-merged. That is the behaviour the
 * theme files rely on — `themes/dark.json` re-declares a slot completely, and a
 * field-merge would leave it wearing the light file's `$description` while
 * carrying a dark value. `slotDescription` handles the borrow explicitly instead,
 * so it is visible on the page rather than implied by the merge.
 */
function deepMerge(target: TokenNode, patch: TokenNode): TokenNode {
  for (const [key, value] of Object.entries(patch)) {
    // File-level `$schema` / `$description` are metadata, not tokens.
    if (key.startsWith("$")) continue;

    const existing = target[key];
    if (isLeaf(value) || !value || typeof value !== "object") {
      target[key] = value;
      continue;
    }
    if (existing && typeof existing === "object" && !isLeaf(existing)) {
      deepMerge(existing, value);
    } else {
      target[key] = structuredClone(value);
    }
  }
  return target;
}

function* walk(
  node: TokenNode,
  path: string[] = [],
): Generator<{ path: string[]; leaf: TokenLeafRaw }> {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (isLeaf(child)) {
      yield { path: [...path, key], leaf: child };
      continue;
    }
    if (child && typeof child === "object") yield* walk(child as TokenNode, [...path, key]);
  }
}

const ALIAS_RE = /^\{([^}]+)\}$/u;

function lookup(tree: TokenNode, dotted: string): TokenLeafRaw | null {
  let node: unknown = tree;
  for (const segment of dotted.split(".")) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return isLeaf(node) ? node : null;
}

/** Follow `{a.b.c}` aliases to a literal. Cycles resolve to the last hop seen. */
function resolveAlias(tree: TokenNode, raw: string): string {
  let current = raw;
  const seen = new Set<string>();
  while (typeof current === "string") {
    const match = ALIAS_RE.exec(current.trim());
    if (!match) break;
    const target = match[1];
    if (target === undefined || seen.has(target)) break;
    seen.add(target);
    const leaf = lookup(tree, target);
    if (!leaf) break;
    current = String(leaf.$value);
  }
  return current;
}

interface Declaration {
  /** Every file declaring this path, in merge order. The last one wins. */
  sources: SourceKey[];
  /**
   * `$value` as it is literally written in the winning file, captured BEFORE
   * `deriveBorderTier` overwrites the placeholder of a derived step. Without
   * this snapshot the page could not show that steps 6/7/8 are computed — the
   * merged tree no longer remembers.
   */
  authored: string;
}

function declarationMap(order: readonly SourceKey[]): Map<string, Declaration> {
  const map = new Map<string, Declaration>();
  for (const key of order) {
    for (const { path, leaf } of walk(readTokenFile(key))) {
      const dotted = path.join(".");
      const existing = map.get(dotted);
      if (existing) {
        existing.sources.push(key);
        existing.authored = String(leaf.$value);
      } else {
        map.set(dotted, { sources: [key], authored: String(leaf.$value) });
      }
    }
  }
  return map;
}

function buildSet(mode: Mode): TokenSet {
  const order: readonly SourceKey[] = ["core", "semantic", mode];
  const declaredIn = declarationMap(order);

  const merged = order.reduce<TokenNode>(
    (acc, key) => deepMerge(acc, readTokenFile(key)),
    {} as TokenNode,
  );

  // Step 2 — the SAME derivation the token build runs. Mutates `merged` so that
  // scale steps 6/7/8 carry computed hexes rather than placeholder aliases.
  const derivationLog = deriveBorderTier(merged);

  // Step 3 — last declaration of a variable name wins, exactly as
  // `registerLayeredNameTransform` decides it in the build config.
  const ownerByVar = new Map<string, string>();
  for (const { path } of walk(merged)) {
    const cssVar = pathToCssVarName({ path });
    if (cssVar) ownerByVar.set(cssVar, path.join("."));
  }

  const tokens: Token[] = [];
  for (const { path, leaf } of walk(merged)) {
    const dotted = path.join(".");
    const cssVar = pathToCssVarName({ path });
    // A duplicated variable name is emitted once, by its last declaration.
    if (cssVar && ownerByVar.get(cssVar) !== dotted) continue;

    const declaration = declaredIn.get(dotted);
    const declarations = declaration?.sources ?? [];
    const winner = declarations.at(-1) ?? "core";
    // From the snapshot, not from the merged tree: a derived step's merged
    // `$value` is already the computed hex.
    const authored = declaration?.authored ?? String(leaf.$value);
    const aliasMatch = ALIAS_RE.exec(authored.trim());
    const derivation = leaf.$extensions?.["com.nebutra.derive"] as
      | { space?: string; tier?: string }
      | undefined;

    // The merged tree is post-derivation, so this picks up the computed value
    // for steps 6/7/8 and follows aliases for everything else.
    const resolved = resolveAlias(merged, String(leaf.$value));

    tokens.push({
      path,
      group: path[0] ?? "",
      name: path.slice(1).join("."),
      cssVar,
      type: leaf.$type ?? "unknown",
      authored,
      resolved,
      description: leaf.$description ?? null,
      slotDescription: leaf.$description ?? null,
      slotDescriptionBorrowed: false,
      source: winner,
      layer: LAYER_BY_SOURCE[winner],
      tier: (path[0] === undefined ? undefined : TIER_BY_GROUP[path[0]]) ?? "foundation",
      isAlias: aliasMatch !== null,
      aliasTarget: aliasMatch?.[1] ?? null,
      derivation:
        derivation === undefined
          ? null
          : { space: derivation.space ?? "oklab", tier: derivation.tier ?? "unknown" },
      runtimeOnly: resolved.includes("var("),
      overrides: declarations.slice(0, -1),
    });
  }

  const byVar = new Map<string, Token>();
  for (const token of tokens) if (token.cssVar) byVar.set(token.cssVar, token);

  return {
    mode,
    tokens,
    byVar,
    background: byVar.get("background"),
    foreground: byVar.get("foreground"),
    derivations: derivationLog.map((entry) => ({
      name: entry.name,
      hex: entry.hex,
      anchorStep: entry.meta.anchorStep,
      t: entry.meta.t,
      bright: entry.meta.bright,
    })),
  };
}

/**
 * Give every token whose own declaration has no `$description` the description
 * of the same CSS variable in the other mode. The 12-step scale is documented
 * once, in `themes/light.json`; the slot's role is mode-independent.
 */
function backfillSlotDescriptions(a: TokenSet, b: TokenSet): void {
  for (const [target, donor] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const token of target.tokens) {
      if (token.slotDescription !== null || token.cssVar === null) continue;
      const other = donor.byVar.get(token.cssVar);
      if (!other?.description) continue;
      token.slotDescription = other.description;
      token.slotDescriptionBorrowed = true;
    }
  }
}

// The four JSON files are read once per build, not once per page.
const SETS: Record<Mode, TokenSet> = {
  light: buildSet("light"),
  dark: buildSet("dark"),
};

backfillSlotDescriptions(SETS.light, SETS.dark);

export function tokenSet(mode: Mode): TokenSet {
  return SETS[mode];
}

/** Both modes, always in the order light → dark. */
export function bothModes(): TokenSet[] {
  return MODES.map(tokenSet);
}

/** Tokens of one DTCG group, in source order. */
export function group(mode: Mode, name: string): Token[] {
  return tokenSet(mode).tokens.filter((token) => token.group === name);
}

/** Every top-level DTCG group present in the source, with a token count. */
export function groups(mode: Mode): { name: string; tier: Tier; count: number }[] {
  const counts = new Map<string, number>();
  for (const token of tokenSet(mode).tokens) {
    counts.set(token.group, (counts.get(token.group) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({
    name,
    tier: TIER_BY_GROUP[name] ?? "foundation",
    count,
  }));
}
