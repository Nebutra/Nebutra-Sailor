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
 * PROSE-COLOR FALLBACK: When @google/design.md extracts zero colors (e.g. the
 * VoltAgent extended DESIGN.md format where colors are written as markdown prose
 * rather than YAML front-matter), `extractColorsFromProse` is called to scrape
 * labeled color literals of the form `**Label** (\`<value>\`)`.
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

// ─── Prose-color fallback ─────────────────────────────────────────────────────

/**
 * Test whether a raw string looks like a CSS color value.
 * Accepts: #rgb, #rrggbb, #rrggbbaa, rgb(...), rgba(...), hsl(...), hsla(...), oklch(...)
 * Rejects: CSS variables (--*), font names, size values (12px, 1rem), etc.
 */
function isCssColor(value: string): boolean {
  const v = value.trim();
  // Hex: 3, 4, 6, or 8 hex digits
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true;
  // Functional notations
  if (/^rgba?\s*\(/i.test(v)) return true;
  if (/^hsla?\s*\(/i.test(v)) return true;
  if (/^oklch\s*\(/i.test(v)) return true;
  if (/^color\s*\(/i.test(v)) return true;
  return false;
}

/** Internal tuple returned by prose scanning. */
interface ProseColorMatch {
  label: string;
  slug: string;
  value: string;
}

/**
 * Scope the content to the color section (if one exists) and extract all
 * labeled color matches as `{label, slug, value}` tuples.
 *
 * This is the single implementation of the prose-color extraction algorithm.
 * Both the public `extractColorsFromProse` and the fallback wiring in
 * `importFromDesignMd` delegate here.
 */
function extractProseColorMatches(content: string): ProseColorMatch[] {
  // ── 1. Scope to the color section if one exists ──────────────────────────
  const COLOR_HEADING = /^(#{1,3})\s+.*colou?r/im;
  const headingMatch = COLOR_HEADING.exec(content);

  let searchText: string;
  if (headingMatch) {
    const headingLevel = (headingMatch[1] ?? "").length;
    const headingStart = headingMatch.index;
    // Find the next heading at the same or higher level (fewer #'s) after this section
    const afterHeading = content.slice(headingStart + headingMatch[0].length);
    const closingHeadingPattern = new RegExp(`^#{1,${headingLevel}}\\s`, "m");
    const closingMatch = closingHeadingPattern.exec(afterHeading);
    searchText = closingMatch ? afterHeading.slice(0, closingMatch.index) : afterHeading;
  } else {
    searchText = content;
  }

  // ── 2. Match labeled color literals ──────────────────────────────────────
  // Match `**Label** (` and the remainder of the line. We intentionally do NOT
  // try to match the closing `)` of the outer parenthetical because backtick-
  // wrapped functional colors like `rgb(30, 215, 96)` contain nested `)` which
  // would trip a simple `[^)]` stop. Instead, we grab the full line fragment
  // and extract the CSS color value from it.
  //
  // Handles all VoltAgent extended DESIGN.md formats:
  //   (A) **Label** (`#hex`)                         — simple hex
  //   (B) **Label** (`{colors.xxx}` — `#hex`)        — template-ref, backtick hex
  //   (C) **Label** (`{colors.xxx}` — #hex)          — template-ref, unquoted hex
  //   (D) **Label** (`rgb(...)`)                     — functional color in backticks
  const BOLD_LABEL = /\*\*([^*\n]+)\*\*\s*[(][^\n]*/g;

  // Reusable patterns (reset lastIndex before each use)
  const BACKTICK_VALUE = /`([^`\n]+)`/g;
  const UNQUOTED_HEX = /#[0-9a-fA-F]{3,8}\b/g;
  const UNQUOTED_FN =
    /rgba?\s*\([^)\n]+\)|hsla?\s*\([^)\n]+\)|oklch\s*\([^)\n]+\)|color\s*\([^)\n]+\)/gi;

  const matches: ProseColorMatch[] = [];
  const seenSlugs = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = BOLD_LABEL.exec(searchText)) !== null) {
    if (matches.length >= 48) break;

    const label = (match[1] ?? "").trim();
    const lineFragment = match[0]; // **Label** (...rest of line)

    // Priority 1: last backtick-wrapped value that is a valid CSS color
    BACKTICK_VALUE.lastIndex = 0;
    let colorValue: string | undefined;
    let btm: RegExpExecArray | null;
    while ((btm = BACKTICK_VALUE.exec(lineFragment)) !== null) {
      const v = (btm[1] ?? "").trim();
      if (isCssColor(v)) colorValue = v; // last valid wins (hex comes last in template-ref)
    }

    if (!colorValue) {
      // Priority 2: unquoted hex (format C)
      UNQUOTED_HEX.lastIndex = 0;
      let hm: RegExpExecArray | null;
      while ((hm = UNQUOTED_HEX.exec(lineFragment)) !== null) {
        const v = hm[0].trim();
        if (isCssColor(v)) colorValue = v;
      }
    }

    if (!colorValue) {
      // Priority 3: unquoted functional color not in backticks
      UNQUOTED_FN.lastIndex = 0;
      let fm: RegExpExecArray | null;
      while ((fm = UNQUOTED_FN.exec(lineFragment)) !== null) {
        const v = fm[0].trim();
        if (isCssColor(v)) colorValue = v;
      }
    }

    if (!colorValue) continue;

    const slug = toKebabSlug(label);
    if (!slug) continue;
    if (seenSlugs.has(slug)) continue; // first occurrence wins

    seenSlugs.add(slug);
    matches.push({ label, slug, value: colorValue });
  }

  return matches;
}

/**
 * Extract color entries from DESIGN.md prose content (VoltAgent extended format).
 *
 * Looks for labeled color literals matching: `**Label** (\`<value>\`)`
 * where `<value>` is a valid CSS color (hex, rgb, rgba, hsl, hsla, oklch).
 *
 * Also handles the `{colors.xxx} — #hex` variant (backtick-quoted or unquoted hex).
 *
 * Scoping: if a heading matching `/^#{1,3}\s+.*colou?r/i` exists in the
 * document, extraction is limited to the content under that heading (up to
 * the next same-or-higher heading). Otherwise the whole document is scanned.
 *
 * Token naming: labels are kebab-cased (`"Spotify Green"` → `"spotify-green"`).
 * De-duplicates by token name (first wins). Capped at 48 entries.
 *
 * Returns a plain `Record<string, string>` mapping slug → raw CSS color string.
 *
 * @public — exported so tests can unit-test the helper directly.
 */
export function extractColorsFromProse(content: string): Record<string, string> {
  const matches = extractProseColorMatches(content);
  const result: Record<string, string> = {};
  for (const { slug, value } of matches) {
    result[slug] = value;
  }
  return result;
}

/**
 * Assign semantic roles to prose-extracted colors (best-effort, heuristic).
 *
 * Mutates `colorEntries` in place by adding role keys that are not already
 * present. Role keywords are matched against the *original label* (lower-cased),
 * not the slug. This is intentionally best-effort — no role is forced when no
 * candidate matches.
 */
function assignSemanticRoles(
  proseMatches: Array<{ label: string; slug: string; value: string }>,
  colorEntries: Record<string, { $value: string; $type: "color" }>,
): void {
  // primary: first label containing primary|brand|accent|cta plus a non-neutral value,
  //          OR the first label with green|signature (Spotify pattern), OR just the first entry
  if (!("primary" in colorEntries)) {
    const primaryCandidate =
      proseMatches.find((m) => {
        const l = m.label.toLowerCase();
        return (
          l.includes("primary") ||
          l.includes("brand") ||
          l.includes("accent") ||
          l.includes("cta") ||
          l.includes("green") ||
          l.includes("signature")
        );
      }) ?? proseMatches[0];
    if (primaryCandidate) {
      colorEntries["primary"] = { $value: primaryCandidate.value, $type: "color" };
    }
  }

  // background: first label containing background|canvas|surface|base
  if (!("background" in colorEntries)) {
    const bgCandidate = proseMatches.find((m) => {
      const l = m.label.toLowerCase();
      return (
        l.includes("background") ||
        l.includes("canvas") ||
        l.includes("surface") ||
        l.includes("base")
      );
    });
    if (bgCandidate) {
      colorEntries["background"] = { $value: bgCandidate.value, $type: "color" };
    }
  }

  // foreground / text
  if (!("foreground" in colorEntries)) {
    const fgCandidate = proseMatches.find((m) => {
      const l = m.label.toLowerCase();
      return (
        l.includes("text") || l.includes("ink") || l.includes("foreground") || l.includes("body")
      );
    });
    if (fgCandidate) {
      colorEntries["foreground"] = { $value: fgCandidate.value, $type: "color" };
    }
  }
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
  // If @google/design.md extracts zero colors (VoltAgent extended prose format),
  // fall back to scraping the prose content for labeled color literals.
  let usedProseFallback = false;
  if (state.colors.size > 0) {
    const colorEntries: Record<string, { $value: string; $type: "color" }> = {};
    for (const [key, resolved] of state.colors.entries()) {
      colorEntries[key] = { $value: resolved.hex, $type: "color" };
    }
    tokens["color"] = leafGroup(colorEntries);
  } else {
    // Prose-color fallback: extract labeled color literals from markdown prose
    const proseMatchList = extractProseColorMatches(content);
    if (proseMatchList.length > 0) {
      usedProseFallback = true;
      const colorEntries: Record<string, { $value: string; $type: "color" }> = {};
      for (const { slug, value } of proseMatchList) {
        colorEntries[slug] = { $value: value, $type: "color" };
      }
      // Assign semantic roles (primary, background, foreground) heuristically
      assignSemanticRoles(proseMatchList, colorEntries);
      tokens["color"] = leafGroup(colorEntries);
    }
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

  // Derive unmapped from the DESIGN.md section headings (h1–h3) present in this document.
  // DESIGN.md canonical form uses ## (h2) for top-level sections, e.g. "## Elevation & Depth",
  // "## Components", "## Shapes". We scan h1–h3 to be robust to minor spec drift.
  // Matching is substring-based (lowercased heading CONTAINS the keyword) so that headings
  // like "Elevation & Depth" still match the "elevation" keyword.
  const unmappedSet = new Set<string>();
  const docSections: string[] = (content.match(/^#{1,3}\s+(.+?)\s*$/gm) ?? []).map((h) =>
    h.replace(/^#{1,3}\s+/, ""),
  );

  const labels: Record<string, string> = {
    elevation: "elevation (prose-only — no structured token in DESIGN.md spec)",
    components: "components (prose/reference tokens — not imported as DTCG leaves)",
    shapes: "shapes (prose-only — no structured token in DESIGN.md spec)",
  };

  for (const heading of docSections) {
    const lower = heading.toLowerCase();
    const matched = [...PROSE_ONLY_HEADINGS].find((k) => lower.includes(k));
    if (matched) {
      unmappedSet.add(labels[matched] ?? `${heading} (prose-only — not imported as DTCG leaves)`);
    }
  }

  const unmapped = [...unmappedSet];

  const warnings: string[] = [];

  // Prose fallback warning — emitted when colors were scraped from prose instead of front matter
  if (usedProseFallback) {
    warnings.push(
      "colors extracted from prose fallback — source has no/empty front-matter colors block",
    );
  }

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
