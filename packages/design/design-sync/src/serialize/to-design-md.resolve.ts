/**
 * DTCG → DESIGN.md resolver layer
 *
 * Builds flat token indexes from token sets, resolves aliases, extracts
 * typed values (colors, typography, rounded, spacing, containers).
 *
 * Imported by `to-design-md.ts`; do NOT import this file directly in app code.
 */

import type { DesignTokenLeaf, DesignTokenSet, DesignTokenTree } from "../types";
import type {
  ColorDescriptions,
  ColorRoles,
  ContainerInfo,
  RoundedMap,
  SpacingMap,
  TypographyMap,
} from "./to-design-md.prose";

// ─── Public exports ────────────────────────────────────────────────────────────

export type { ResolvedColors };
export {
  buildIndex,
  buildIndexForSet,
  buildRounded,
  buildSpacing,
  buildTypography,
  readContainers,
  resolveColorRoles,
};

// ─── Internal types ────────────────────────────────────────────────────────────

type FlatIndex = Map<string, DesignTokenLeaf>;

interface ResolvedColors {
  roles: ColorRoles;
  descriptions: ColorDescriptions;
}

// ─── Index building ────────────────────────────────────────────────────────────

function buildIndex(sets: DesignTokenSet[]): FlatIndex {
  const index: FlatIndex = new Map();
  for (const set of sets) {
    flattenTree(set.tokens, "", index);
  }
  return index;
}

function buildIndexForSet(tree: DesignTokenTree): FlatIndex {
  const index: FlatIndex = new Map();
  flattenTree(tree, "", index);
  return index;
}

function flattenTree(node: DesignTokenTree, prefix: string, out: FlatIndex): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue; // skip $schema, $description at group level
    const path = prefix ? `${prefix}.${key}` : key;
    if (isLeaf(value)) {
      out.set(path, value as DesignTokenLeaf);
    } else {
      flattenTree(value as DesignTokenTree, path, out);
    }
  }
}

function isLeaf(value: unknown): boolean {
  return typeof value === "object" && value !== null && "$value" in value && "$type" in value;
}

// ─── Alias resolution ──────────────────────────────────────────────────────────

const ALIAS_RE = /^\{([^}]+)\}$/;

/**
 * Resolve a token value to its literal (non-alias) string.
 * Throws if the alias is dangling (referenced path not in index).
 * Returns null only if the path itself is missing from the index (graceful skip).
 *
 * @param path       The current token path being resolved.
 * @param index      The flat token index to look up.
 * @param visited    Set of paths already visited (cycle detection).
 * @param originPath The originating token path (for cycle error messages).
 */
export function resolveValue(
  path: string,
  index: FlatIndex,
  visited: Set<string> = new Set(),
  originPath?: string,
): string | null {
  const leaf = index.get(path);
  if (!leaf) return null; // graceful: source token absent

  const raw = String(leaf.$value);
  const match = ALIAS_RE.exec(raw);

  if (!match) return raw; // literal value

  const refPath = match[1] as string;
  if (visited.has(refPath)) {
    const origin = originPath ?? path;
    throw new Error(
      `[design-sync] Cycle detected resolving token alias starting from "${origin}": ${[...visited, refPath].join(" → ")}`,
    );
  }

  // Check the alias exists in the index before recursing
  if (!index.has(refPath)) {
    throw new Error(
      `[design-sync] Dangling token alias: {${refPath}} referenced by "${path}" could not be resolved. ` +
        `Ensure the token set containing "${refPath}" is included in the sets array.`,
    );
  }

  return resolveValue(refPath, index, new Set([...visited, refPath]), originPath ?? path);
}

// ─── Hex validation ────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

/** Returns a lowercase #rrggbb string, or null if the value isn't a bare hex. */
function toHex(value: string): string | null {
  const v = value.trim();
  if (!HEX_RE.test(v)) return null;
  const lower = v.toLowerCase();
  // Expand 3-char shorthand (#abc → #aabbcc)
  if (lower.length === 4) {
    const r = lower[1]!;
    const g = lower[2]!;
    const b = lower[3]!;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return lower;
}

// ─── Color role mapping ────────────────────────────────────────────────────────

/** Map from color role name to the dot-path in the merged index. */
const COLOR_ROLE_PATHS: Array<[keyof ColorRoles, string]> = [
  ["primary", "brand.primary"],
  ["accent", "brand.accent"],
  ["tertiary", "brand.tertiary"],
  ["danger", "status.danger"],
  ["warning", "status.warning"],
  ["success", "status.success"],
];

function resolveColorRoles(index: FlatIndex, themeIndex: FlatIndex): ResolvedColors {
  const roles: ColorRoles = {};
  const descriptions: ColorDescriptions = {};

  for (const [role, path] of COLOR_ROLE_PATHS) {
    if (!index.has(path)) continue;
    const resolved = resolveValue(path, index, new Set(), path);
    if (resolved == null) continue;
    const hex = toHex(resolved);
    if (!hex) continue; // non-hex (gradient etc.) — skip from colors group
    roles[role] = hex;
    const sourceLeaf = index.get(path);
    if (sourceLeaf?.$description) {
      descriptions[role] = sourceLeaf.$description;
    }
  }

  // Theme-specific: background + foreground
  if (themeIndex.size > 0) {
    for (const [role, path] of [
      ["background", "color.background"],
      ["foreground", "color.foreground"],
    ] as const) {
      if (!themeIndex.has(path)) continue;
      const resolved = resolveValue(path, themeIndex, new Set(), path);
      if (resolved == null) continue;
      const hex = toHex(resolved);
      if (!hex) continue;
      roles[role] = hex;
      const sourceLeaf = themeIndex.get(path);
      if (sourceLeaf?.$description) {
        descriptions[role] = sourceLeaf.$description;
      }
    }
  }

  return { roles, descriptions };
}

// ─── Typography ────────────────────────────────────────────────────────────────

function buildTypography(index: FlatIndex): TypographyMap {
  const sansRaw = resolveValue("fontFamily.sans", index);
  const monoRaw = resolveValue("fontFamily.mono", index);

  const sansFontFamily = sansRaw ?? "Geist, system-ui, sans-serif";
  const monoFontFamily = monoRaw ?? "Geist Mono, ui-monospace, monospace";

  return {
    h1: { fontFamily: sansFontFamily, fontSize: "3rem" },
    "body-md": { fontFamily: sansFontFamily, fontSize: "1rem" },
    label: { fontFamily: monoFontFamily, fontSize: "0.75rem" },
  };
}

// ─── Rounded ──────────────────────────────────────────────────────────────────

/** Stable key order for size.radius entries. */
const RADIUS_KEY_ORDER = [
  "none",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "full",
  "button",
  "card",
  "panel",
];

function buildRounded(index: FlatIndex): RoundedMap {
  const result: RoundedMap = {};
  const prefix = "size.radius.";

  const found: string[] = [];
  for (const key of index.keys()) {
    if (key.startsWith(prefix)) {
      found.push(key.slice(prefix.length));
    }
  }

  // Sort by canonical order then alphabetically for any extras
  found.sort((a, b) => {
    const ai = RADIUS_KEY_ORDER.indexOf(a);
    const bi = RADIUS_KEY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const key of found) {
    const resolved = resolveValue(`${prefix}${key}`, index);
    if (resolved != null) {
      result[key] = resolved;
    }
  }

  return result;
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

/** Stable key order for size.spacing entries. */
const SPACING_KEY_ORDER = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];

function buildSpacing(index: FlatIndex): SpacingMap | null {
  const prefix = "size.spacing.";
  const found: string[] = [];

  for (const key of index.keys()) {
    if (key.startsWith(prefix)) {
      found.push(key.slice(prefix.length));
    }
  }

  if (found.length === 0) return null;

  // Sort by canonical order then alphabetically for any extras (determinism)
  found.sort((a, b) => {
    const ai = SPACING_KEY_ORDER.indexOf(a);
    const bi = SPACING_KEY_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  const result: SpacingMap = {};
  for (const shortKey of found) {
    const resolved = resolveValue(`${prefix}${shortKey}`, index);
    if (resolved != null) {
      result[shortKey] = resolved;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

// ─── Containers ───────────────────────────────────────────────────────────────

function readContainers(index: FlatIndex): ContainerInfo {
  const info: ContainerInfo = {};
  for (const [role, path] of [
    ["text", "size.container.text"],
    ["content", "size.container.content"],
    ["wide", "size.container.wide"],
  ] as const) {
    const resolved = resolveValue(path, index);
    if (resolved != null) {
      info[role] = resolved;
    }
  }
  return info;
}
