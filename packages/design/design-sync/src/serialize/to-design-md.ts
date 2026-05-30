/**
 * DTCG → DESIGN.md serializer
 *
 * Converts a set of W3C DTCG token files into a DESIGN.md document:
 *   - YAML front matter (machine tokens): colors, typography, rounded, spacing
 *   - Markdown prose sections in the spec-mandated order
 *
 * Pure function — no filesystem I/O, no @google/design.md dependency.
 *
 * Known v1 scope limits:
 *   - No `components:` group in front matter (avoids contrast-lint risk from
 *     lack of structured component token data in this version).
 *   - Elevation/shadows are prose-only (DESIGN.md spec has no structured
 *     elevation token type; this is a documented spec gap).
 */

import type { DesignTokenLeaf, DesignTokenSet, DesignTokenTree } from "../types";

// ─── Public API ────────────────────────────────────────────────────────────────

export interface ToDesignMdOptions {
  /** Design system name. Default: "Nebutra" */
  name?: string;
  /** One-line brand description for the front matter. */
  description?: string;
  /**
   * Name of a theme token set (e.g. "themes/light") whose
   * `color.background` and `color.foreground` tokens are included in the
   * `colors` front-matter group.
   */
  theme?: string;
}

/**
 * Serialize an array of DTCG token sets into a DESIGN.md string.
 *
 * @param sets   All token sets to merge (e.g. core + semantic + theme).
 * @param options Optional overrides for name, description, and theme.
 * @returns A deterministic DESIGN.md string (YAML front matter + markdown prose).
 */
export function serializeToDesignMd(sets: DesignTokenSet[], options?: ToDesignMdOptions): string {
  const name = options?.name ?? "Nebutra";
  const description =
    options?.description ??
    "AI-native SaaS design system. Brand: 云毓蓝 blue (#0033fe) → 云毓青 cyan (#0bf1c3).";

  // 1. Build a flat path→leaf index across ALL sets
  const index = buildIndex(sets);

  // 2. Build a flat path→leaf index for only the theme set (if requested)
  const themeIndex: FlatIndex =
    options?.theme != null
      ? buildIndexForSet(sets.find((s) => s.name === options.theme)?.tokens ?? {})
      : new Map();

  // 3. Resolve roles to hex (skip if source absent; throw if alias is dangling)
  const colors = resolveColorRoles(index, themeIndex);
  const typography = buildTypography(index);
  const rounded = buildRounded(index);
  const spacing = buildSpacing(index);
  const containers = readContainers(index);

  // 4. Emit
  const frontMatter = buildFrontMatter({ name, description, colors, typography, rounded, spacing });
  const prose = buildProse({ name, colors, typography, rounded, containers });

  return `---\n${frontMatter}---\n${prose}`;
}

// ─── Internal types ────────────────────────────────────────────────────────────

type FlatIndex = Map<string, DesignTokenLeaf>;

interface ColorRoles {
  primary?: string;
  accent?: string;
  tertiary?: string;
  danger?: string;
  warning?: string;
  success?: string;
  background?: string;
  foreground?: string;
}

interface TypographyEntry {
  fontFamily: string;
  fontSize: string;
}

interface TypographyMap {
  h1: TypographyEntry;
  "body-md": TypographyEntry;
  label: TypographyEntry;
}

interface RoundedMap {
  [key: string]: string;
}

interface SpacingMap {
  [key: string]: string;
}

interface ContainerInfo {
  text?: string;
  content?: string;
  wide?: string;
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
 */
function resolveValue(
  path: string,
  index: FlatIndex,
  visited: Set<string> = new Set(),
): string | null {
  const leaf = index.get(path);
  if (!leaf) return null; // graceful: source token absent

  const raw = String(leaf.$value);
  const match = ALIAS_RE.exec(raw);

  if (!match) return raw; // literal value

  const refPath = match[1] as string;
  if (visited.has(refPath)) {
    throw new Error(
      `[design-sync] Cycle detected resolving token alias: ${[...visited, refPath].join(" → ")}`,
    );
  }

  // Check the alias exists in the index before recursing
  if (!index.has(refPath)) {
    throw new Error(
      `[design-sync] Dangling token alias: {${refPath}} referenced by "${path}" could not be resolved. ` +
        `Ensure the token set containing "${refPath}" is included in the sets array.`,
    );
  }

  return resolveValue(refPath, index, new Set([...visited, refPath]));
}

// ─── Hex validation ────────────────────────────────────────────────────────────

const HEX_RE = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

/** Returns a lowercase #rrggbb string, or null if the value isn't a bare hex. */
function toHex(value: string): string | null {
  const v = value.trim();
  if (!HEX_RE.test(v)) return null;
  return v.toLowerCase();
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

function resolveColorRoles(index: FlatIndex, themeIndex: FlatIndex): ColorRoles {
  const roles: ColorRoles = {};

  for (const [role, path] of COLOR_ROLE_PATHS) {
    // Skip gracefully if the token is absent
    if (!index.has(path)) continue;
    const resolved = resolveValue(path, index);
    if (resolved == null) continue;
    const hex = toHex(resolved);
    if (!hex) continue; // non-hex (gradient etc.) — skip from colors group
    roles[role] = hex;
  }

  // Theme-specific: background + foreground
  if (themeIndex.size > 0) {
    for (const [role, path] of [
      ["background", "color.background"],
      ["foreground", "color.foreground"],
    ] as const) {
      if (!themeIndex.has(path)) continue;
      const resolved = resolveValue(path, themeIndex);
      if (resolved == null) continue;
      const hex = toHex(resolved);
      if (!hex) continue;
      roles[role] = hex;
    }
  }

  return roles;
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

  // Collect all radius keys from the index
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

function buildSpacing(index: FlatIndex): SpacingMap | null {
  // Only include if there are explicit size.spacing.* tokens (optional in our DTCG files)
  const prefix = "size.spacing.";
  const result: SpacingMap = {};
  for (const [key, _leaf] of index) {
    if (key.startsWith(prefix)) {
      const shortKey = key.slice(prefix.length);
      const resolved = resolveValue(key, index);
      if (resolved != null) {
        result[shortKey] = resolved;
      }
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

// ─── Front-matter builder ──────────────────────────────────────────────────────

interface FmArgs {
  name: string;
  description: string;
  colors: ColorRoles;
  typography: TypographyMap;
  rounded: RoundedMap;
  spacing: SpacingMap | null;
}

function yamlString(value: string): string {
  // Escape double quotes within the value
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildFrontMatter(args: FmArgs): string {
  const lines: string[] = [];

  lines.push(`version: alpha`);
  lines.push(`name: ${yamlString(args.name)}`);
  lines.push(`description: ${yamlString(args.description)}`);

  // colors:
  const colorEntries = Object.entries(args.colors);
  if (colorEntries.length > 0) {
    lines.push(`colors:`);
    // Stable key order
    const COLOR_ORDER: Array<keyof ColorRoles> = [
      "primary",
      "accent",
      "tertiary",
      "danger",
      "warning",
      "success",
      "background",
      "foreground",
    ];
    const ordered = COLOR_ORDER.filter((k) => args.colors[k] != null);
    for (const key of ordered) {
      lines.push(`  ${key}: ${yamlString(args.colors[key]!)}`);
    }
  }

  // typography:
  lines.push(`typography:`);
  for (const [variant, entry] of Object.entries(args.typography)) {
    lines.push(`  ${variant}:`);
    lines.push(`    fontFamily: ${yamlString(entry.fontFamily)}`);
    lines.push(`    fontSize: ${yamlString(entry.fontSize)}`);
  }

  // rounded:
  const roundedEntries = Object.entries(args.rounded);
  if (roundedEntries.length > 0) {
    lines.push(`rounded:`);
    for (const [key, value] of roundedEntries) {
      lines.push(`  ${key}: ${yamlString(value)}`);
    }
  }

  // spacing: (optional)
  if (args.spacing != null) {
    const spacingEntries = Object.entries(args.spacing);
    if (spacingEntries.length > 0) {
      lines.push(`spacing:`);
      for (const [key, value] of spacingEntries) {
        lines.push(`  ${key}: ${yamlString(value)}`);
      }
    }
  }

  return lines.join("\n") + "\n";
}

// ─── Prose builder ────────────────────────────────────────────────────────────

interface ProseArgs {
  name: string;
  colors: ColorRoles;
  typography: TypographyMap;
  rounded: RoundedMap;
  containers: ContainerInfo;
}

function buildProse(args: ProseArgs): string {
  const sections: string[] = [];

  // ── Overview ──
  sections.push(
    `## Overview\n\n` +
      `${args.name} is an AI-native SaaS design system built on the 云毓蓝 blue (#0033fe) → 云毓青 cyan (#0bf1c3) brand palette. ` +
      `It targets Vercel/Geist visual parity, enforces semantic tokens over raw hex values, and ships with ` +
      `a token-first architecture (DTCG W3C draft) that drives CSS variables, Tailwind utilities, and the Style Dictionary pipeline.`,
  );

  // ── Colors ──
  const COLOR_LABELS: Record<keyof ColorRoles, string> = {
    primary: "Primary",
    accent: "Accent",
    tertiary: "Tertiary",
    danger: "Danger",
    warning: "Warning",
    success: "Success",
    background: "Background",
    foreground: "Foreground",
  };

  // Re-collect $description from the semantic tokens mapping
  const COLOR_DESCRIPTIONS: Partial<Record<keyof ColorRoles, string>> = {
    primary: "Brand primary — 云毓蓝",
    accent: "Brand accent — 云毓青",
    tertiary: "Tertiary accent — data viz, infrastructure tags",
  };

  const colorLines: string[] = [];
  const COLOR_ORDER: Array<keyof ColorRoles> = [
    "primary",
    "accent",
    "tertiary",
    "danger",
    "warning",
    "success",
    "background",
    "foreground",
  ];
  for (const key of COLOR_ORDER) {
    const hex = args.colors[key];
    if (!hex) continue;
    const label = COLOR_LABELS[key];
    const desc = COLOR_DESCRIPTIONS[key];
    colorLines.push(`- **${label}** (\`${hex}\`)${desc ? ` — ${desc}` : ""}`);
  }

  sections.push(
    `## Colors\n\n` +
      (colorLines.length > 0 ? colorLines.join("\n") : "_No color roles resolved._"),
  );

  // ── Typography ──
  const typLines: string[] = [];
  for (const [variant, entry] of Object.entries(args.typography)) {
    typLines.push(`- **${variant}**: \`${entry.fontSize}\` — ${entry.fontFamily}`);
  }
  sections.push(`## Typography\n\n` + typLines.join("\n"));

  // ── Layout ──
  const containerLines: string[] = [];
  if (args.containers.text) {
    containerLines.push(
      `- **text** (\`${args.containers.text}\`) — Reading-focused: hero copy, FAQ, article body`,
    );
  }
  if (args.containers.content) {
    containerLines.push(
      `- **content** (\`${args.containers.content}\`) — Pricing tables, blog index, architecture diagrams`,
    );
  }
  if (args.containers.wide) {
    containerLines.push(
      `- **wide** (\`${args.containers.wide}\`) — Feature bento grids, testimonials, product demo sections, navbar`,
    );
  }

  const layoutBody =
    containerLines.length > 0
      ? `Three container-width tiers constrain layout density:\n\n` + containerLines.join("\n")
      : `Use the \`--container-text\`, \`--container-content\`, and \`--container-wide\` CSS variables for layout constraints.`;

  sections.push(`## Layout\n\n` + layoutBody);

  // ── Elevation & Depth ──
  sections.push(
    `## Elevation & Depth\n\n` +
      `Elevation is expressed as layered box-shadows (xs → 2xl) plus brand-tinted glow variants (\`brand\`, \`brand-lg\`). ` +
      `No structured elevation token is emitted in this DESIGN.md because the current DESIGN.md specification ` +
      `has no elevation token type (this is a documented spec gap). ` +
      `Consume shadows via the \`elevation.*\` token set in the DTCG source files or the ` +
      `Tailwind \`shadow-*\` utilities mapped from those tokens.`,
  );

  // ── Shapes ──
  const roundedKeys = Object.keys(args.rounded);
  const shapeBody =
    roundedKeys.length > 0
      ? `Border-radius follows a named scale: ${roundedKeys.map((k) => `**${k}** (\`${args.rounded[k]}\`)`).join(", ")}. ` +
        `Use \`size.radius.*\` tokens — never hardcode \`border-radius\` values.`
      : `Border-radius follows the \`size.radius.*\` token scale. Use named tokens, never hardcode values.`;

  sections.push(`## Shapes\n\n` + shapeBody);

  // ── Components ──
  sections.push(
    `## Components\n\n` +
      `No structured component tokens are emitted in DESIGN.md v1 (avoids contrast-lint risk without full component token coverage). ` +
      `Component rules live in the Storybook \`@nebutra/ui\` library and the \`@nebutra/tokens\` CSS variable sheet. ` +
      `All interactive components must use \`@nebutra/ui/primitives\` form controls — raw \`<input>\`/\`<select>\`/\`<textarea>\` ` +
      `are banned in \`apps/**\` (lint-enforced via \`scripts/lint-no-raw-inputs.mjs\`).`,
  );

  // ── Do's and Don'ts ──
  const dos = [
    "Use semantic tokens / CSS variables (`bg-primary`, `text-foreground`, `border-border`) — never raw hex values.",
    "Use the brand gradient (135° blue→cyan) for primary CTAs and gradient text effects.",
    "Use `AnimateIn` presets for entrance animations; never use raw `motion.div` with hardcoded transition values.",
    "Constrain layouts to the container width tiers; use the wide (1400px) container for feature sections.",
    "Give icon-only buttons an `aria-label`; rely on the global `:focus-visible` ring — do not add component-level focus rings.",
  ];
  const donts = [
    "Don't hardcode brand or status hex values in components — use token aliases (`var(--brand-primary)`, etc.).",
    "Don't use `max-w-5xl` or `max-w-7xl` for feature sections — use the wide container (`max-w-[1400px]`).",
    "Don't reintroduce hardcoded focus rings (they double-render with the global `:focus-visible` rule).",
    "Don't use raw form controls (`<input>`, `<select>`, `<textarea>`) in app surfaces — use the primitives from `@nebutra/ui/primitives`.",
  ];

  const doSection = dos.map((d) => `- ✓ ${d}`).join("\n");
  const dontSection = donts.map((d) => `- ✗ ${d}`).join("\n");

  sections.push(`## Do's and Don'ts\n\n### Do\n\n${doSection}\n\n### Don't\n\n${dontSection}`);

  return "\n" + sections.join("\n\n") + "\n";
}
