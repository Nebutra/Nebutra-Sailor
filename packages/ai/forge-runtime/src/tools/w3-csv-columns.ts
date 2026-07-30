/**
 * csv-columns — keep / drop / rename / reorder the columns of one CSV
 * (Editor root, brief docs/plans/tools/csv-columns.md).
 *
 * This is a *structural* transform: it never touches a cell's value, never adds
 * or removes rows, never edits content. The header row and the column shape are
 * the entire surface (§9.4) — cell editing is the free-form-editor trap the
 * brief explicitly refuses.
 *
 * What the brief demands beyond a naive clone (csv-columns.md §7 domain know-how):
 *  1. The configuration is an explicit statement about *known* columns, not an
 *     open-ended "type the names to drop" field: `keep`/`drop`/`order` take
 *     0-based indices as well as names, so a caller can always be unambiguous.
 *  2. Resolution order is fixed and stated: every index and every name resolves
 *     against the ORIGINAL header, and the transform runs drop → rename →
 *     reorder. Renaming column 3 to "email" and dropping "email" in the same
 *     request therefore drops the column that was called "email" on input —
 *     never the freshly renamed one. (wtools.io resolves names at request time
 *     against row 1 with no stated order; that is exactly the silent wrong-column
 *     bug this rule exists to prevent.)
 *  3. Duplicate headers are normal in real exports. Names are matched
 *     first-occurrence-only and every duplicate that was referenced *by name*
 *     is reported in `warnings.duplicateHeaders`; an index reference is exact
 *     and never ambiguous, which is what the human page sends.
 *  4. Row splitting is RFC 4180-aware: quoted fields may contain the delimiter,
 *     CR, LF and doubled quotes (`""`). A `String.split(delimiter)` — the
 *     default path of at least one shipping competitor — drifts the column
 *     count the moment a field is quoted.
 *  5. CR / LF / CRLF are handled as record terminators by the tokenizer itself,
 *     so there is no single non-global `replace("\r\n", "\n")` to corrupt every
 *     line after the first (a bug read out of a competitor's own source).
 *  6. Ragged rows have a declared policy instead of silently misaligning
 *     columns: `pad` (default) aligns every row to the header, `truncate` cuts
 *     over-long rows and leaves short ones short, `reject` fails loudly. Every
 *     ragged row is reported either way.
 *
 * Specs implemented: RFC 4180 (Common Format and MIME Type for CSV Files) §2 —
 * field/record grammar, doubled-quote escaping, delimiter and CRLF inside
 * quoted fields; The Unicode Standard 15.0 §23.8 + RFC 3629 §6 (UTF-8 byte
 * order mark, stripped from the first header name).
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

const MAX_CSV_CHARS = 4_000_000;
const MAX_COLUMNS = 4_096;
/** Naming every ragged line in a broken 100k-row export stops being help. */
const MAX_REPORTED_RAGGED = 50;

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type RaggedRowPolicy = "pad" | "truncate" | "reject";

export interface RaggedRowReport {
  /** 1-based physical line where the record starts. */
  line: number;
  expected: number;
  actual: number;
}

export interface CsvColumnsWarnings {
  /** Original header names that occur more than once AND were referenced by name. */
  duplicateHeaders?: string[];
  raggedRows?: RaggedRowReport[];
  /** True when more ragged rows exist than `raggedRows` names. */
  raggedRowsTruncated?: boolean;
  /** `rename.from` values that matched a column which the output does not carry. */
  unusedRenames?: string[];
}

export interface CsvColumnsResult {
  /** Transformed CSV — drop → rename → reorder, in that fixed order. */
  csv: string;
  /** Final header, post-transform. */
  columns: string[];
  /** The header as parsed from the input, so a UI can render its controls. */
  originalColumns: string[];
  rowCount: number;
  warnings: CsvColumnsWarnings;
}

/* ── errors ────────────────────────────────────────────────────────────── */

/** Stable, greppable codes (ship gate §6.5 #7) carried on the message prefix. */
export class CsvColumnsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "CsvColumnsError";
    this.code = code;
  }
}

/* ── parsing (know-how #4, #5) ─────────────────────────────────────────── */

export interface CsvRecord {
  fields: string[];
  /** 1-based physical line the record starts on (records may span lines). */
  line: number;
}

const BOM = "\uFEFF";

/**
 * RFC 4180 §2 tokenizer. A quoted field may contain the delimiter, CR, LF and
 * `""` for a literal quote; a quote that appears after a field has already
 * started is kept as data rather than rejected, because real exports contain
 * `5" pipe` and refusing the whole file helps nobody.
 *
 * CR, LF and CRLF are all record terminators here — the normalisation that a
 * naive `replace("\r\n", "\n")` gets wrong (know-how #5) never happens.
 */
export function parseCsv(text: string, delimiter: string): CsvRecord[] {
  const src = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let i = 0;

  const endRecord = () => {
    fields.push(field);
    records.push({ fields, line: recordLine });
    fields = [];
    field = "";
    line += 1;
    recordLine = line;
  };

  while (i < src.length) {
    const ch = src[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === "\n") line += 1;
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      fields.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += src[i + 1] === "\n" ? 2 : 1;
      endRecord();
      continue;
    }
    if (ch === "\n") {
      i += 1;
      endRecord();
      continue;
    }
    field += ch;
    i += 1;
  }
  // A file that ends with a terminator has no trailing empty record; one that
  // ends mid-record still yields that record.
  if (field !== "" || fields.length > 0 || inQuotes) endRecord();
  return records;
}

/** RFC 4180 §2: quote only when the field would otherwise break the grammar. */
export function encodeCsvField(value: string, delimiter: string): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

/* ── column reference resolution (know-how #2, #3) ─────────────────────── */

export type ColumnRef = number | string;

interface Resolution {
  index: number;
  /** Set when a *name* matched a header that occurs more than once. */
  ambiguousName?: string;
}

/**
 * Every reference resolves against the ORIGINAL header and nothing else — an
 * index is exact, a name takes the first occurrence and flags the ambiguity.
 */
function resolveRef(ref: ColumnRef, headers: readonly string[]): Resolution {
  if (typeof ref === "number") {
    if (!Number.isInteger(ref) || ref < 0 || ref >= headers.length) {
      throw new CsvColumnsError(
        "unknown_column",
        `column index ${ref} is outside the header (0..${headers.length - 1}).`,
      );
    }
    return { index: ref };
  }
  const index = headers.indexOf(ref);
  if (index === -1) {
    throw new CsvColumnsError(
      "unknown_column",
      `no column named ${JSON.stringify(ref)} in the header [${headers.map((h) => JSON.stringify(h)).join(", ")}].`,
    );
  }
  const duplicated = headers.indexOf(ref, index + 1) !== -1;
  return duplicated ? { index, ambiguousName: ref } : { index };
}

/* ── transform ─────────────────────────────────────────────────────────── */

export interface RenameOp {
  /** ORIGINAL header name, or its 0-based index (exact, never ambiguous). */
  from: ColumnRef;
  to: string;
}

export interface CsvColumnOperations {
  keep?: ColumnRef[];
  drop?: ColumnRef[];
  rename?: RenameOp[];
  order?: ColumnRef[];
}

export interface CsvColumnsInput {
  csv: string;
  delimiter?: string;
  operations?: CsvColumnOperations;
  raggedRowPolicy?: RaggedRowPolicy;
  lineEnding?: "lf" | "crlf";
}

export function transformCsvColumns(input: CsvColumnsInput): CsvColumnsResult {
  const delimiter = input.delimiter ?? ",";
  const policy = input.raggedRowPolicy ?? "pad";
  const eol = input.lineEnding === "crlf" ? "\r\n" : "\n";
  const ops = input.operations ?? {};

  const records = parseCsv(input.csv, delimiter);
  const header = records[0];
  if (!header || (header.fields.length === 1 && header.fields[0]?.trim() === "")) {
    throw new CsvColumnsError(
      "empty_input",
      "no header row found. The first line of the CSV is read as the column names.",
    );
  }
  const originalColumns = header.fields;
  if (originalColumns.length > MAX_COLUMNS) {
    throw new CsvColumnsError(
      "too_many_columns",
      `header has ${originalColumns.length} columns; the limit is ${MAX_COLUMNS}.`,
    );
  }

  const ambiguous = new Set<string>();
  const resolve = (ref: ColumnRef): number => {
    const r = resolveRef(ref, originalColumns);
    if (r.ambiguousName !== undefined) ambiguous.add(r.ambiguousName);
    return r.index;
  };

  // 1. drop — `keep` is an allow-list over the original header, `drop` removes
  //    from it. Both resolve against the original header, so the two lists are
  //    plain set arithmetic and `drop` wins on a conflict.
  const allowed =
    ops.keep === undefined
      ? new Set(originalColumns.map((_, i) => i))
      : new Set(ops.keep.map(resolve));
  for (const ref of ops.drop ?? []) allowed.delete(resolve(ref));
  const kept = originalColumns.map((_, i) => i).filter((i) => allowed.has(i));
  if (kept.length === 0) {
    throw new CsvColumnsError(
      "no_columns_selected",
      "the keep/drop operations leave no columns. A CSV needs at least one column.",
    );
  }

  // 2. rename — `from` still points at the original header (know-how #2).
  const renamed = [...originalColumns];
  const unusedRenames: string[] = [];
  for (const op of ops.rename ?? []) {
    const index = resolve(op.from);
    renamed[index] = op.to;
    if (!allowed.has(index)) unusedRenames.push(String(op.from));
  }

  // 3. reorder — explicit positions first (dedup, dropped refs skipped), then
  //    everything else in its original relative order.
  const ordered: number[] = [];
  const seen = new Set<number>();
  for (const ref of ops.order ?? []) {
    const index = resolve(ref);
    if (!allowed.has(index) || seen.has(index)) continue;
    seen.add(index);
    ordered.push(index);
  }
  for (const index of kept) {
    if (seen.has(index)) continue;
    seen.add(index);
    ordered.push(index);
  }

  const columns = ordered.map((i) => renamed[i] as string);

  /* rows ------------------------------------------------------------- */

  const expected = originalColumns.length;
  const raggedRows: RaggedRowReport[] = [];
  let raggedTotal = 0;
  const lines: string[] = [columns.map((c) => encodeCsvField(c, delimiter)).join(delimiter)];

  for (let r = 1; r < records.length; r += 1) {
    const record = records[r] as CsvRecord;
    const actual = record.fields.length;
    if (actual !== expected) {
      raggedTotal += 1;
      if (raggedRows.length < MAX_REPORTED_RAGGED) {
        raggedRows.push({ line: record.line, expected, actual });
      }
      if (policy === "reject") {
        throw new CsvColumnsError(
          "ragged_row",
          `line ${record.line} has ${actual} field${actual === 1 ? "" : "s"} but the header has ${expected}. Set raggedRowPolicy to "pad" or "truncate" to process it anyway.`,
        );
      }
    }
    // `pad` aligns the row to the header; `truncate` cuts an over-long row but
    // leaves a short one short, so its missing trailing columns stay absent
    // from the output line instead of being invented as empty fields.
    const cells: (string | undefined)[] = ordered.map((i) => record.fields[i]);
    if (policy === "truncate") {
      while (cells.length > 0 && cells[cells.length - 1] === undefined) cells.pop();
    }
    lines.push(cells.map((c) => encodeCsvField(c ?? "", delimiter)).join(delimiter));
  }

  const warnings: CsvColumnsWarnings = {};
  if (ambiguous.size > 0) warnings.duplicateHeaders = [...ambiguous].sort();
  if (raggedRows.length > 0) warnings.raggedRows = raggedRows;
  if (raggedTotal > raggedRows.length) warnings.raggedRowsTruncated = true;
  if (unusedRenames.length > 0) warnings.unusedRenames = unusedRenames;

  return {
    csv: lines.join(eol),
    columns,
    originalColumns,
    rowCount: records.length - 1,
    warnings,
  };
}

/* ── tool definition ───────────────────────────────────────────────────── */

const columnRef = z
  .union([z.number().int().min(0), z.string().min(1)])
  .describe("A 0-based column index (exact) or an ORIGINAL header name (first match wins).");

const inputSchema = z.object({
  csv: z
    .string()
    .min(1)
    .max(MAX_CSV_CHARS)
    .describe("Raw CSV text. The first record is the header row and is required."),
  delimiter: z
    .string()
    .length(1)
    .refine((d) => d !== '"' && d !== "\r" && d !== "\n", {
      message: "delimiter cannot be a double quote or a line break (RFC 4180 §2).",
    })
    .default(",")
    .describe('Field separator, one character. Default ",". Use "\\t" for TSV.'),
  operations: z
    .object({
      keep: z
        .array(columnRef)
        .max(MAX_COLUMNS)
        .optional()
        .describe(
          "Allow-list of columns to retain, against the ORIGINAL header. Omit to keep every column. Retained columns stay in their original relative order unless `order` says otherwise.",
        ),
      drop: z
        .array(columnRef)
        .max(MAX_COLUMNS)
        .optional()
        .describe(
          "Columns to remove, against the ORIGINAL header. Removal wins over `keep` when both name the same column.",
        ),
      rename: z
        .array(
          z.object({
            from: columnRef.describe(
              "ORIGINAL header name or 0-based index. A name that occurs twice matches the first occurrence and is reported in warnings.duplicateHeaders.",
            ),
            to: z.string().max(1_024).describe("New header text. May be empty."),
          }),
        )
        .max(MAX_COLUMNS)
        .optional()
        .describe(
          "Header renames. Applied after drop, so a rename never changes what drop removed.",
        ),
      order: z
        .array(columnRef)
        .max(MAX_COLUMNS)
        .optional()
        .describe(
          "Final column order by ORIGINAL index or ORIGINAL name. Columns left out are appended in their original relative order; references to dropped columns are ignored.",
        ),
    })
    .prefault({})
    .describe(
      "Indices and names always resolve against the ORIGINAL header. The fixed transform order is drop → rename → reorder.",
    ),
  raggedRowPolicy: z
    .enum(["pad", "truncate", "reject"])
    .default("pad")
    .describe(
      'What to do with a row whose field count differs from the header. "pad": align to the header (short rows gain empty fields, long rows lose the extra ones). "truncate": cut over-long rows, leave short rows short. "reject": fail with ragged_row. Every ragged row is reported in warnings either way.',
    ),
  lineEnding: z
    .enum(["lf", "crlf"])
    .default("lf")
    .describe('Record terminator of the produced CSV. "crlf" is the RFC 4180 §2.1 wire form.'),
});

type CsvColumnsToolInput = z.infer<typeof inputSchema>;

export const csvColumnsTool = tool({
  id: "data/csv-columns",
  slug: "csv-columns",
  category: "data",
  title: { zh: "CSV 列编辑", en: "CSV Column Editor" },
  description: {
    zh: '保留/删除、重命名、重排 CSV 列：RFC 4180 解析（引号内的分隔符与换行、"" 转义），删除→重命名→重排的固定顺序，重复表头与不齐行均有明确策略',
    en: 'Keep, drop, rename and reorder CSV columns with RFC 4180 parsing (quoted delimiters, embedded newlines, "" escapes), a fixed drop → rename → reorder order, and stated duplicate-header and ragged-row policies',
  },
  tier: "catalog",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.data.csv_columns",
  roots: ["editor"],
  engine: {
    name: "nebutra-csv-columns",
    upstream:
      "RFC 4180 §2 (CSV field/record grammar, doubled-quote escaping, quoted CRLF) · The Unicode Standard 15.0 §23.8 + RFC 3629 §6 (UTF-8 BOM)",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "csv列编辑,csv删除列,csv列重排,csv重命名表头,csv选择列,在线csv列管理",
    en: "csv column editor, reorder csv columns, rename csv columns, delete csv column, remove csv column online, csv column manager",
  },
  inputSchema,
  execute: (input: CsvColumnsToolInput): CsvColumnsResult =>
    transformCsvColumns(input as CsvColumnsInput),
});

export const w3CsvColumnsTools: readonly AnyForgeToolDefinition[] = [csvColumnsTool];
