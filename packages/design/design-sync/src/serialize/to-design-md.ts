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
 *
 * File layout:
 *   to-design-md.ts        — public API + YAML front-matter builder (this file)
 *   to-design-md.resolve.ts — token index building + alias/hex resolution
 *   to-design-md.prose.ts  — markdown prose builder + shared types + constants
 */

import type { DesignTokenSet } from "../types";
import {
  buildProse,
  COLOR_ORDER,
  type ColorRoles,
  type RoundedMap,
  type SpacingMap,
  type TypographyMap,
} from "./to-design-md.prose";
import {
  buildIndex,
  buildIndexForSet,
  buildRounded,
  buildSpacing,
  buildTypography,
  readContainers,
  resolveColorRoles,
} from "./to-design-md.resolve";

// ─── Public API ────────────────────────────────────────────────────────────────

export interface ToDesignMdOptions {
  /**
   * Design system name written into the exported artefact.
   *
   * Defaults to a generic label on purpose: this package is provider-agnostic
   * and has no brand of its own, so naming one here would stamp it onto every
   * downstream design system that did not pass this option.
   */
  name?: string;
  /** One-line brand description for the front matter and prose Overview. */
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
 * @param sets    All token sets to merge (e.g. core + semantic + theme).
 * @param options Optional overrides for name, description, and theme.
 * @returns A deterministic DESIGN.md string (YAML front matter + markdown prose).
 */
export function serializeToDesignMd(sets: DesignTokenSet[], options?: ToDesignMdOptions): string {
  const name = options?.name ?? "Design System";
  const description = options?.description;

  // 1. Build a flat path→leaf index across ALL sets
  const index = buildIndex(sets);

  // 2. Build a flat path→leaf index for only the theme set (if requested)
  const themeIndex =
    options?.theme != null
      ? buildIndexForSet(sets.find((s) => s.name === options.theme)?.tokens ?? {})
      : new Map();

  // 3. Resolve roles to hex (skip if source absent; throw if alias is dangling)
  const { roles: colors, descriptions: colorDescriptions } = resolveColorRoles(index, themeIndex);
  const typography = buildTypography(index);
  const rounded = buildRounded(index);
  const spacing = buildSpacing(index);
  const containers = readContainers(index);

  // 4. Emit
  const fmDescription =
    description ??
    "AI-native SaaS design system. Brand: 云毓蓝 blue (#0033fe) → 云毓青 cyan (#0bf1c3).";
  const frontMatter = buildFrontMatter({
    name,
    description: fmDescription,
    colors,
    typography,
    rounded,
    spacing,
  });
  const prose = buildProse({
    name,
    ...(description !== undefined ? { description } : {}),
    colors,
    colorDescriptions,
    typography,
    rounded,
    containers,
  });

  return `---\n${frontMatter}---\n${prose}`;
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

/**
 * Escape a string value for use in YAML double-quoted scalars.
 * Backslash must be escaped first (to avoid double-escaping), then double-quotes.
 */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
