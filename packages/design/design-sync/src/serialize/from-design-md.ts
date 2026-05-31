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

// ─── Prose dimension extraction helpers ──────────────────────────────────────

/**
 * Scope content to a named section. Returns the text under the first heading whose
 * lowercased text contains any of `keywords`, up to the next same/higher-level heading.
 * Falls back to the entire `content` if no matching heading is found.
 */
function scopeToSection(content: string, keywords: string[]): string {
  const lines = content.split("\n");
  let startLine = -1;
  let headingLevel = 0;

  for (let index = 0; index < lines.length; index++) {
    const heading = parseMarkdownHeading(lines[index] ?? "");
    if (!heading || heading.level > 3) continue;
    const headingText = heading.text.toLowerCase();
    if (!keywords.some((kw) => headingText.includes(kw))) continue;
    startLine = index + 1;
    headingLevel = heading.level;
    break;
  }

  if (startLine === -1) return content;

  let endLine = lines.length;
  for (let index = startLine; index < lines.length; index++) {
    const heading = parseMarkdownHeading(lines[index] ?? "");
    if (heading && heading.level <= headingLevel) {
      endLine = index;
      break;
    }
  }

  return lines.slice(startLine, endLine).join("\n");
}

function parseMarkdownHeading(line: string): { level: number; text: string } | undefined {
  let level = 0;
  while (level < line.length && line[level] === "#") level++;
  if (level === 0 || level > 6 || line[level] !== " ") return undefined;
  return { level, text: line.slice(level + 1).trim() };
}

/**
 * Extract CSS box-shadow values from prose content.
 * Matches both color-first (`rgba(…) x y blur`) and offset-first (`x y blur color`) forms.
 * Returns de-duplicated list of raw shadow strings (trimmed, from backticks or inline).
 * Capped at 3; returns empty array if none found.
 */
function extractShadowsFromProse(content: string): string[] {
  // Prefer elevation/depth/shadow section if present
  const searchText = scopeToSection(content, ["elevation", "depth", "shadow"]);

  const found: string[] = [];
  const seen = new Set<string>();

  // Pattern for backtick-wrapped shadow values containing px lengths + a color
  // Matches: `rgba(...) 0px 8px 24px` or `0px 8px 24px rgba(...)` etc.
  const BACKTICK_RE = /`([^`\n]{8,120})`/g;
  let m: RegExpExecArray | null;

  // Extract from backticks first
  BACKTICK_RE.lastIndex = 0;
  while ((m = BACKTICK_RE.exec(searchText)) !== null) {
    const candidate = (m[1] ?? "").trim();
    if (isShadowValue(candidate) && !seen.has(candidate)) {
      seen.add(candidate);
      found.push(candidate);
    }
    if (found.length >= 3) break;
  }

  if (found.length < 3) {
    // Also scan for inline (non-backtick) box-shadow values
    // Matches: box-shadow: <value> — captures up to end of line, then trims to last valid token.
    const INLINE_SHADOW_RE = /box-shadow:\s*([^;\n`"]{8,120})/gi;
    INLINE_SHADOW_RE.lastIndex = 0;
    while ((m = INLINE_SHADOW_RE.exec(searchText)) !== null) {
      const raw = (m[1] ?? "").trim().replace(/[;,\s]+$/, "");
      // Trim trailing prose: find the last px-length or color token and cut there.
      // This handles "rgba(0,0,0,0.4) 0px 10px 30px for elevation." → "rgba(0,0,0,0.4) 0px 10px 30px"
      const candidate = trimTrailingProse(raw);
      if (isShadowValue(candidate) && !seen.has(candidate)) {
        seen.add(candidate);
        found.push(candidate);
      }
      if (found.length >= 3) break;
    }
  }

  return found;
}

/**
 * Trim trailing prose words from an extracted inline box-shadow string.
 *
 * The INLINE_SHADOW_RE captures until a newline, so a value like:
 *   `rgba(0,0,0,0.4) 0px 10px 30px for elevation.`
 * must be cut back to the last valid CSS box-shadow token. A valid token is
 * either a px/rem length (`-?\d+(?:\.\d+)?(?:px|rem)`) or a color function
 * (rgba?/hsla?/oklch/color, or a #hex). Everything after the last such token
 * (including the trailing prose word and period) is dropped.
 */
function trimTrailingProse(raw: string): string {
  const lastEnd = findLastShadowTokenEnd(raw);
  if (lastEnd === -1) return raw; // no tokens found — return unchanged
  return raw.slice(0, lastEnd).trim();
}

function findLastShadowTokenEnd(raw: string): number {
  let lastEnd = -1;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index] ?? "";
    if (char === "#") {
      let end = index + 1;
      while (end < raw.length && isHexDigit(raw[end] ?? "")) end++;
      const count = end - index - 1;
      if (count >= 3 && count <= 8) lastEnd = end;
      index = Math.max(index, end - 1);
      continue;
    }

    const lower = raw.slice(index).toLowerCase();
    const fnName = ["rgba", "rgb", "hsla", "hsl", "oklch", "color"].find((name) =>
      lower.startsWith(`${name}(`),
    );
    if (fnName) {
      const close = raw.indexOf(")", index + fnName.length + 1);
      if (close !== -1) {
        lastEnd = close + 1;
        index = close;
      }
      continue;
    }

    const lengthEnd = readCssLengthEnd(raw, index);
    if (lengthEnd !== -1) {
      lastEnd = lengthEnd;
      index = lengthEnd - 1;
    }
  }
  return lastEnd;
}

function isHexDigit(char: string): boolean {
  return (
    (char >= "0" && char <= "9") || (char >= "a" && char <= "f") || (char >= "A" && char <= "F")
  );
}

function isAsciiDigit(char: string | undefined): char is string {
  return char !== undefined && char >= "0" && char <= "9";
}

function readCssLengthEnd(value: string, start: number): number {
  let index = start;
  if (value[index] === "-") index++;
  let hasDigit = false;
  while (index < value.length && isAsciiDigit(value[index])) {
    hasDigit = true;
    index++;
  }
  if (value[index] === ".") {
    index++;
    while (index < value.length && isAsciiDigit(value[index])) {
      hasDigit = true;
      index++;
    }
  }
  if (!hasDigit) return -1;
  if (value.slice(index, index + 2) === "px") return index + 2;
  if (value.slice(index, index + 3) === "rem") return index + 3;
  return -1;
}

/**
 * Validate that a string looks like a CSS box-shadow value.
 * Must contain: ≥2 px-length tokens AND a color component (rgba/rgb/#hex/hsla).
 * Rejects values that are clearly not shadows (transition strings, border values without offset, etc.).
 */
function isShadowValue(candidate: string): boolean {
  let pxCount = 0;
  for (let index = 0; index < candidate.length; index++) {
    const end = readCssLengthEnd(candidate, index);
    if (end !== -1 && candidate.slice(end - 2, end) === "px") {
      pxCount++;
      index = end - 1;
    }
  }
  if (pxCount < 2) return false;
  const hasColor =
    /rgba?\s*\([^)]+\)/i.test(candidate) ||
    /hsla?\s*\([^)]+\)/i.test(candidate) ||
    /#[0-9a-fA-F]{3,8}\b/.test(candidate);
  if (!hasColor) return false;
  // Reject pure transition strings (contain "0.33s", "cubic-bezier", "ease", etc.)
  if (/\d+\.?\d*s\b|cubic-bezier|ease/i.test(candidate)) return false;
  return true;
}

/**
 * Compute a shadow magnitude for sorting (sum of absolute px values in the value string).
 * Used to sort shadows from smallest → largest for sm/md/lg assignment.
 */
function shadowMagnitude(value: string): number {
  let sum = 0;
  for (let index = 0; index < value.length; index++) {
    const end = readCssLengthEnd(value, index);
    if (end !== -1 && value.slice(end - 2, end) === "px") {
      sum += Math.abs(parseFloat(value.slice(index, end - 2)));
      index = end - 1;
    }
  }
  return sum;
}

/**
 * Extract radius dimension values from prose content.
 * Returns a map of key → dimension string (e.g. `{ full: "9999px", md: "8px" }`).
 * Prefers a Shape/Radius/Geometry/Border section; falls back to whole doc.
 * Best-effort: always emits at least `radius.md` if any radius value found.
 */
function extractRadiusFromProse(content: string): Record<string, string> {
  const searchText = scopeToSection(content, ["shape", "radius", "geometry", "border", "corner"]);

  // Find sentences containing radius keywords
  const RADIUS_SENTENCE_RE = /[^.!?\n]*(?:radius|rounded|pill|corner|border-radius)[^.!?\n]*/gi;

  // Collect all radius dimension values from matching sentences
  const DIMENSION_RE = /(\d+(?:\.\d+)?(?:px|rem|%)|9999px|full)/gi;
  const values: number[] = []; // store numeric px values for categorization
  const rawValues: string[] = [];
  let hasFull = false;
  let has50pct = false;

  let m: RegExpExecArray | null;
  RADIUS_SENTENCE_RE.lastIndex = 0;
  while ((m = RADIUS_SENTENCE_RE.exec(searchText)) !== null) {
    const sentence = m[0];
    DIMENSION_RE.lastIndex = 0;
    let dm: RegExpExecArray | null;
    while ((dm = DIMENSION_RE.exec(sentence)) !== null) {
      const raw = dm[1] ?? "";
      if (raw.toLowerCase() === "full") {
        hasFull = true;
        continue;
      }
      if (raw === "50%") {
        has50pct = true;
        continue;
      }
      if (raw === "9999px" || parseInt(raw, 10) >= 500) {
        hasFull = true;
        continue;
      }
      const numVal = parseFloat(raw);
      if (!isNaN(numVal) && numVal > 0 && numVal < 500) {
        values.push(numVal);
        rawValues.push(raw);
      }
    }
  }

  // Deduplicate and sort ascending
  const uniqueValues = [...new Set(values.map(String))].map(Number).sort((a, b) => a - b);

  if (uniqueValues.length === 0 && !hasFull && !has50pct) {
    return {};
  }

  const result: Record<string, string> = {};

  if (hasFull || has50pct) {
    result["full"] = hasFull ? "9999px" : "50%";
  }

  // Assign sm / md / lg from sorted unique values
  if (uniqueValues.length >= 3) {
    result["sm"] = `${uniqueValues[0]}px`;
    result["md"] = `${uniqueValues[Math.floor(uniqueValues.length / 2)]}px`;
    result["lg"] = `${uniqueValues[uniqueValues.length - 1]}px`;
  } else if (uniqueValues.length === 2) {
    result["sm"] = `${uniqueValues[0]}px`;
    result["lg"] = `${uniqueValues[1]}px`;
    // Always emit md — pick the smaller
    result["md"] = `${uniqueValues[0]}px`;
  } else if (uniqueValues.length === 1) {
    result["md"] = `${uniqueValues[0]}px`;
  } else {
    // Only full/50% was found — emit a sensible md default
    result["md"] = "9999px";
  }

  return result;
}

/**
 * Extract a font family name from prose content.
 * Scans the Typography section (preferred) or whole doc for mentions of a font family.
 * Returns the first confidently-identified font name, or undefined if none found.
 */
function extractFontFamilyFromProse(content: string): string | undefined {
  const searchText = scopeToSection(content, ["typography", "typeface", "font"]);

  for (const line of searchText.split("\n")) {
    const candidate = extractFontCandidateFromLine(line);
    if (candidate !== undefined && isLikelyFontName(candidate)) {
      return candidate;
    }
  }

  // Pattern 2: bold-formatted font name `**FontName**` near "font"/"typeface"/"body"/"display"
  const BOLD_FONT_RE = /\*\*([A-Z][A-Za-z0-9\s-]{1,40}?)\*\*/g;
  let m: RegExpExecArray | null;
  BOLD_FONT_RE.lastIndex = 0;
  while ((m = BOLD_FONT_RE.exec(searchText)) !== null) {
    const candidate = (m[1] ?? "").trim();
    const context = searchText.slice(Math.max(0, (m.index ?? 0) - 100), (m.index ?? 0) + 200);
    if (isLikelyFontName(candidate) && /font|typeface|body|display|family/i.test(context)) {
      return candidate;
    }
  }

  // Pattern 3: backtick-wrapped font name near font context
  const BACKTICK_FONT_RE = /`([A-Z][A-Za-z0-9\s-]{1,40}?)`/g;
  BACKTICK_FONT_RE.lastIndex = 0;
  while ((m = BACKTICK_FONT_RE.exec(searchText)) !== null) {
    const candidate = (m[1] ?? "").trim();
    const context = searchText.slice(Math.max(0, (m.index ?? 0) - 100), (m.index ?? 0) + 200);
    if (isLikelyFontName(candidate) && /font|typeface|body|family/i.test(context)) {
      return candidate;
    }
  }

  return undefined;
}

function extractFontCandidateFromLine(line: string): string | undefined {
  const lower = line.toLowerCase();
  const markers = ["font-family:", "font:", "typeface:", "family:", "uses "];
  const marker = markers.find((item) => lower.includes(item));
  if (!marker) return undefined;

  const start = lower.indexOf(marker) + marker.length;
  const afterMarker = line.slice(start).trim();
  const stopWords = new Set(["as", "for", "with", "and", "font", "typeface"]);
  const words: string[] = [];
  for (const rawWord of afterMarker.split(/\s+/)) {
    const word = rawWord.replace(/^[`"']+|[`"',.;:]+$/g, "");
    if (!word || stopWords.has(word.toLowerCase())) break;
    words.push(word);
    if (words.length >= 4) break;
  }
  return words.join(" ").trim() || undefined;
}

/** Common non-font words that might otherwise be mistaken for font names. */
const NON_FONT_WORDS = new Set([
  "The",
  "This",
  "Design",
  "System",
  "Brand",
  "Color",
  "Palette",
  "Primary",
  "Background",
  "Foreground",
  "Card",
  "Border",
  "Ring",
  "Accent",
  "Surface",
  "Canvas",
  "Dark",
  "Light",
  "White",
  "Black",
  "Gray",
  "Grey",
  "Blue",
  "Red",
  "Green",
  "Orange",
  "Purple",
  "Yellow",
  "Pink",
  "Teal",
  "Cyan",
  "Neutral",
  "Muted",
  "Bold",
  "Medium",
  "Regular",
  "Semibold",
  "Typography",
  "Spacing",
  "Radius",
  "Button",
  "Input",
  "Modal",
  "Icon",
  "Logo",
  "Text",
  "Display",
  "Body",
  "Heading",
  "Caption",
  "Label",
  "Navigation",
  "Footer",
  "Header",
  "Section",
  "Content",
  "Container",
  "Grid",
  "Column",
  "Row",
  "Layout",
  "Page",
  "View",
  "Component",
  "Element",
  "Token",
  "Variable",
  "Style",
  "Theme",
  "Mode",
  "Scale",
  "Elevation",
  "Shadow",
  "Depth",
  "Blur",
  "Opacity",
  "Gradient",
  "Motion",
  "Animation",
  "Transition",
  "Transform",
  "Filter",
  "Effect",
  "Layer",
  "Stack",
  "Group",
  "Set",
  "Inspired",
  "Interface",
  "Experience",
  "Platform",
  "Product",
  "Service",
  "Feature",
  "Base",
  "Kit",
  "Specimen",
  "Circular",
  "Universal",
]);

/** Return true if the typography key looks like a body/text entry. */
function isBodyLikeKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith("body") || k === "text" || k === "ui" || k.includes("body");
}

/** Return true if the typography key looks like a heading/display entry. */
function isHeadingLikeKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.startsWith("h1") ||
    k.startsWith("display") ||
    k.startsWith("heading") ||
    k === "h1" ||
    k === "h2" ||
    k.includes("display") ||
    k.includes("heading") ||
    k.includes("title")
  );
}

function isLikelyFontName(candidate: string): boolean {
  if (!candidate || candidate.length < 2 || candidate.length > 60) return false;
  // Must start with a capital letter
  if (!/^[A-Z]/.test(candidate)) return false;
  // Must not be an obviously non-font word
  const words = candidate.trim().split(/\s+/);
  if (words.length > 4) return false; // font names rarely exceed 4 words
  // Each word must look like a proper noun token (mostly letters, maybe numbers/hyphens)
  if (!words.every((w) => /^[A-Za-z][A-Za-z0-9-]*$/.test(w))) return false;
  // Must not be a single common non-font word
  if (words.length === 1 && NON_FONT_WORDS.has(words[0] ?? "")) return false;
  // Multi-word: reject if all words are non-font words
  if (words.every((w) => NON_FONT_WORDS.has(w))) return false;
  return true;
}

/**
 * Extract a base spacing unit from prose and return sm/md/lg entries derived from it.
 * Scans for phrases like "8px base", "base unit: 8px", "spacing scale of 8px".
 * Returns empty object if no base unit confidently found.
 */
function extractSpacingFromProse(content: string): Record<string, string> {
  // Prefer spacing/layout section if present
  const searchText = scopeToSection(content, ["spacing", "layout", "grid", "space"]);

  // Patterns: "base unit: 8px", "8px base", "spacing scale of 8px", "anchored at 1.6rem"
  const BASE_UNIT_PATTERNS = [
    /base\s+unit[:\s]+(\d+(?:\.\d+)?(?:px|rem))/i,
    /(\d+(?:\.\d+)?(?:px|rem))\s+base(?:\s+unit|\s+grid)?/i,
    /spacing\s+(?:scale\s+)?(?:of|at|from|based\s+on)\s+(\d+(?:\.\d+)?(?:px|rem))/i,
    /anchored\s+at\s+[\d.]+rem\s*\(~(\d+)px\)/i,
    /(\d+(?:\.\d+)?(?:px|rem))\s+(?:base\s+)?(?:grid\s+)?(?:unit|scale|step)/i,
  ];

  for (const pattern of BASE_UNIT_PATTERNS) {
    const match = pattern.exec(searchText);
    if (match) {
      const raw = match[1] ?? "";
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0 && num <= 32) {
        const unit = raw.includes("rem") ? "rem" : "px";
        // Derive sm / md / lg as base, 2×, 3×
        return {
          sm: `${num}${unit}`,
          md: `${num * 2}${unit}`,
          lg: `${num * 3}${unit}`,
        };
      }
    }
  }

  return {};
}

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
  const searchText = scopeToSection(content, ["color", "colour"]);

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
  // Prose fallback: when front-matter rounded is empty, scan prose for radius dimensions.
  if (state.rounded.size > 0) {
    const radiusEntries: Record<string, { $value: string; $type: "dimension" }> = {};
    for (const [key, resolved] of state.rounded.entries()) {
      radiusEntries[key] = {
        $value: `${resolved.value}${resolved.unit}`,
        $type: "dimension",
      };
    }
    tokens["radius"] = leafGroup(radiusEntries);
  } else {
    const proseRadius = extractRadiusFromProse(content);
    if (Object.keys(proseRadius).length > 0) {
      const radiusEntries: Record<string, { $value: string; $type: "dimension" }> = {};
      for (const [key, val] of Object.entries(proseRadius)) {
        radiusEntries[key] = { $value: val, $type: "dimension" };
      }
      tokens["radius"] = leafGroup(radiusEntries);
    }
  }

  // 3c. spacing.<x> → spacing.<x> ($type: "dimension", $value: "<n><unit>" string)
  // Prose fallback: when front-matter spacing is empty, scan prose for a base spacing unit.
  if (state.spacing.size > 0) {
    const spacingEntries: Record<string, { $value: string; $type: "dimension" }> = {};
    for (const [key, resolved] of state.spacing.entries()) {
      spacingEntries[key] = {
        $value: `${resolved.value}${resolved.unit}`,
        $type: "dimension",
      };
    }
    tokens["spacing"] = leafGroup(spacingEntries);
  } else {
    const proseSpacing = extractSpacingFromProse(content);
    if (Object.keys(proseSpacing).length > 0) {
      const spacingEntries: Record<string, { $value: string; $type: "dimension" }> = {};
      for (const [key, val] of Object.entries(proseSpacing)) {
        spacingEntries[key] = { $value: val, $type: "dimension" };
      }
      tokens["spacing"] = leafGroup(spacingEntries);
    }
  }

  // 3d. typography body/h1 font-family → fontFamily.sans ($type: "fontFamily")
  // @google/design.md 0.2.0 preserves the exact YAML front-matter key (e.g. "body",
  // "body-md", "h1"). Markdown-section typography is NOT parsed into state.typography.
  // Pick order: "body" → "body-md" → "h1" → first available entry with fontFamily defined.
  // Prose fallback: when front-matter typography is empty, scan prose for a font family name.
  const FONT_FAMILY_PICK_ORDER = ["body", "body-md", "h1"] as const;
  const pickedTypography =
    FONT_FAMILY_PICK_ORDER.map((k) => state.typography.get(k)).find(
      (t) => t?.fontFamily !== undefined,
    ) ?? [...state.typography.values()].find((t) => t?.fontFamily !== undefined);
  if (pickedTypography?.fontFamily) {
    tokens["fontFamily"] = leafGroup({
      sans: { $value: pickedTypography.fontFamily, $type: "fontFamily" },
    });
  } else {
    // Prose fallback: extract font family from prose typography section
    const proseFontFamily = extractFontFamilyFromProse(content);
    if (proseFontFamily) {
      tokens["fontFamily"] = leafGroup({
        sans: { $value: `${proseFontFamily}, sans-serif`, $type: "fontFamily" },
      });
    }
  }

  // 3e. Type-scale: emit fontSize.base / fontSize.heading / fontWeight.heading
  // Only from front-matter typography (state.typography) — pick body entry for base,
  // heading-ish entry for heading. Only emitted when fontSize/fontWeight fields exist.
  // state.typography values have fontSize as ResolvedDimension ({type,value,unit}).
  {
    const BODY_PICK_ORDER = ["body", "body-md", "body-sm"] as const;
    const HEADING_PICK_ORDER = ["h1", "display", "heading", "display-xl", "display-lg"] as const;

    // Helper to format a ResolvedDimension to a string (same pattern as radius/spacing)
    function fmtDim(dim: { value: number; unit: string }): string {
      return `${dim.value}${dim.unit}`;
    }

    const typographyEntries = [...state.typography.entries()];

    const bodyEntry =
      BODY_PICK_ORDER.map((k) => state.typography.get(k)).find((t) => t?.fontSize !== undefined) ??
      typographyEntries.find(([k, t]) => isBodyLikeKey(k) && t?.fontSize !== undefined)?.[1];

    const headingEntry =
      HEADING_PICK_ORDER.map((k) => state.typography.get(k)).find(
        (t) => t?.fontSize !== undefined,
      ) ??
      typographyEntries.find(([k, t]) => isHeadingLikeKey(k) && t?.fontSize !== undefined)?.[1];

    const fontSizeEntries: Record<string, { $value: string; $type: "dimension" }> = {};
    const fontWeightEntries: Record<string, { $value: string; $type: "fontWeight" }> = {};

    if (bodyEntry?.fontSize) {
      fontSizeEntries["base"] = { $value: fmtDim(bodyEntry.fontSize), $type: "dimension" };
    }
    if (headingEntry?.fontSize) {
      fontSizeEntries["heading"] = {
        $value: fmtDim(headingEntry.fontSize),
        $type: "dimension",
      };
    }
    if (headingEntry?.fontWeight !== undefined && headingEntry.fontWeight !== null) {
      fontWeightEntries["heading"] = {
        $value: String(headingEntry.fontWeight),
        $type: "fontWeight",
      };
    }

    if (Object.keys(fontSizeEntries).length > 0) {
      tokens["fontSize"] = leafGroup(fontSizeEntries);
    }
    if (Object.keys(fontWeightEntries).length > 0) {
      tokens["fontWeight"] = leafGroup(fontWeightEntries);
    }
  }

  // 3f. Shadow from prose (heuristic — no front-matter equivalent in the DESIGN.md spec)
  // Scan prose for CSS box-shadow values; assign to md/sm/lg so the PRIMARY shadow
  // always lands in `md` (which consumers read for `--shadow-md`).
  //   1 shadow  → { md }
  //   2 shadows → { sm: smaller, md: larger }
  //   3 shadows → { sm, md, lg } (ascending by magnitude)
  {
    let shadowExtracted = false;
    const rawShadows = extractShadowsFromProse(content);
    if (rawShadows.length > 0) {
      // Sort ascending by magnitude (smallest → largest)
      const sorted = [...rawShadows].sort((a, b) => shadowMagnitude(a) - shadowMagnitude(b));
      const shadowEntries: Record<string, { $value: string; $type: "shadow" }> = {};
      if (sorted.length === 1) {
        shadowEntries["md"] = { $value: sorted[0] ?? "", $type: "shadow" };
      } else if (sorted.length === 2) {
        shadowEntries["sm"] = { $value: sorted[0] ?? "", $type: "shadow" };
        shadowEntries["md"] = { $value: sorted[1] ?? "", $type: "shadow" };
      } else {
        // 3 shadows → sm / md / lg
        shadowEntries["sm"] = { $value: sorted[0] ?? "", $type: "shadow" };
        shadowEntries["md"] = { $value: sorted[1] ?? "", $type: "shadow" };
        shadowEntries["lg"] = { $value: sorted[2] ?? "", $type: "shadow" };
      }
      tokens["shadow"] = leafGroup(shadowEntries);
      shadowExtracted = true;
    }
    if (shadowExtracted) {
      warnings.push("shadow extracted from prose (heuristic) — review shadow.sm/md/lg values");
    }
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
  const docSections: string[] = [];
  for (const line of content.split("\n")) {
    const heading = parseMarkdownHeading(line);
    if (heading && heading.level <= 3) {
      docSections.push(heading.text);
    }
  }

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
