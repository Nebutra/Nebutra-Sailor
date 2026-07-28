/**
 * list-set-compare — two plain-text lists in, the five canonical set results
 * out (Comparator root, docs/plans/tools/list-set-compare.md).
 *
 * What the brief demands beyond a naive clone (§7 domain know-how):
 *  1. **Multiset, not just set.** `apple ×3` in A against `apple ×1` in B is
 *     "common" by set logic and a stock discrepancy by inventory logic. Every
 *     union member therefore carries `countInA` / `countInB`, and within-list
 *     repeats are reported separately (`duplicates`) — the cross-list question
 *     and the data-quality question are different questions.
 *  2. **Case-sensitivity is a comparison axis, never an output transform.**
 *     Folding happens on the comparison key only; the emitted value is the
 *     first-seen original, so `SKU-042` survives a case-insensitive run intact.
 *  3. **Whitespace has three independent policies.** Trim (edges) and collapse
 *     (internal runs) are separate switches, so `"New York"` vs `"New  York"`
 *     is only merged when the caller actually asked for collapse.
 *  4. **Leading-zero folding is opt-in and numeric-only.** `007` == `7` is
 *     right for numeric IDs and wrong for ZIP codes, so it defaults off and
 *     applies only when the whole item is digits — `SKU-007` is never touched.
 *  5. **Unicode normalization is stated, not silent.** Both lists are folded to
 *     NFC before comparison (`café` precomposed vs decomposed is one item, not
 *     two), and the number of items the normalization actually changed is
 *     reported so the behaviour is visible rather than magic.
 *  6. **Set-theory-precise field names.** `onlyInA` / `onlyInB` /
 *     `intersection` / `union` / `symmetricDifference` — no bare "diff", which
 *     is ambiguous between symmetric difference and a line-by-line text diff.
 *  7. **Deterministic order is a guarantee.** Default order is first-seen
 *     (A order, then B-only in B order), so the same two inputs always produce
 *     byte-identical JSON — required when this runs inside a CI/eval gate.
 *     `asc`/`desc` sort by UTF-16 code unit, never `localeCompare`, whose
 *     result depends on the host's ICU data.
 *  8. **The delimiter is part of the input contract.** A comma-separated paste
 *     under newline splitting silently becomes one giant item; auto-detect
 *     (newline, else comma) plus explicit newline/comma/tab/custom closes that,
 *     and a single-item parse raises a warning instead of a nonsense answer.
 *
 * Specs implemented: Unicode Standard 15.0 UAX #15 (Normalization Form C);
 * Unicode Standard 15.0 §5.18 case mapping (via full lowercase mapping — see
 * CASE_FOLD_NOTE for where that differs from full case folding);
 * ISO 80000-2:2019 items 2-4.x set operations (union ∪, intersection ∩,
 * difference ∖, symmetric difference ∆).
 *
 * Pure: no network, no fs, no clock, no randomness.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── limits ────────────────────────────────────────────────────────────── */

const MAX_LIST_CHARS = 2_000_000;
const MAX_CUSTOM_DELIMITER = 64;
/** Detail arrays are bounded so a 100k-item paste cannot emit a 100k-row payload. */
const DEFAULT_MAX_DETAIL = 1_000;
const MAX_MAX_DETAIL = 50_000;
/** Below this length a one-item parse is simply a one-item list, not a mistake. */
const SINGLE_ITEM_SUSPECT_CHARS = 40;

export const CASE_FOLD_NOTE =
  "Case-insensitive comparison uses Unicode full lowercase mapping; it does not fold ß to ss.";

/* ── contract types (brief §9.6) ───────────────────────────────────────── */

export type DelimiterMode = "auto" | "newline" | "comma" | "tab" | "custom";
export type ResolvedDelimiter = "newline" | "comma" | "tab" | "custom";
export type SortMode = "original" | "asc" | "desc" | "byCount";
export type UnicodeNormalizeMode = "nfc" | "none";

export interface ListSetCompareOptions {
  caseSensitive: boolean;
  trimWhitespace: boolean;
  collapseInternalWhitespace: boolean;
  ignoreLeadingZeros: boolean;
  unicodeNormalize: UnicodeNormalizeMode;
  sort: SortMode;
  maxDetail: number;
}

export interface ValueCount {
  value: string;
  count: number;
}

export interface Multiplicity {
  value: string;
  countInA: number;
  countInB: number;
}

export interface ListParseReport {
  /** Delimiter actually used, after `auto` resolution. */
  delimiter: ResolvedDelimiter;
  /** Segments the split produced, before blank segments were dropped. */
  segments: number;
  /** Items kept (blank segments removed). */
  items: number;
  /** Distinct comparison keys. */
  unique: number;
  blankSkipped: number;
  /** Items whose text changed under NFC — the silent-identity trap, made visible. */
  nfcChanged: number;
  /** Distinct spellings merged into one key by case/zero folding. */
  foldedVariants: number;
}

export interface ListSetCompareResult {
  onlyInA: string[];
  onlyInB: string[];
  intersection: string[];
  union: string[];
  symmetricDifference: string[];
  counts: {
    totalA: number;
    totalB: number;
    uniqueA: number;
    uniqueB: number;
    onlyInA: number;
    onlyInB: number;
    intersection: number;
    union: number;
    symmetricDifference: number;
  };
  multiplicities: Multiplicity[];
  multiplicitiesTruncated: boolean;
  duplicates: {
    inA: ValueCount[];
    inB: ValueCount[];
  };
  parse: {
    a: ListParseReport;
    b: ListParseReport;
  };
  options: ListSetCompareOptions;
  /** Human-readable notices. `warningCodes` carries the stable machine ids. */
  warnings: string[];
  warningCodes: string[];
  notes: string[];
}

/* ── input schema (served to agents as JSON Schema over MCP + OpenAPI) ──── */

const optionsSchema = z.object({
  caseSensitive: z
    .boolean()
    .default(true)
    .describe("Compare with case as-is. Off folds case for matching only; output keeps originals."),
  trimWhitespace: z
    .boolean()
    .default(true)
    .describe("Strip leading/trailing whitespace from each item before comparing."),
  collapseInternalWhitespace: z
    .boolean()
    .default(false)
    .describe('Collapse internal whitespace runs to one space ("New  York" matches "New York").'),
  ignoreLeadingZeros: z
    .boolean()
    .default(false)
    .describe('Treat "007" and "7" as one item. Digits-only items only; "SKU-007" is untouched.'),
  unicodeNormalize: z
    .enum(["nfc", "none"])
    .default("nfc")
    .describe("Unicode normalization applied to both lists before comparison (UAX #15)."),
  sort: z
    .enum(["original", "asc", "desc", "byCount"])
    .default("original")
    .describe(
      "Output order. 'original' = first-seen (A then B-only) and is byte-stable across runs.",
    ),
  maxDetail: z.coerce
    .number()
    .int()
    .min(0)
    .max(MAX_MAX_DETAIL)
    .default(DEFAULT_MAX_DETAIL)
    .describe("Cap on multiplicities/duplicates rows. Result sets themselves are never capped."),
});

const OPTION_DEFAULTS: ListSetCompareOptions = {
  caseSensitive: true,
  trimWhitespace: true,
  collapseInternalWhitespace: false,
  ignoreLeadingZeros: false,
  unicodeNormalize: "nfc",
  sort: "original",
  maxDetail: DEFAULT_MAX_DETAIL,
};

export const listSetCompareInputSchema = z
  .object({
    listA: z
      .string()
      .max(MAX_LIST_CHARS)
      .default("")
      .describe("Raw text of list A, split per `delimiter`."),
    listB: z
      .string()
      .max(MAX_LIST_CHARS)
      .default("")
      .describe("Raw text of list B, split per `delimiter`."),
    delimiter: z
      .enum(["auto", "newline", "comma", "tab", "custom"])
      .default("auto")
      .describe("How each list is split. 'auto' = newline, or comma when the text has no newline."),
    customDelimiter: z
      .string()
      .min(1)
      .max(MAX_CUSTOM_DELIMITER)
      .optional()
      .describe(
        'Literal separator, required when delimiter="custom". Escapes \\n \\r \\t \\\\ are honoured. Not a regular expression.',
      ),
    options: optionsSchema.default(OPTION_DEFAULTS),
  })
  .superRefine((value, ctx) => {
    if (value.delimiter !== "custom") return;
    if (!value.customDelimiter || unescapeLiteral(value.customDelimiter) === "") {
      ctx.addIssue({
        code: "custom",
        path: ["customDelimiter"],
        message: 'customDelimiter is required (and must be non-empty) when delimiter="custom"',
      });
    }
  });

export type ListSetCompareInput = z.infer<typeof listSetCompareInputSchema>;

/* ── parsing ───────────────────────────────────────────────────────────── */

/** `\n` `\r` `\t` `\\` in a literal delimiter — a tab cannot be typed into a text field. */
export function unescapeLiteral(source: string): string {
  return source.replace(/\\([nrt\\])/g, (_m, ch: string) => {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "\t";
    return "\\";
  });
}

/**
 * Brief §9.2: newline first; fall back to comma only when the text has zero
 * newlines and at least one comma. Deliberately not "smart" beyond that — a
 * guess the user cannot predict is worse than a delimiter they picked.
 */
export function resolveDelimiter(text: string, mode: DelimiterMode): ResolvedDelimiter {
  if (mode !== "auto") return mode;
  if (/[\r\n]/.test(text)) return "newline";
  if (text.includes(",")) return "comma";
  return "newline";
}

function splitList(text: string, delimiter: ResolvedDelimiter, custom: string): string[] {
  if (text === "") return [];
  if (delimiter === "newline") return text.split(/\r\n|\r|\n/);
  if (delimiter === "comma") return text.split(",");
  if (delimiter === "tab") return text.split("\t");
  // `"abc".split("")` is ["a","b","c"] — an empty custom delimiter would turn
  // every list into its own characters and answer a question nobody asked. The
  // schema refuses this input; a direct engine call falls back to newline.
  if (custom === "") return text.split(/\r\n|\r|\n/);
  return text.split(custom);
}

/** Structural normalization — what the user sees and copies back out. */
function normalizeValue(raw: string, options: ListSetCompareOptions): string {
  let value = raw;
  if (options.unicodeNormalize === "nfc") value = value.normalize("NFC");
  if (options.collapseInternalWhitespace) value = value.replace(/\s+/g, " ");
  if (options.trimWhitespace) value = value.trim();
  return value;
}

/** Comparison key — folding lives here only, so output casing is never destroyed. */
export function comparisonKey(value: string, options: ListSetCompareOptions): string {
  let key = value;
  if (!options.caseSensitive) key = key.toLowerCase();
  if (options.ignoreLeadingZeros && /^\d+$/.test(key)) key = key.replace(/^0+(?=\d)/, "");
  return key;
}

interface ParsedList {
  keys: string[];
  counts: Map<string, number>;
  first: Map<string, string>;
  report: ListParseReport;
}

function parseList(
  text: string,
  delimiter: ResolvedDelimiter,
  custom: string,
  options: ListSetCompareOptions,
): ParsedList {
  const segments = splitList(text, delimiter, custom);
  const counts = new Map<string, number>();
  const first = new Map<string, string>();
  const keys: string[] = [];
  const variantKeys = new Set<string>();
  let items = 0;
  let blankSkipped = 0;
  let nfcChanged = 0;

  for (const segment of segments) {
    const value = normalizeValue(segment, options);
    if (value.trim() === "") {
      blankSkipped += 1;
      continue;
    }
    if (options.unicodeNormalize === "nfc" && segment.normalize("NFC") !== segment) nfcChanged += 1;
    items += 1;
    const key = comparisonKey(value, options);
    const seen = counts.get(key);
    if (seen === undefined) {
      counts.set(key, 1);
      first.set(key, value);
      keys.push(key);
    } else {
      counts.set(key, seen + 1);
      if (first.get(key) !== value) variantKeys.add(key);
    }
  }

  return {
    keys,
    counts,
    first,
    report: {
      delimiter,
      segments: segments.length,
      items,
      unique: keys.length,
      blankSkipped,
      nfcChanged,
      foldedVariants: variantKeys.size,
    },
  };
}

/* ── ordering ──────────────────────────────────────────────────────────── */

/**
 * UTF-16 code-unit order. `localeCompare` would make the output depend on the
 * host's ICU tables, which breaks the byte-identical guarantee (know-how #7).
 */
function codeUnitCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function orderKeys(
  keys: readonly string[],
  options: ListSetCompareOptions,
  value: (key: string) => string,
  total: (key: string) => number,
): string[] {
  if (options.sort === "original") return [...keys];
  const rank = new Map<string, number>();
  for (const [index, key] of keys.entries()) rank.set(key, index);
  const tie = (a: string, b: string) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
  const sorted = [...keys];
  if (options.sort === "asc") {
    sorted.sort((a, b) => codeUnitCompare(value(a), value(b)) || tie(a, b));
  } else if (options.sort === "desc") {
    sorted.sort((a, b) => codeUnitCompare(value(b), value(a)) || tie(a, b));
  } else {
    sorted.sort((a, b) => total(b) - total(a) || tie(a, b));
  }
  return sorted;
}

/* ── engine ────────────────────────────────────────────────────────────── */

export function compareLists(input: ListSetCompareInput): ListSetCompareResult {
  const options: ListSetCompareOptions = { ...OPTION_DEFAULTS, ...input.options };
  const custom = input.customDelimiter ? unescapeLiteral(input.customDelimiter) : "";
  const delimiterA = resolveDelimiter(input.listA, input.delimiter);
  const delimiterB = resolveDelimiter(input.listB, input.delimiter);
  const a = parseList(input.listA, delimiterA, custom, options);
  const b = parseList(input.listB, delimiterB, custom, options);

  const onlyInAKeys = a.keys.filter((key) => !b.counts.has(key));
  const onlyInBKeys = b.keys.filter((key) => !a.counts.has(key));
  const intersectionKeys = a.keys.filter((key) => b.counts.has(key));
  // First-seen order: everything A introduced, then whatever only B has.
  const unionKeys = [...a.keys, ...onlyInBKeys];
  const symmetricKeys = [...onlyInAKeys, ...onlyInBKeys];

  // A's spelling wins for a shared item — one deterministic rule, stated.
  const displayOf = (key: string): string => a.first.get(key) ?? b.first.get(key) ?? key;
  const totalOf = (key: string): number => (a.counts.get(key) ?? 0) + (b.counts.get(key) ?? 0);
  const order = (keys: readonly string[]) =>
    orderKeys(keys, options, displayOf, totalOf).map(displayOf);

  const multiplicityKeys = orderKeys(unionKeys, options, displayOf, totalOf);
  const multiplicities: Multiplicity[] = multiplicityKeys
    .slice(0, options.maxDetail)
    .map((key) => ({
      value: displayOf(key),
      countInA: a.counts.get(key) ?? 0,
      countInB: b.counts.get(key) ?? 0,
    }));

  const dupes = (list: ParsedList): ValueCount[] =>
    orderKeys(
      list.keys.filter((key) => (list.counts.get(key) ?? 0) > 1),
      options,
      (key) => list.first.get(key) ?? key,
      (key) => list.counts.get(key) ?? 0,
    )
      .slice(0, options.maxDetail)
      .map((key) => ({ value: list.first.get(key) ?? key, count: list.counts.get(key) ?? 0 }));

  const warnings: string[] = [];
  const warningCodes: string[] = [];
  const warn = (code: string, message: string) => {
    warningCodes.push(code);
    warnings.push(message);
  };

  singleItemWarning(input.listA, a, "A", warn);
  singleItemWarning(input.listB, b, "B", warn);
  if (
    input.delimiter === "auto" &&
    a.report.items > 0 &&
    b.report.items > 0 &&
    delimiterA !== delimiterB
  ) {
    warn(
      "delimiter_mismatch",
      `Auto-detect split list A on ${delimiterA} and list B on ${delimiterB}. Pick one delimiter if that is not intended.`,
    );
  }
  if (a.report.items === 0)
    warn("empty_a", "List A is empty — every item is reported as only in B.");
  if (b.report.items === 0)
    warn("empty_b", "List B is empty — every item is reported as only in A.");
  const nfcChanged = a.report.nfcChanged + b.report.nfcChanged;
  if (nfcChanged > 0) {
    warn(
      "nfc_normalized",
      `Unicode NFC normalization changed ${nfcChanged} item(s) before comparison — visually identical items with different byte sequences now match.`,
    );
  }
  const folded = a.report.foldedVariants + b.report.foldedVariants;
  if (folded > 0) {
    warn(
      "folded_variants",
      `${folded} key(s) merged more than one spelling under the current comparison options. Output keeps the first spelling seen.`,
    );
  }
  if (multiplicityKeys.length > options.maxDetail) {
    warn(
      "detail_truncated",
      `Per-item counts truncated to ${options.maxDetail} of ${multiplicityKeys.length} rows. Raise maxDetail for the full table.`,
    );
  }

  const notes = [
    options.unicodeNormalize === "nfc"
      ? "Both lists normalized to Unicode NFC before comparison (UAX #15)."
      : "Unicode normalization disabled — visually identical items may compare as different.",
    options.caseSensitive ? "Comparison is case-sensitive." : CASE_FOLD_NOTE,
    options.sort === "original"
      ? "Order is first-seen (list A, then list B-only) — byte-identical across runs."
      : "Sorted output uses UTF-16 code-unit order, not locale collation.",
  ];

  return {
    onlyInA: order(onlyInAKeys),
    onlyInB: order(onlyInBKeys),
    intersection: order(intersectionKeys),
    union: order(unionKeys),
    symmetricDifference: order(symmetricKeys),
    counts: {
      totalA: a.report.items,
      totalB: b.report.items,
      uniqueA: a.report.unique,
      uniqueB: b.report.unique,
      onlyInA: onlyInAKeys.length,
      onlyInB: onlyInBKeys.length,
      intersection: intersectionKeys.length,
      union: unionKeys.length,
      symmetricDifference: symmetricKeys.length,
    },
    multiplicities,
    multiplicitiesTruncated: multiplicityKeys.length > options.maxDetail,
    duplicates: { inA: dupes(a), inB: dupes(b) },
    parse: { a: a.report, b: b.report },
    options,
    warnings,
    warningCodes,
    notes,
  };
}

/**
 * Know-how #8's silent-nonsense failure mode: a long comma-separated paste
 * split on newlines becomes one giant "item" and every result reads zero
 * overlap. Say so, and name the delimiter that would have worked.
 */
function singleItemWarning(
  raw: string,
  parsed: ParsedList,
  side: "A" | "B",
  warn: (code: string, message: string) => void,
): void {
  if (parsed.report.items !== 1) return;
  if (raw.length < SINGLE_ITEM_SUSPECT_CHARS) return;
  const candidates: string[] = [];
  if (parsed.report.delimiter !== "comma" && raw.includes(",")) candidates.push("comma");
  if (parsed.report.delimiter !== "tab" && raw.includes("\t")) candidates.push("tab");
  if (parsed.report.delimiter !== "newline" && /[\r\n]/.test(raw)) candidates.push("newline");
  if (candidates.length === 0) return;
  warn(
    side === "A" ? "single_item_a" : "single_item_b",
    `List ${side} parsed as a single item — check the delimiter (the text contains ${candidates.join(" and ")} separators).`,
  );
}

/* ── declaration ───────────────────────────────────────────────────────── */

export const listSetCompareTool = tool({
  id: "text/list-set-compare",
  slug: "list-set-compare",
  category: "text",
  title: { zh: "两个列表对比（集合差集/交集/并集）", en: "Compare Two Lists (Set Diff)" },
  description: {
    zh: "对比两个列表：仅在 A / 仅在 B / 交集 / 并集 / 对称差，含重复项与逐项计数；NFC 归一化，顺序确定",
    en: "Compare two lists: only-in-A, only-in-B, intersection, union, symmetric difference, plus duplicates and per-item counts. NFC-normalized, deterministic order.",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.list_set_compare",
  roots: ["comparator", "analyzer"],
  engine: {
    name: "list-set-compare",
    upstream:
      "Unicode 15.0 UAX #15 (NFC) + Unicode 15.0 §5.18 case mapping + ISO 80000-2:2019 set operations",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "两个列表对比,列表差集,列表去重对比,找出两个列表的不同,列表交集并集",
    en: "compare two lists, list diff, list comparison tool, find differences between lists, list intersection union tool",
  },
  inputSchema: listSetCompareInputSchema,
  execute: (input: ListSetCompareInput) => compareLists(input),
});

export const w3ListSetCompareTools: readonly AnyForgeToolDefinition[] = [listSetCompareTool];
