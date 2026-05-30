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

// ─── Effect label filter ──────────────────────────────────────────────────────

/**
 * Labels (lowercased) that describe visual effects rather than palette colors.
 * These are excluded from extraction everywhere (scoped section and whole-doc scan).
 */
const EFFECT_LABEL_KEYWORDS = [
  "shadow",
  "overlay",
  "glow",
  "gradient",
  "elevation",
  "blur",
  "scrim",
  "inset",
] as const;

function isEffectLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return EFFECT_LABEL_KEYWORDS.some((kw) => lower.includes(kw));
}

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
 * Rejects: CSS variables (--*), font names, size values (12px, 1rem), malformed functional
 *          notations (must have a closing parenthesis), etc.
 */
function isCssColor(value: string): boolean {
  const v = value.trim();
  // Hex: 3, 4, 6, or 8 hex digits
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return true;
  // Functional notations — require closing paren to reject malformed inputs
  if (/^rgba?\([^)]*\)$/i.test(v)) return true;
  if (/^hsla?\([^)]*\)$/i.test(v)) return true;
  if (/^oklch\([^)]*\)$/i.test(v)) return true;
  if (/^color\([^)]*\)$/i.test(v)) return true;
  return false;
}

/** Internal tuple returned by prose scanning — includes description for role heuristics. */
interface ProseColorMatch {
  label: string;
  slug: string;
  value: string;
  /** The text after the color value on the same line (used for role heuristics). */
  description: string;
}

/** Return value from the internal extractor, thread-safe for cap warnings. */
interface ProseExtractionResult {
  matches: ProseColorMatch[];
  droppedCount: number;
}

/**
 * Scope the content to the color section (if one exists) and extract all
 * labeled color matches as `{label, slug, value, description}` tuples.
 *
 * Effect labels (shadow, overlay, glow, gradient, elevation, blur, scrim) are
 * excluded everywhere — they describe visual effects, not palette colors.
 *
 * This is the single implementation of the prose-color extraction algorithm.
 * Both the public `extractColorsFromProse` and the fallback wiring in
 * `importFromDesignMd` delegate here.
 */
function extractProseColorMatches(content: string): ProseExtractionResult {
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
  let droppedCount = 0;
  let match: RegExpExecArray | null;

  while ((match = BOLD_LABEL.exec(searchText)) !== null) {
    const label = (match[1] ?? "").trim();

    // Skip effect labels everywhere (shadow, overlay, glow, gradient, etc.)
    if (isEffectLabel(label)) continue;

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

    // Cap at 48 entries — count dropped extras
    if (matches.length >= 48) {
      droppedCount++;
      continue;
    }

    // Extract description: text after the closing `)` of the label's parens on the same line.
    // The description is used by assignSemanticRoles for smarter primary detection.
    // lineFragment shape: **Label** (...): description text...
    // We grab everything after the first `)` that follows the label parens block.
    const descMatch = /\)[^)]*:\s*(.*)$/.exec(lineFragment);
    const description = descMatch ? (descMatch[1] ?? "").trim() : "";

    seenSlugs.add(slug);
    matches.push({ label, slug, value: colorValue, description });
  }

  return { matches, droppedCount };
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
 * Effect labels (shadow, overlay, glow, gradient, elevation, blur, scrim) are
 * excluded regardless of scoping — they describe visual effects, not palette colors.
 *
 * Token naming: labels are kebab-cased (`"Spotify Green"` → `"spotify-green"`).
 * De-duplicates by token name (first wins). Capped at 48 entries.
 *
 * Returns a plain `Record<string, string>` mapping slug → raw CSS color string.
 *
 * @public — exported so tests can unit-test the helper directly.
 */
export function extractColorsFromProse(content: string): Record<string, string> {
  const { matches } = extractProseColorMatches(content);
  const result: Record<string, string> = {};
  for (const { slug, value } of matches) {
    result[slug] = value;
  }
  return result;
}

// ─── Neutral color detector ───────────────────────────────────────────────────

/**
 * Return true if the CSS color is "neutral" — meaning it is near-black, near-white,
 * or achromatic (low channel spread).
 *
 * Only operates on hex colors (#rgb / #rrggbb / #rrggbbaa) and rgb(...)/rgba(...).
 * For oklch/hsl/color() values that cannot be trivially parsed, returns false
 * (treats them as potentially chromatic — conservative to avoid silent omission).
 *
 * Neutral threshold: max(r,g,b) − min(r,g,b) < 25 (out of 255), OR
 *                    all channels < 10 (near-black), OR
 *                    all channels > 245 (near-white).
 *
 * The spread threshold of 25/255 ≈ 10% filters very low-saturation blue-grays
 * (e.g. #767d88 cool-slate, #6b7280 tailwind-gray) that are perceptually neutral
 * even if the raw channel spread is technically > 0.
 */
function isNeutralColor(value: string): boolean {
  const v = value.trim();

  // Parse hex
  const hexMatch = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(v);
  if (hexMatch) {
    const hex = hexMatch[1] ?? "";
    let r: number, g: number, b: number;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt((hex[0] ?? "0") + (hex[0] ?? "0"), 16);
      g = parseInt((hex[1] ?? "0") + (hex[1] ?? "0"), 16);
      b = parseInt((hex[2] ?? "0") + (hex[2] ?? "0"), 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    if (spread < 25) return true; // achromatic or very low saturation
    if (r < 10 && g < 10 && b < 10) return true; // near-black
    if (r > 245 && g > 245 && b > 245) return true; // near-white
    return false;
  }

  // Parse rgb() / rgba()
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1] ?? "0", 10);
    const g = parseInt(rgbMatch[2] ?? "0", 10);
    const b = parseInt(rgbMatch[3] ?? "0", 10);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    if (spread < 25) return true;
    if (r < 10 && g < 10 && b < 10) return true;
    if (r > 245 && g > 245 && b > 245) return true;
    return false;
  }

  // Unparseable (hsl, oklch, color()) — conservatively treat as chromatic
  return false;
}

// ─── Semantic role assignment ─────────────────────────────────────────────────

/** DTCG color leaf type. */
type ColorLeaf = { $value: string; $type: "color" };

/**
 * Assign semantic roles to prose-extracted colors (best-effort, heuristic).
 *
 * Returns a NEW object containing only the role entries that should be merged
 * in — never modifies its inputs. Roles that already exist in `existingKeys`
 * are not emitted.
 *
 * Role assignment logic:
 *
 * **primary**: Single document-order scan — first entry whose LABEL contains
 *   primary|brand|accent|cta|signature OR whose DESCRIPTION contains cta|brand|signature wins.
 *   "green" is excluded from label matching (too common in semantic success colors like
 *   "#149e61 Green"). "primary" and "accent" are excluded from description matching:
 *   "primary text"/"primary canvas" and "border accents"/"accent backgrounds" are common
 *   phrases that do NOT indicate brand-primary hue. Scanning in document order ensures that
 *   an earlier entry with a CTA/brand description beats a later entry with an Accent label.
 *   Fallback — first NON-NEUTRAL (chromatic) color when no keyword match fires.
 *   Omit — if ALL extracted colors are neutral (no chromatic fallback exists).
 *
 * **background**: keyword match (background|canvas|surface|base) against label or
 * description; first match wins.
 *
 * **foreground**: keyword match (text|ink|foreground|body) against label or
 * description; first match wins.
 */
function assignSemanticRoles(
  proseMatches: ProseColorMatch[],
  existingKeys: ReadonlySet<string>,
): Record<string, ColorLeaf> {
  const roles: Record<string, ColorLeaf> = {};

  // For label matching: deliberate label names that indicate brand-primary role.
  // "green" intentionally excluded — it matches semantic success colors (e.g. Kraken's
  // "#149e61 Green" is a success state, not the brand primary purple). Spotify Green and
  // Starbucks Green carry "brand" / "cta" / "accent" in their descriptions, so they are
  // correctly identified by the description pass below.
  const PRIMARY_LABEL_KEYWORDS = ["primary", "brand", "accent", "cta", "signature"];
  // For description matching: very narrow set — "primary" excluded (too common: "primary text",
  // "primary canvas") and "accent" excluded ("border accents" is common but not brand-primary).
  // Only "cta", "brand", and "signature" are specific enough to reliably indicate brand-primary.
  const PRIMARY_DESC_KEYWORDS = ["cta", "brand", "signature"];
  const BACKGROUND_KEYWORDS = ["background", "canvas", "surface", "base"];
  const FOREGROUND_KEYWORDS = ["text", "ink", "foreground", "body"];

  function labelMatches(match: ProseColorMatch, keywords: string[]): boolean {
    const label = match.label.toLowerCase();
    return keywords.some((kw) => label.includes(kw));
  }

  function descMatches(match: ProseColorMatch, keywords: string[]): boolean {
    const desc = match.description.toLowerCase();
    return keywords.some((kw) => desc.includes(kw));
  }

  function matchesAny(match: ProseColorMatch, keywords: string[]): boolean {
    const label = match.label.toLowerCase();
    const desc = match.description.toLowerCase();
    return keywords.some((kw) => label.includes(kw) || desc.includes(kw));
  }

  // primary — scan in document order; first entry that hits label OR description keywords wins.
  // This ensures a color whose description says "CTA" is preferred over a later one whose
  // label happens to say "Accent" (e.g. Sanity Red via "brand CTA" desc beats Accent Magenta).
  if (!existingKeys.has("primary")) {
    const keywordMatch = proseMatches.find(
      (m) => labelMatches(m, PRIMARY_LABEL_KEYWORDS) || descMatches(m, PRIMARY_DESC_KEYWORDS),
    );
    if (keywordMatch) {
      roles["primary"] = { $value: keywordMatch.value, $type: "color" };
    } else {
      // Fall back to first NON-NEUTRAL (chromatic) color
      const chromaticMatch = proseMatches.find((m) => !isNeutralColor(m.value));
      if (chromaticMatch) {
        roles["primary"] = { $value: chromaticMatch.value, $type: "color" };
      }
      // If ALL colors are neutral, omit primary entirely — do not force a near-black/white
    }
  }

  // background
  if (!existingKeys.has("background")) {
    const bgMatch = proseMatches.find((m) => matchesAny(m, BACKGROUND_KEYWORDS));
    if (bgMatch) {
      roles["background"] = { $value: bgMatch.value, $type: "color" };
    }
  }

  // foreground / text
  if (!existingKeys.has("foreground")) {
    const fgMatch = proseMatches.find((m) => matchesAny(m, FOREGROUND_KEYWORDS));
    if (fgMatch) {
      roles["foreground"] = { $value: fgMatch.value, $type: "color" };
    }
  }

  return roles;
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
  const warnings: string[] = [];

  if (state.colors.size > 0) {
    const colorEntries: Record<string, { $value: string; $type: "color" }> = {};
    for (const [key, resolved] of state.colors.entries()) {
      colorEntries[key] = { $value: resolved.hex, $type: "color" };
    }
    tokens["color"] = leafGroup(colorEntries);
  } else {
    // Prose-color fallback: extract labeled color literals from markdown prose
    const { matches: proseMatchList, droppedCount } = extractProseColorMatches(content);
    if (proseMatchList.length > 0) {
      usedProseFallback = true;

      // Build base color entries (immutable — no direct mutation)
      const baseEntries: Record<string, { $value: string; $type: "color" }> = {};
      for (const { slug: s, value } of proseMatchList) {
        baseEntries[s] = { $value: value, $type: "color" };
      }

      // Cap warning — emitted before roles assignment
      if (droppedCount > 0) {
        warnings.push(`prose fallback: capped at 48 colors (${droppedCount} more dropped)`);
      }

      // Assign semantic roles (returns new object, no mutation)
      const roles = assignSemanticRoles(proseMatchList, new Set(Object.keys(baseEntries)));

      // Merge immutably: base entries + roles (base entries take precedence for existing keys)
      tokens["color"] = leafGroup({ ...roles, ...baseEntries });
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
