/**
 * DESIGN.md → DTCG theme importer
 *
 * Parse approach: programmatic via `lint()` from `@google/design.md/linter`.
 * The `lint()` function parses the DESIGN.md content synchronously and returns
 * a `DesignSystemState` with typed Maps for colors, rounded, spacing, and
 * typography. We reshape that state into our DTCG naming convention:
 *   - colors.<x>   → color.<x>    ($type: "color",      $value: hex string)
 *   - rounded.<x>  → radius.<x>   ($type: "dimension",  $value: "<n><unit>" string)
 *   - spacing.<x>  → spacing.<x>  ($type: "dimension",  $value: "<n><unit>" string)
 *   - body font    → fontFamily.sans ($type: "fontFamily", $value: string)
 *
 * NEVER import `@google/design.md` (main entry — auto-runs CLI). Only the
 * `@google/design.md/linter` subpath export is used here.
 *
 * All @google/design.md coupling is isolated in THIS file.
 */

import { lint } from "@google/design.md/linter";
import { validateDtcgTree } from "../io";
import type { DesignTokenSet, DesignTokenTree } from "../types";

// ─── Public API ────────────────────────────────────────────────────────────────

export interface ImportReport {
  /** Human-readable strings noting content that has no structured DTCG equivalent. */
  unmapped: string[];
  /** Registry-required token keys absent from the produced tree (dot-path format). */
  missingRequired: string[];
  /** Non-fatal warnings encountered during import. */
  warnings: string[];
}

export interface ImportResult {
  set: DesignTokenSet;
  report: ImportReport;
}

export interface ImportFromDesignMdOptions {
  /**
   * Override the slug used for `relativePath` and `name`.
   * Takes precedence over the `name` field in the DESIGN.md front matter.
   */
  brandName?: string;
}

// ─── Required token keys (registry contract) ──────────────────────────────────

const REQUIRED_TOKEN_PATHS = [
  "color.primary",
  "color.primary-foreground",
  "color.background",
  "color.foreground",
  "color.card",
  "color.border",
  "color.ring",
  "radius.md",
  "fontFamily.sans",
] as const;

// ─── Prose-only section headings (not emittable as DTCG leaves) ───────────────

/** Lowercase heading names that are prose/reference-only and cannot map to DTCG leaves. */
const PROSE_ONLY_HEADINGS = new Set(["elevation", "components", "shapes"]);

// ─── Slug helper ──────────────────────────────────────────────────────────────

/**
 * Convert an arbitrary string into a URL-safe, lowercase, hyphenated slug.
 * Non-alphanumeric characters are replaced with hyphens; leading/trailing
 * hyphens and consecutive hyphens are collapsed.
 */
function toKebabSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Token presence checker ───────────────────────────────────────────────────

/**
 * Walk the DTCG tree and check whether the given dot-path (e.g. "color.primary")
 * resolves to a leaf node with `$value`.
 */
function hasToken(tree: DesignTokenTree, dotPath: string): boolean {
  const segments = dotPath.split(".");
  let node: unknown = tree;
  for (const seg of segments) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      return false;
    }
    node = (node as Record<string, unknown>)[seg];
  }
  return node !== null && typeof node === "object" && "$value" in (node as object);
}

// ─── DTCG leaf-group builder ──────────────────────────────────────────────────

/**
 * Cast a plain record of typed leaf objects to `DesignTokenTree`.
 * Having the unsafe cast in one helper keeps the top-level code clean.
 */
function leafGroup(entries: Record<string, { $value: string; $type: string }>): DesignTokenTree {
  return entries as unknown as DesignTokenTree;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a DESIGN.md document and produce a DTCG-compliant `DesignTokenSet`
 * scoped to the `themes/` bucket (SSOT-safe — never overwrites core or semantic).
 *
 * The function is SYNCHRONOUS; it never reads from or writes to the filesystem.
 *
 * @param content - Raw DESIGN.md content (markdown + YAML front matter).
 * @param options - Optional: `brandName` to override the slug.
 * @returns `ImportResult` containing the token set and a diagnostic report.
 * @throws If `@google/design.md` fails to parse the content, or if the produced
 *         DTCG tree is invalid (invalid leaves). Empty input produces an
 *         empty-but-valid tree and does NOT throw.
 */
export function importFromDesignMd(
  content: string,
  options?: ImportFromDesignMdOptions,
): ImportResult {
  // ── 1. Parse via @google/design.md/linter ──────────────────────────────────
  let lintReport;
  try {
    lintReport = lint(content);
  } catch (err) {
    throw new Error(
      `[from-design-md] @google/design.md failed to parse content: ${(err as Error)?.message ?? String(err)}`,
    );
  }
  const state = lintReport.designSystem;

  // ── 2. Derive slug / name ──────────────────────────────────────────────────
  // Compute the kebab slug FIRST; if it degenerates to "" (e.g. brandName:"!!!"),
  // fall back to "imported" so relativePath is never "themes/.json".
  const rawName = options?.brandName ?? state.name ?? "";
  const computedSlug = toKebabSlug(rawName);
  const slug = computedSlug.length > 0 ? computedSlug : "imported";
  const relativePath = `themes/${slug}.json`;
  const name = `themes/${slug}`;

  // ── 3. Build DTCG token tree ───────────────────────────────────────────────
  const tokens: DesignTokenTree = {};

  // 3a. colors.<x> → color.<x> ($type: "color", $value: hex string)
  if (state.colors.size > 0) {
    const colorEntries: Record<string, { $value: string; $type: "color" }> = {};
    for (const [key, resolved] of state.colors.entries()) {
      colorEntries[key] = { $value: resolved.hex, $type: "color" };
    }
    tokens["color"] = leafGroup(colorEntries);
  }

  // 3b. rounded.<x> → radius.<x> ($type: "dimension", $value: "<n><unit>" string)
  if (state.rounded.size > 0) {
    const radiusEntries: Record<string, { $value: string; $type: "dimension" }> = {};
    for (const [key, resolved] of state.rounded.entries()) {
      radiusEntries[key] = {
        $value: `${resolved.value}${resolved.unit}`,
        $type: "dimension",
      };
    }
    tokens["radius"] = leafGroup(radiusEntries);
  }

  // 3c. spacing.<x> → spacing.<x> ($type: "dimension", $value: "<n><unit>" string)
  if (state.spacing.size > 0) {
    const spacingEntries: Record<string, { $value: string; $type: "dimension" }> = {};
    for (const [key, resolved] of state.spacing.entries()) {
      spacingEntries[key] = {
        $value: `${resolved.value}${resolved.unit}`,
        $type: "dimension",
      };
    }
    tokens["spacing"] = leafGroup(spacingEntries);
  }

  // 3d. typography body/h1 font-family → fontFamily.sans ($type: "fontFamily")
  // @google/design.md 0.2.0 preserves the exact YAML front-matter key (e.g. "body",
  // "body-md", "h1"). Markdown-section typography is NOT parsed into state.typography.
  // Pick order: "body" → "body-md" → "h1" → first available entry with fontFamily defined.
  const FONT_FAMILY_PICK_ORDER = ["body", "body-md", "h1"] as const;
  const pickedTypography =
    FONT_FAMILY_PICK_ORDER.map((k) => state.typography.get(k)).find(
      (t) => t?.fontFamily !== undefined,
    ) ?? [...state.typography.values()].find((t) => t?.fontFamily !== undefined);
  if (pickedTypography?.fontFamily) {
    tokens["fontFamily"] = leafGroup({
      sans: { $value: pickedTypography.fontFamily, $type: "fontFamily" },
    });
  }

  // ── 4. Validate DTCG tree ──────────────────────────────────────────────────
  const dtcgErrors = validateDtcgTree(tokens);
  if (dtcgErrors.length > 0) {
    throw new Error(
      `[from-design-md] Produced DTCG tree has invalid leaves:\n  ${dtcgErrors.join("\n  ")}`,
    );
  }

  // ── 5. Build ImportReport ──────────────────────────────────────────────────

  const missingRequired = REQUIRED_TOKEN_PATHS.filter((path) => !hasToken(tokens, path));

  // Derive unmapped from the top-level (#) headings actually present in this document.
  // LintReport.sections / documentSections only expose h2-level sub-headings (the
  // heading field is always an h2 key). The h1 section names (Typography, Elevation,
  // Components …) are extracted via regex from the raw content — this is
  // genuinely input-derived and correct for both FULL and SPARSE fixtures.
  const unmapped: string[] = [];
  const docSections: string[] = (content.match(/^#\s+(.+)$/gm) ?? []).map((h) =>
    h.replace(/^#\s+/, ""),
  );

  for (const heading of docSections) {
    const lower = heading.toLowerCase();
    if (PROSE_ONLY_HEADINGS.has(lower)) {
      const labels: Record<string, string> = {
        elevation: "elevation (prose-only — no structured token in DESIGN.md spec)",
        components: "components (prose/reference tokens — not imported as DTCG leaves)",
        shapes: "shapes (prose-only — no structured token in DESIGN.md spec)",
      };
      unmapped.push(labels[lower] ?? `${heading} (prose-only — not imported as DTCG leaves)`);
    }
  }

  const warnings: string[] = [];

  // Emit a warning if linter found any errors/warnings about the input
  for (const finding of lintReport.findings) {
    if (finding.severity === "error" || finding.severity === "warning") {
      warnings.push(
        finding.path
          ? `[${finding.severity}] ${finding.path}: ${finding.message}`
          : `[${finding.severity}] ${finding.message}`,
      );
    }
  }

  // ── 6. Assemble result ─────────────────────────────────────────────────────
  const set: DesignTokenSet = { name, relativePath, tokens };
  const report: ImportReport = { unmapped, missingRequired, warnings };

  return { set, report };
}
