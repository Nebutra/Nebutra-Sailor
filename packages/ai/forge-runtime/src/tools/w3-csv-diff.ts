/**
 * csv-diff — row/column aware comparison of two CSV payloads (Comparator root).
 *
 * The whole point of this tool is that a CSV is *not* a bag of lines. A text
 * diff answers "which lines moved"; the question people actually arrive with is
 * "which records changed" (docs/plans/tools/csv-diff.md §1).
 *
 * What the brief demands beyond a naive clone (csv-diff.md §7 domain know-how):
 *  1. Row identity, not row position. Rows are matched by a key column, so an
 *     inserted or re-sorted row does not cascade into a wall of false
 *     "changed" rows. When no key is given, the key is auto-*suggested* from
 *     common header names and validated for uniqueness on both sides.
 *  2. A fixed "first column is the key" rule is a trap. There is none here:
 *     either a suggestion that passed a uniqueness check (reported, with its
 *     source, so it can be overridden), or an honest whole-row fallback —
 *     never a silent positional pairing.
 *  3. Column-name drift is its own problem. Headers are paired (explicitly via
 *     `columnMapping`, otherwise by a normalised-name match), so `customer_id`
 *     vs `Customer ID` is one column, not one removed plus one added.
 *  4. "Changed" is reported per cell: which columns differ, with old and new
 *     values — never an opaque "row X differs".
 *  5. "Empty" is not one value. `treatEmptyAsNull` folds ""/whitespace/`NULL`/
 *     `N/A` together, and it is opt-in: sometimes empty-vs-value is exactly
 *     what the user is hunting.
 *  6. Join type changes the *question*, not the display. `full` sees
 *     everything, `inner` only records present on both sides, `left` treats the
 *     original as the authoritative row set. Each is computed, not filtered.
 *  7. Dialect and encoding are correctness, not cosmetics. Delimiter is
 *     detected per side (with override); the byte input path detects
 *     UTF-8/UTF-8-BOM/UTF-16 LE/BE and decodes windows-1252 / latin-1.
 *  8. A header-set mismatch is surfaced as its own fact (`columnSetMismatch`),
 *     never buried inside per-row noise.
 *
 * Specs implemented: RFC 4180 (Common Format and MIME Type for CSV Files —
 * §2 field/record grammar, doubled-quote escaping, embedded CRLF); The Unicode
 * Standard 15.0 §23.8 + RFC 3629 §6 (byte order marks); WHATWG Encoding
 * Standard §12.2.2 windows-1252 index (the 0x80–0x9F range that separates it
 * from ISO-8859-1); ISO/IEC 9075 join semantics for the full/inner/left
 * vocabulary.
 *
 * Deterministic and `pure`: no clock, no randomness, no network, no fs.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

const MAX_TEXT_CHARS = 4_000_000;
const MAX_BASE64_CHARS = 8_000_000;
const DEFAULT_PREVIEW_ROWS = 200;
const MAX_PREVIEW_ROWS = 20_000;
/** Bytes/chars of a file consulted when guessing the delimiter. */
const SNIFF_CHARS = 65_536;
/** How many duplicate-key values are worth naming before a list stops helping. */
const MAX_NAMED_DUPLICATES = 10;

export const CSV_DELIMITERS = [",", ";", "\t", "|"] as const;
export type CsvDelimiter = (typeof CSV_DELIMITERS)[number];

export const CSV_ENCODINGS = [
  "utf8",
  "utf8-bom",
  "utf16le",
  "utf16be",
  "windows-1252",
  "latin1",
] as const;
export type CsvEncoding = (typeof CSV_ENCODINGS)[number];

/** Header names that are a key in practice, ranked by how reliable they are. */
const KEY_HINTS = ["id", "uuid", "guid", "key", "primarykey", "email", "sku"] as const;

/** Values that different exporters all use to mean "no value" (know-how #5). */
const NULL_LIKE = new Set(["", "null", "n/a"]);

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type RowStatus = "added" | "removed" | "changed" | "unchanged";
export type JoinType = "full" | "inner" | "left";
export type KeySource = "provided" | "auto" | "full-row";
export type FindingLevel = "info" | "warning" | "danger";

export interface CsvDiffFinding {
  code: string;
  level: FindingLevel;
  message: string;
}

export interface CsvDiffChangedField {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface CsvDiffRow {
  status: RowStatus;
  /** null under the full-row fallback — there is no key to report. */
  key: Record<string, string> | null;
  original?: Record<string, string>;
  updated?: Record<string, string>;
  changedFields?: CsvDiffChangedField[];
}

export interface CsvDiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  totalOriginalRows: number;
  totalUpdatedRows: number;
}

export interface CsvSideMeta {
  delimiter: CsvDelimiter;
  delimiterSource: "provided" | "detected";
  encoding: CsvEncoding | null;
  encodingSource: "provided" | "detected" | "text";
  headers: string[];
  rowCount: number;
}

export interface CsvDiffResult {
  summary: CsvDiffSummary;
  /** null when the whole-row fallback was used. */
  keyColumnsUsed: string[] | null;
  keySource: KeySource;
  /** Key candidates that were rejected, with the reason — auto-suggestion, visible. */
  keyCandidatesRejected: { column: string; reason: string }[];
  joinType: JoinType;
  /** originalHeader → updatedHeader for every column actually compared. */
  columnMapping: Record<string, string>;
  columnMappingSource: "provided" | "auto";
  /** null when the two header sets fully reconcile. */
  columnSetMismatch: { onlyInOriginal: string[]; onlyInUpdated: string[] } | null;
  comparedColumns: string[];
  rows: CsvDiffRow[];
  /** True when `rows` was capped. `summary` is always complete. */
  truncated: boolean;
  previewLimit: number;
  original: CsvSideMeta;
  updated: CsvSideMeta;
  findings: CsvDiffFinding[];
}

/* ── encoding ──────────────────────────────────────────────────────────── */

/** WHATWG Encoding §12.2.2: the 0x80–0x9F range where windows-1252 ≠ latin-1. */
const CP1252_HIGH = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039,
  0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];

function isValidUtf8(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i] ?? 0;
    let extra = 0;
    let min = 0;
    let code = 0;
    if (b < 0x80) {
      i += 1;
      continue;
    }
    if (b >= 0xc2 && b <= 0xdf) {
      extra = 1;
      min = 0x80;
      code = b & 0x1f;
    } else if (b >= 0xe0 && b <= 0xef) {
      extra = 2;
      min = 0x800;
      code = b & 0x0f;
    } else if (b >= 0xf0 && b <= 0xf4) {
      extra = 3;
      min = 0x10000;
      code = b & 0x07;
    } else {
      return false;
    }
    if (i + extra > bytes.length - 1) return false;
    for (let k = 1; k <= extra; k += 1) {
      const c = bytes[i + k] ?? 0;
      if ((c & 0xc0) !== 0x80) return false;
      code = (code << 6) | (c & 0x3f);
    }
    if (code < min || code > 0x10ffff) return false;
    if (code >= 0xd800 && code <= 0xdfff) return false;
    i += extra + 1;
  }
  return true;
}

export function detectEncoding(bytes: Uint8Array): CsvEncoding {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf8-bom";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return "utf16le";
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return "utf16be";
  // No BOM: an ASCII-ish UTF-16 file is half NUL bytes, and which half says
  // which endianness. Checked before the UTF-8 probe because such a file is
  // *also* not valid UTF-8, and "windows-1252" would be a worse guess.
  const window = Math.min(bytes.length, 512);
  let evenNul = 0;
  let oddNul = 0;
  for (let i = 0; i < window; i += 1) {
    if (bytes[i] !== 0) continue;
    if (i % 2 === 0) evenNul += 1;
    else oddNul += 1;
  }
  if (window >= 4 && (evenNul > window / 4 || oddNul > window / 4)) {
    return oddNul >= evenNul ? "utf16le" : "utf16be";
  }
  return isValidUtf8(bytes) ? "utf8" : "windows-1252";
}

export function decodeBytes(bytes: Uint8Array, encoding: CsvEncoding): string {
  if (encoding === "utf8" || encoding === "utf8-bom") {
    const body = encoding === "utf8-bom" ? bytes.subarray(3) : bytes;
    return new TextDecoder("utf-8").decode(body);
  }
  if (encoding === "utf16le" || encoding === "utf16be") {
    const hasBom =
      bytes.length >= 2 &&
      ((encoding === "utf16le" && bytes[0] === 0xff && bytes[1] === 0xfe) ||
        (encoding === "utf16be" && bytes[0] === 0xfe && bytes[1] === 0xff));
    const body = hasBom ? bytes.subarray(2) : bytes;
    let out = "";
    for (let i = 0; i + 1 < body.length; i += 2) {
      const a = body[i] ?? 0;
      const b = body[i + 1] ?? 0;
      out += String.fromCharCode(encoding === "utf16le" ? a | (b << 8) : (a << 8) | b);
    }
    return out;
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i] ?? 0;
    if (encoding === "windows-1252" && b >= 0x80 && b <= 0x9f) {
      out += String.fromCharCode(CP1252_HIGH[b - 0x80] ?? b);
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

/* ── RFC 4180 parsing ──────────────────────────────────────────────────── */

/**
 * One pass, RFC 4180 §2: fields separated by the delimiter, records by
 * CRLF/LF/CR, quoted fields may contain the delimiter and record separators,
 * and a quote inside a quoted field is escaped by doubling it.
 */
export function parseCsv(text: string, delimiter: string, quoteChar: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  let started = false;

  const endField = () => {
    row.push(field);
    field = "";
    started = true;
  };
  const endRow = () => {
    row.push(field);
    field = "";
    rows.push(row);
    row = [];
    started = false;
  };

  while (i < text.length) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === quoteChar) {
        if (text[i + 1] === quoteChar) {
          field += quoteChar;
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === quoteChar && field === "") {
      quoted = true;
      started = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      endRow();
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += ch;
    started = true;
    i += 1;
  }
  if (field !== "" || row.length > 0 || started) endRow();
  return rows;
}

/** Delimiter guess: the candidate that splits the sample most consistently. */
export function detectDelimiter(text: string, quoteChar: string): CsvDelimiter {
  const sample = text.length > SNIFF_CHARS ? text.slice(0, SNIFF_CHARS) : text;
  let best: { delimiter: CsvDelimiter; fields: number; consistency: number } | null = null;
  for (const delimiter of CSV_DELIMITERS) {
    const rows = parseCsv(sample, delimiter, quoteChar).slice(0, 20);
    const head = rows[0];
    if (!head || head.length < 2) continue;
    const consistent = rows.filter((r) => r.length === head.length).length;
    const consistency = rows.length === 0 ? 0 : consistent / rows.length;
    if (
      !best ||
      consistency > best.consistency ||
      (consistency === best.consistency && head.length > best.fields)
    ) {
      best = { delimiter, fields: head.length, consistency };
    }
  }
  // A single-column file has no delimiter to find; comma keeps the contract
  // stable rather than inventing a separator that is not there.
  return best?.delimiter ?? ",";
}

/* ── table model ───────────────────────────────────────────────────────── */

interface Table {
  headers: string[];
  /** Row objects keyed by this file's own header names. */
  rows: Record<string, string>[];
  delimiter: CsvDelimiter;
  delimiterSource: "provided" | "detected";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function buildTable(
  label: string,
  text: string,
  delimiter: CsvDelimiter | undefined,
  quoteChar: string,
  allowRaggedRows: boolean,
  findings: CsvDiffFinding[],
): Table {
  const body = stripBom(text);
  const chosen = delimiter ?? detectDelimiter(body, quoteChar);
  const raw = parseCsv(body, chosen, quoteChar);
  // A single trailing record separator is normal, not an empty record.
  const records = raw.filter(
    (r, index) => !(index === raw.length - 1 && r.length === 1 && r[0] === ""),
  );
  const headers = records[0];
  if (!headers || headers.length === 0 || headers.every((h) => h.trim() === "")) {
    throw new Error(`${label}: no header row found`);
  }
  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) {
      throw new Error(
        `${label}: duplicate column header "${header}" — column identity is ambiguous`,
      );
    }
    seen.add(header);
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r += 1) {
    const record = records[r] ?? [];
    if (record.length !== headers.length) {
      if (!allowRaggedRows) {
        throw new Error(
          `${label}: row ${r + 1} has ${record.length} fields, expected ${headers.length} based on the header row`,
        );
      }
      // Naming the direction matters: a short row is filled with "" and loses
      // nothing, a long row has its surplus fields *discarded* and those cells
      // never reach the comparison. Calling both "padded" hides real data loss.
      const dropped = record.length - headers.length;
      findings.push({
        code: dropped > 0 ? "ragged_row_truncated" : "ragged_row",
        level: dropped > 0 ? "danger" : "warning",
        message:
          dropped > 0
            ? `${label}: row ${r + 1} has ${record.length} fields, expected ${headers.length} — the ${dropped} surplus field(s) (${record
                .slice(headers.length)
                .map((f) => JSON.stringify(f))
                .join(", ")}) were dropped and are not compared`
            : `${label}: row ${r + 1} has ${record.length} fields, expected ${headers.length} — padded to the header width`,
      });
    }
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = record[index] ?? "";
    });
    rows.push(obj);
  }

  return {
    headers,
    rows,
    delimiter: chosen,
    delimiterSource: delimiter ? "provided" : "detected",
  };
}

/* ── comparison primitives ─────────────────────────────────────────────── */

export interface CompareOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  treatEmptyAsNull: boolean;
}

export function normalizeValue(value: string, options: CompareOptions): string {
  if (options.treatEmptyAsNull && NULL_LIKE.has(value.trim().toLowerCase())) return "";
  let out = value;
  if (options.ignoreWhitespace) out = out.trim().replace(/\s+/g, " ");
  if (options.ignoreCase) out = out.toLowerCase();
  return out;
}

/** Header identity for drift matching: case, spaces and separators do not count. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function autoMapColumns(
  originalHeaders: readonly string[],
  updatedHeaders: readonly string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const taken = new Set<string>();
  const exact = new Set(updatedHeaders);
  for (const header of originalHeaders) {
    if (exact.has(header)) {
      mapping[header] = header;
      taken.add(header);
    }
  }
  const byNormalized = new Map<string, string[]>();
  for (const header of updatedHeaders) {
    const norm = normalizeHeader(header);
    const list = byNormalized.get(norm) ?? [];
    list.push(header);
    byNormalized.set(norm, list);
  }
  for (const header of originalHeaders) {
    if (mapping[header]) continue;
    const candidates = (byNormalized.get(normalizeHeader(header)) ?? []).filter(
      (c) => !taken.has(c),
    );
    // Only an unambiguous rename is auto-paired; two candidates is a question
    // for the user, not a coin flip.
    const candidate = candidates.length === 1 ? candidates[0] : undefined;
    if (candidate) {
      mapping[header] = candidate;
      taken.add(candidate);
    }
  }
  return mapping;
}

function keyOf(
  row: Record<string, string>,
  columns: readonly string[],
  resolve: (column: string) => string,
  options: CompareOptions,
): string {
  return columns.map((c) => normalizeValue(row[resolve(c)] ?? "", options)).join("\u0000");
}

function isUsableKey(
  rows: readonly Record<string, string>[],
  columns: readonly string[],
  resolve: (column: string) => string,
  options: CompareOptions,
): { ok: true } | { ok: false; reason: string } {
  const seen = new Set<string>();
  for (const row of rows) {
    const values = columns.map((c) => row[resolve(c)] ?? "");
    if (values.some((v) => v.trim() === "")) return { ok: false, reason: "empty value" };
    const key = keyOf(row, columns, resolve, options);
    if (seen.has(key)) return { ok: false, reason: "duplicate value" };
    seen.add(key);
  }
  return { ok: true };
}

/* ── the diff ──────────────────────────────────────────────────────────── */

export interface CsvDiffInput {
  original?: string;
  updated?: string;
  originalBase64?: string;
  updatedBase64?: string;
  keyColumns?: string[];
  columnMapping?: Record<string, string>;
  joinType?: JoinType;
  options?: Partial<CompareOptions> & { allowRaggedRows?: boolean; includeUnchanged?: boolean };
  dialect?: {
    delimiter?: CsvDelimiter;
    quoteChar?: string;
    encoding?: CsvEncoding;
  };
  maxPreviewRows?: number;
}

interface SideText {
  text: string;
  encoding: CsvEncoding | null;
  encodingSource: "provided" | "detected" | "text";
}

function readSide(
  label: string,
  text: string | undefined,
  base64: string | undefined,
  encoding: CsvEncoding | undefined,
): SideText {
  if (typeof text === "string") {
    return { text, encoding: null, encodingSource: "text" };
  }
  if (typeof base64 !== "string") throw new Error(`${label}: no content supplied`);
  const cleaned = (base64.includes(",") ? (base64.split(",").pop() ?? base64) : base64).trim();
  // Buffer.from silently drops characters outside the alphabet, which would
  // turn a typo'd payload into a plausible-looking diff. Reject it instead.
  if (!/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(cleaned)) {
    throw new Error(`${label}: content is not valid base64`);
  }
  const bytes = new Uint8Array(Buffer.from(cleaned, "base64"));
  const chosen = encoding ?? detectEncoding(bytes);
  return {
    text: decodeBytes(bytes, chosen),
    encoding: chosen,
    encodingSource: encoding ? "provided" : "detected",
  };
}

export function diffCsv(input: CsvDiffInput): CsvDiffResult {
  const findings: CsvDiffFinding[] = [];
  const options: CompareOptions = {
    ignoreWhitespace: input.options?.ignoreWhitespace ?? false,
    ignoreCase: input.options?.ignoreCase ?? false,
    treatEmptyAsNull: input.options?.treatEmptyAsNull ?? false,
  };
  const allowRaggedRows = input.options?.allowRaggedRows ?? false;
  const includeUnchanged = input.options?.includeUnchanged ?? false;
  const joinType: JoinType = input.joinType ?? "full";
  const quoteChar = input.dialect?.quoteChar ?? '"';
  const previewLimit = input.maxPreviewRows ?? DEFAULT_PREVIEW_ROWS;

  const leftText = readSide(
    "Original CSV",
    input.original,
    input.originalBase64,
    input.dialect?.encoding,
  );
  const rightText = readSide(
    "Updated CSV",
    input.updated,
    input.updatedBase64,
    input.dialect?.encoding,
  );

  const left = buildTable(
    "Original CSV",
    leftText.text,
    input.dialect?.delimiter,
    quoteChar,
    allowRaggedRows,
    findings,
  );
  const right = buildTable(
    "Updated CSV",
    rightText.text,
    input.dialect?.delimiter,
    quoteChar,
    allowRaggedRows,
    findings,
  );

  if (left.delimiter !== right.delimiter) {
    findings.push({
      code: "delimiter_mismatch",
      level: "warning",
      message: `Delimiters differ: original uses ${JSON.stringify(left.delimiter)}, updated uses ${JSON.stringify(right.delimiter)}`,
    });
  }

  /* columns ------------------------------------------------------------- */

  let columnMapping: Record<string, string>;
  let columnMappingSource: "provided" | "auto";
  if (input.columnMapping && Object.keys(input.columnMapping).length > 0) {
    columnMapping = {};
    const claimed = new Map<string, string>();
    for (const [from, to] of Object.entries(input.columnMapping)) {
      if (!left.headers.includes(from)) {
        throw new Error(`Original CSV: mapped column "${from}" does not exist`);
      }
      if (!right.headers.includes(to)) {
        throw new Error(`Updated CSV: mapped column "${to}" does not exist`);
      }
      // A column mapping is a pairing, not a fan-out. Two original columns
      // aimed at one updated column silently compares one of them against the
      // wrong cells, so it is refused rather than half-honoured.
      const already = claimed.get(to);
      if (already !== undefined) {
        throw new Error(
          `Column mapping is ambiguous: "${already}" and "${from}" both map to "${to}" — each updated column may be paired once`,
        );
      }
      claimed.set(to, from);
      columnMapping[from] = to;
    }
    // Anything the caller did not name still pairs on its own name.
    const taken = new Set(Object.values(columnMapping));
    for (const header of left.headers) {
      if (columnMapping[header]) continue;
      if (right.headers.includes(header) && !taken.has(header)) {
        columnMapping[header] = header;
        taken.add(header);
      }
    }
    columnMappingSource = "provided";
  } else {
    columnMapping = autoMapColumns(left.headers, right.headers);
    columnMappingSource = "auto";
  }

  const comparedColumns = left.headers.filter((h) => columnMapping[h] !== undefined);
  if (comparedColumns.length === 0) {
    throw new Error("No comparable columns: the two files share no column names");
  }
  const mappedTargets = new Set(comparedColumns.map((h) => columnMapping[h] as string));
  const onlyInOriginal = left.headers.filter((h) => columnMapping[h] === undefined);
  const onlyInUpdated = right.headers.filter((h) => !mappedTargets.has(h));
  const columnSetMismatch =
    onlyInOriginal.length > 0 || onlyInUpdated.length > 0
      ? { onlyInOriginal, onlyInUpdated }
      : null;
  if (columnSetMismatch) {
    findings.push({
      code: "column_set_mismatch",
      level: "warning",
      message: `Column sets differ — only in original: ${onlyInOriginal.join(", ") || "—"}; only in updated: ${onlyInUpdated.join(", ") || "—"}. Uncompared columns are excluded from every cell comparison.`,
    });
  }
  const renamed = comparedColumns.filter((h) => columnMapping[h] !== h);
  if (renamed.length > 0) {
    findings.push({
      code: "column_renamed",
      level: "info",
      message: `Columns paired across a rename: ${renamed.map((h) => `${h} → ${columnMapping[h]}`).join(", ")}`,
    });
  }

  const toUpdated = (column: string) => columnMapping[column] ?? column;
  const identity = (column: string) => column;

  /* key ------------------------------------------------------------------ */

  const keyCandidatesRejected: { column: string; reason: string }[] = [];
  let keyColumns: string[] | null = null;
  let keySource: KeySource = "full-row";

  if (input.keyColumns && input.keyColumns.length > 0) {
    for (const column of input.keyColumns) {
      if (!comparedColumns.includes(column)) {
        throw new Error(
          `Key column "${column}" is not a comparable column (present and paired in both files)`,
        );
      }
    }
    keyColumns = [...input.keyColumns];
    keySource = "provided";
    const l = isUsableKey(left.rows, keyColumns, identity, options);
    const r = isUsableKey(right.rows, keyColumns, toUpdated, options);
    if (!l.ok || !r.ok) {
      // A caller-chosen key is honoured even when it is not unique — rows are
      // then paired in file order within each key group — but the ambiguity is
      // named rather than hidden behind a confident-looking diff.
      findings.push({
        code: "key_not_unique",
        level: "warning",
        message: `Key ${keyColumns.join(" + ")} is not unique (${!l.ok ? `original: ${l.reason}` : ""}${!l.ok && !r.ok ? "; " : ""}${!r.ok ? `updated: ${r.reason}` : ""}). Rows sharing a key are paired in file order.`,
      });
    }
  } else if (input.keyColumns && input.keyColumns.length === 0) {
    findings.push({
      code: "full_row_fallback_explicit",
      level: "info",
      message:
        "No key requested: rows are matched by their whole compared content. Identical rows match; anything else reads as removed plus added, never as changed.",
    });
  } else {
    const ranked = [...comparedColumns].sort((a, b) => {
      const rank = (h: string) => {
        const index = KEY_HINTS.indexOf(normalizeHeader(h) as (typeof KEY_HINTS)[number]);
        if (index >= 0) return index;
        return normalizeHeader(h).endsWith("id") ? KEY_HINTS.length : KEY_HINTS.length + 1;
      };
      const diff = rank(a) - rank(b);
      return diff !== 0 ? diff : comparedColumns.indexOf(a) - comparedColumns.indexOf(b);
    });
    for (const column of ranked) {
      const normalized = normalizeHeader(column);
      const looksLikeKey =
        KEY_HINTS.includes(normalized as (typeof KEY_HINTS)[number]) || normalized.endsWith("id");
      if (!looksLikeKey) continue;
      const l = isUsableKey(left.rows, [column], identity, options);
      if (!l.ok) {
        keyCandidatesRejected.push({ column, reason: `original: ${l.reason}` });
        continue;
      }
      const r = isUsableKey(right.rows, [column], toUpdated, options);
      if (!r.ok) {
        keyCandidatesRejected.push({ column, reason: `updated: ${r.reason}` });
        continue;
      }
      keyColumns = [column];
      keySource = "auto";
      break;
    }
    if (!keyColumns) {
      findings.push({
        code: "full_row_fallback_auto",
        level: "warning",
        message:
          "No usable key column was found, so rows are matched by their whole compared content — never by position. Pass keyColumns to match on identity instead.",
      });
    }
  }

  /* pairing -------------------------------------------------------------- */

  const signature = (row: Record<string, string>, resolve: (c: string) => string) =>
    comparedColumns.map((c) => normalizeValue(row[resolve(c)] ?? "", options)).join("\u0000");

  const leftKeys = left.rows.map((row) =>
    keyColumns ? keyOf(row, keyColumns, identity, options) : signature(row, identity),
  );
  const rightKeys = right.rows.map((row) =>
    keyColumns ? keyOf(row, keyColumns, toUpdated, options) : signature(row, toUpdated),
  );

  const rightBuckets = new Map<string, number[]>();
  rightKeys.forEach((key, index) => {
    const bucket = rightBuckets.get(key) ?? [];
    bucket.push(index);
    rightBuckets.set(key, bucket);
  });

  const duplicates: string[] = [];
  for (const [key, bucket] of rightBuckets) {
    if (bucket.length > 1 && duplicates.length < MAX_NAMED_DUPLICATES) duplicates.push(key);
  }
  if (duplicates.length > 0 && keyColumns) {
    findings.push({
      code: "duplicate_key_updated",
      level: "warning",
      message: `Updated CSV: repeated key values (${duplicates.map((d) => d.split("\u0000").join(" + ")).join(", ")}). Rows sharing a key are paired in file order.`,
    });
  }

  const cursor = new Map<string, number>();
  const matchedRight = new Set<number>();
  const rows: CsvDiffRow[] = [];
  const summary: CsvDiffSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
    totalOriginalRows: left.rows.length,
    totalUpdatedRows: right.rows.length,
  };

  const keyRecord = (row: Record<string, string>, resolve: (c: string) => string) => {
    if (!keyColumns) return null;
    const out: Record<string, string> = {};
    for (const column of keyColumns) out[column] = row[resolve(column)] ?? "";
    return out;
  };

  const push = (row: CsvDiffRow) => {
    if (rows.length < previewLimit) rows.push(row);
  };

  left.rows.forEach((originalRow, index) => {
    const key = leftKeys[index] as string;
    const bucket = rightBuckets.get(key);
    const at = cursor.get(key) ?? 0;
    const rightIndex = bucket?.[at];
    if (rightIndex === undefined) {
      summary.removed += 1;
      if (joinType !== "inner") {
        push({ status: "removed", key: keyRecord(originalRow, identity), original: originalRow });
      }
      return;
    }
    cursor.set(key, at + 1);
    matchedRight.add(rightIndex);
    const updatedRow = right.rows[rightIndex] as Record<string, string>;
    const changedFields: CsvDiffChangedField[] = [];
    for (const column of comparedColumns) {
      const oldValue = originalRow[column] ?? "";
      const newValue = updatedRow[toUpdated(column)] ?? "";
      if (normalizeValue(oldValue, options) !== normalizeValue(newValue, options)) {
        changedFields.push({ field: column, oldValue, newValue });
      }
    }
    if (changedFields.length > 0) {
      summary.changed += 1;
      push({
        status: "changed",
        key: keyRecord(originalRow, identity),
        original: originalRow,
        updated: updatedRow,
        changedFields,
      });
    } else {
      summary.unchanged += 1;
      if (includeUnchanged) {
        push({
          status: "unchanged",
          key: keyRecord(originalRow, identity),
          original: originalRow,
          updated: updatedRow,
        });
      }
    }
  });

  right.rows.forEach((updatedRow, index) => {
    if (matchedRight.has(index)) return;
    summary.added += 1;
    if (joinType === "full") {
      push({ status: "added", key: keyRecord(updatedRow, toUpdated), updated: updatedRow });
    }
  });

  // A join is a different question, not a display filter (know-how #6): the
  // rows an inner or left join does not ask about are not counted either.
  if (joinType === "inner") {
    summary.removed = 0;
    summary.added = 0;
  } else if (joinType === "left") {
    summary.added = 0;
  }

  const emitted =
    summary.changed +
    (includeUnchanged ? summary.unchanged : 0) +
    (joinType === "inner" ? 0 : summary.removed) +
    (joinType === "full" ? summary.added : 0);
  const truncated = emitted > rows.length;
  if (truncated) {
    findings.push({
      code: "preview_truncated",
      level: "info",
      message: `Showing ${rows.length} of ${emitted} rows — summary counts are complete; raise maxPreviewRows for the full result.`,
    });
  }

  return {
    summary,
    keyColumnsUsed: keyColumns,
    keySource,
    keyCandidatesRejected,
    joinType,
    columnMapping,
    columnMappingSource,
    columnSetMismatch,
    comparedColumns,
    rows,
    truncated,
    previewLimit,
    original: {
      delimiter: left.delimiter,
      delimiterSource: left.delimiterSource,
      encoding: leftText.encoding,
      encodingSource: leftText.encodingSource,
      headers: left.headers,
      rowCount: left.rows.length,
    },
    updated: {
      delimiter: right.delimiter,
      delimiterSource: right.delimiterSource,
      encoding: rightText.encoding,
      encodingSource: rightText.encodingSource,
      headers: right.headers,
      rowCount: right.rows.length,
    },
    findings,
  };
}

/** One-line human answer — the same sentence the page puts above the table. */
export function summarizeCsvDiff(result: CsvDiffResult): string {
  const { added, removed, changed, unchanged } = result.summary;
  if (added + removed + changed === 0) return `No differences (${unchanged} rows unchanged)`;
  return `${added} added · ${removed} removed · ${changed} changed · ${unchanged} unchanged`;
}

/* ── tool ──────────────────────────────────────────────────────────────── */

const sideText = z.string().max(MAX_TEXT_CHARS);
const sideBytes = z.string().max(MAX_BASE64_CHARS);

export const csvDiffTool = tool({
  id: "data/csv-diff",
  slug: "csv-diff",
  category: "data",
  title: { zh: "CSV 差异对比", en: "CSV Diff" },
  description: {
    zh: "按主键匹配行、逐单元格对比两个 CSV：新增/删除/修改/未变，支持列改名映射与 full/inner/left 连接",
    en: "Row-identity CSV comparison: added / removed / changed / unchanged with per-cell old→new, column-rename mapping and full/inner/left joins",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.data.csv_diff",
  roots: ["comparator", "analyzer"],
  engine: {
    name: "nebutra-csv-diff",
    upstream: "RFC 4180 · WHATWG Encoding §12.2.2 windows-1252 · ISO/IEC 9075 join semantics",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "csv对比,比较两个csv文件,csv差异,csv行对比,表格diff",
    en: "csv diff, compare two csv files, csv compare tool, diff csv rows, csv row diff online",
  },
  inputSchema: z
    .object({
      original: sideText.describe("Original CSV text (UTF-8, already decoded)").optional(),
      updated: sideText.describe("Updated CSV text (UTF-8, already decoded)").optional(),
      originalBase64: sideBytes
        .describe("Original CSV as base64 bytes — use when encoding matters")
        .optional(),
      updatedBase64: sideBytes
        .describe("Updated CSV as base64 bytes — use when encoding matters")
        .optional(),
      keyColumns: z
        .array(z.string().min(1))
        .max(16)
        .describe(
          "Header names forming the row identity. Omit to auto-suggest; pass [] to force whole-row comparison.",
        )
        .optional(),
      columnMapping: z
        .record(z.string().min(1), z.string().min(1))
        .describe("originalHeader → updatedHeader, for renamed-but-equivalent columns")
        .optional(),
      joinType: z
        .enum(["full", "inner", "left"])
        .describe("full: every row · inner: rows present in both · left: the original row set")
        .default("full"),
      options: z
        .object({
          ignoreWhitespace: z.boolean().default(false),
          ignoreCase: z.boolean().default(false),
          treatEmptyAsNull: z
            .boolean()
            .describe('Fold "", whitespace, NULL and N/A together')
            .default(false),
          allowRaggedRows: z
            .boolean()
            .describe(
              "Pad/truncate rows whose field count differs from the header instead of failing",
            )
            .default(false),
          includeUnchanged: z
            .boolean()
            .describe("Emit unchanged rows in `rows` (they are always counted in `summary`)")
            .default(false),
        })
        .prefault({}),
      dialect: z
        .object({
          delimiter: z
            .enum(CSV_DELIMITERS)
            .describe("Auto-detected per file if omitted")
            .optional(),
          quoteChar: z.enum(['"', "'"]).default('"'),
          encoding: z
            .enum(CSV_ENCODINGS)
            .describe("Applies to the base64 inputs; auto-detected if omitted")
            .optional(),
        })
        .prefault({}),
      maxPreviewRows: z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_PREVIEW_ROWS)
        .describe("Cap on `rows`; `summary` is always complete")
        .default(DEFAULT_PREVIEW_ROWS),
    })
    .superRefine((value, ctx) => {
      const sides = [
        ["original", value.original, value.originalBase64],
        ["updated", value.updated, value.updatedBase64],
      ] as const;
      for (const [name, text, bytes] of sides) {
        if (text === undefined && bytes === undefined) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `Provide ${name} or ${name}Base64`,
          });
        }
        if (text !== undefined && bytes !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `Provide only one of ${name} or ${name}Base64`,
          });
        }
      }
    }),
  execute: (input: CsvDiffInput) => diffCsv(input),
});

export const w3CsvDiffTools: readonly AnyForgeToolDefinition[] = [csvDiffTool];
