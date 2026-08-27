/**
 * line-ending-detect — LF / CRLF / CR verdict over raw bytes (Detector root).
 *
 * Read-only by design (§6.7.9): this tool answers "what are this file's line
 * endings", never "rewrite them" — conversion belongs to the Converter root.
 *
 * What the brief demands beyond a naive clone (docs/plans/tools/line-ending-detect.md §7):
 *  1. "Mixed" is not a boolean. Per-style counts + ratios + a dominant style,
 *     so one stray CRLF in a 10,000-line LF file reads differently from 50/50.
 *     The stray lines are named (their 1-based line numbers) so "investigate
 *     this" has somewhere to go.
 *  2. Trailing-newline state is a separate axis from ending *style*: POSIX
 *     defines a line as ending in a newline, so a final line without one is
 *     malformed even when every ending is consistent LF.
 *  3. A leading UTF-8 BOM travels with this question — it breaks shebangs and
 *     several JSON/shell parsers — so it is detected and reported here.
 *  4. Counting happens over bytes, never over a string that has been through a
 *     textarea round-trip. The `text` input keeps that caveat attached to the
 *     answer; `fileBase64` is the byte-exact path.
 *  5. Only UTF-8/ASCII is safe to scan naively. UTF-16/UTF-32 signatures, NUL
 *     bytes and malformed UTF-8 raise `decodeWarning` instead of emitting a
 *     confident wrong count.
 *
 * Specs implemented: IEEE Std 1003.1-2017 (POSIX) definitions of "line" and
 * "newline character"; The Unicode Standard 15.0 §5.8 Newline Guidelines
 * (LF U+000A / CR U+000D / CRLF as the three legacy record separators);
 * The Unicode Standard 15.0 §23.8 + RFC 3629 §6 (UTF-8 byte order mark
 * EF BB BF); RFC 3629 §4 well-formed UTF-8 (via a strict decode probe).
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

const DEFAULT_SAMPLE_BYTES = 262_144;
const MAX_SAMPLE_BYTES = 4_194_304;
/** How many offending line numbers are worth naming before a list stops helping. */
const MAX_MINORITY_LINES = 20;
/** Below this share, a minority style reads as an accident, not a convention. */
const OUTLIER_RATIO = 0.05;

const LF = 0x0a;
const CR = 0x0d;

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type LineEndingStyle = "LF" | "CRLF" | "CR";
export type DominantLineEnding = LineEndingStyle | "none";

export interface LineEndingCounts {
  lf: number;
  crlf: number;
  cr: number;
}

export type FindingLevel = "info" | "warning" | "danger";

export interface LineEndingFinding {
  code: string;
  level: FindingLevel;
  message: string;
}

export interface LineEndingDetectResult {
  /** "none" only when the input contains no line terminator at all. */
  dominant: DominantLineEnding;
  isMixed: boolean;
  counts: LineEndingCounts;
  /** 0..1 shares of the terminators counted; sums to 1 unless there are none. */
  ratios: LineEndingCounts;
  totalLines: number;
  /** Bytes actually scanned (equals `sourceBytes` when nothing was sampled). */
  byteSize: number;
  trailingNewline: "present" | "absent";
  /** BOM detection is scoped to UTF-8; other signatures surface as a warning. */
  bom: "utf8" | "none";
  decodeWarning?: string;
  /** Which input path produced this answer — the paste path carries a caveat. */
  source: "text" | "file";
  sampled: boolean;
  sourceBytes: number;
  /** 1-based line numbers whose terminator is not the dominant style. */
  minorityLines: number[];
  minorityLinesTruncated: boolean;
  findings: LineEndingFinding[];
}

/* ── scan ──────────────────────────────────────────────────────────────── */

interface ScanResult {
  counts: LineEndingCounts;
  totalLines: number;
  endsWithTerminator: boolean;
  firstStyle: LineEndingStyle | null;
  linesByStyle: Record<LineEndingStyle, number[]>;
}

/**
 * One pass over the bytes. CR followed by LF is one CRLF terminator, a lone CR
 * is a classic-Mac terminator and a lone LF is a Unix one — the same three
 * cases the Unicode newline guidelines enumerate. Per style we remember only
 * the first `MAX_MINORITY_LINES` line numbers, so a 4 MB file with a million
 * endings still costs constant memory.
 */
function scanBytes(bytes: Uint8Array): ScanResult {
  const counts: LineEndingCounts = { lf: 0, crlf: 0, cr: 0 };
  const linesByStyle: Record<LineEndingStyle, number[]> = { LF: [], CRLF: [], CR: [] };
  let line = 1;
  let firstStyle: LineEndingStyle | null = null;
  let endsWithTerminator = false;
  let i = 0;

  while (i < bytes.length) {
    const byte = bytes[i];
    let style: LineEndingStyle | null = null;
    if (byte === CR) {
      if (bytes[i + 1] === LF) {
        style = "CRLF";
        counts.crlf += 1;
        i += 2;
      } else {
        style = "CR";
        counts.cr += 1;
        i += 1;
      }
    } else if (byte === LF) {
      style = "LF";
      counts.lf += 1;
      i += 1;
    } else {
      i += 1;
    }
    if (!style) continue;
    if (linesByStyle[style].length < MAX_MINORITY_LINES) linesByStyle[style].push(line);
    if (firstStyle === null) firstStyle = style;
    endsWithTerminator = i === bytes.length;
    line += 1;
  }

  const terminators = counts.lf + counts.crlf + counts.cr;
  // A dangling partial line still counts as a line — it is exactly the line
  // POSIX calls malformed for lacking its newline.
  const totalLines = terminators + (bytes.length > 0 && !endsWithTerminator ? 1 : 0);
  return { counts, totalLines, endsWithTerminator, firstStyle, linesByStyle };
}

/* ── encoding sanity (know-how #5) ─────────────────────────────────────── */

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((b, idx) => bytes[idx] === b);
}

/**
 * A sampled window can cut a multi-byte sequence in half. Dropping the trailing
 * partial sequence keeps the strict-decode probe from reporting a truncation as
 * a broken file.
 */
function trimIncompleteTail(bytes: Uint8Array): Uint8Array {
  for (let back = 1; back <= 3 && back <= bytes.length; back += 1) {
    const byte = bytes[bytes.length - back] as number;
    if (byte < 0x80) return bytes;
    if (byte >= 0xc0) {
      const needed = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : 2;
      return back < needed ? bytes.subarray(0, bytes.length - back) : bytes;
    }
  }
  return bytes;
}

function encodingWarning(bytes: Uint8Array, sampled: boolean): string | null {
  if (startsWith(bytes, [0xff, 0xfe, 0x00, 0x00]) || startsWith(bytes, [0x00, 0x00, 0xfe, 0xff])) {
    return "UTF-32 byte order mark detected. Line endings are encoded as 4-byte units there, so a UTF-8 byte scan cannot count them — run the encoding detector first.";
  }
  if (startsWith(bytes, [0xff, 0xfe]) || startsWith(bytes, [0xfe, 0xff])) {
    return "UTF-16 byte order mark detected. Every ASCII character carries a 0x00 padding byte in UTF-16, so a UTF-8 byte scan cannot count line endings reliably — run the encoding detector first.";
  }
  let nulls = 0;
  for (let i = 0; i < bytes.length; i += 1) if (bytes[i] === 0x00) nulls += 1;
  if (nulls > 0) {
    return `Input contains ${nulls} NUL byte${nulls === 1 ? "" : "s"} — it is probably binary or UTF-16/UTF-32 without a byte order mark, not UTF-8 text. Line-ending counts below are unreliable.`;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sampled ? trimIncompleteTail(bytes) : bytes);
  } catch {
    return "Input is not well-formed UTF-8 (RFC 3629). Counts below come from a raw 0x0D/0x0A scan and may be wrong for legacy encodings such as Shift_JIS, EUC-JP or GB 18030 — run the encoding detector first.";
  }
  return null;
}

/* ── verdict assembly ──────────────────────────────────────────────────── */

/** Ties resolve LF > CRLF > CR — deterministic, and `isMixed` is true anyway. */
function pickDominant(counts: LineEndingCounts): DominantLineEnding {
  const ranked: readonly [LineEndingStyle, number][] = [
    ["LF", counts.lf],
    ["CRLF", counts.crlf],
    ["CR", counts.cr],
  ];
  let best: DominantLineEnding = "none";
  let bestCount = 0;
  for (const [style, count] of ranked) {
    if (count > bestCount) {
      best = style;
      bestCount = count;
    }
  }
  return best;
}

function countOf(counts: LineEndingCounts, style: LineEndingStyle): number {
  return style === "LF" ? counts.lf : style === "CRLF" ? counts.crlf : counts.cr;
}

function styleLabel(style: DominantLineEnding): string {
  if (style === "LF") return "LF (Unix/Linux/macOS)";
  if (style === "CRLF") return "CRLF (Windows)";
  if (style === "CR") return "CR (classic Mac OS ≤ 9)";
  return "none";
}

function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export interface DetectOptions {
  source: "text" | "file";
  sourceBytes: number;
  sampled: boolean;
}

export function detectLineEndings(
  bytes: Uint8Array,
  options: DetectOptions,
): LineEndingDetectResult {
  const bom = startsWith(bytes, [0xef, 0xbb, 0xbf]) ? "utf8" : "none";
  const body = bom === "utf8" ? bytes.subarray(3) : bytes;
  const scan = scanBytes(bytes);
  const terminators = scan.counts.lf + scan.counts.crlf + scan.counts.cr;
  const dominant = pickDominant(scan.counts);
  const styles: readonly LineEndingStyle[] = ["LF", "CRLF", "CR"];
  const present = styles.filter((s) => countOf(scan.counts, s) > 0);
  const isMixed = present.length > 1;
  const ratios: LineEndingCounts =
    terminators === 0
      ? { lf: 0, crlf: 0, cr: 0 }
      : {
          lf: scan.counts.lf / terminators,
          crlf: scan.counts.crlf / terminators,
          cr: scan.counts.cr / terminators,
        };

  const minorityStyles = present.filter((s) => s !== dominant);
  const minorityTotal = minorityStyles.reduce((sum, s) => sum + countOf(scan.counts, s), 0);
  const collected = minorityStyles.flatMap((s) => scan.linesByStyle[s]).sort((a, b) => a - b);
  const minorityLines = collected.slice(0, MAX_MINORITY_LINES);
  const decodeWarning = encodingWarning(bytes, options.sampled);

  const findings: LineEndingFinding[] = [];

  // Shebang damage is the single most common "why did this fail" in the JTBD:
  // the kernel takes everything up to the newline as the interpreter path, so a
  // trailing CR becomes part of the filename.
  const hasShebang = body[0] === 0x23 && body[1] === 0x21;
  if (hasShebang && (scan.firstStyle === "CRLF" || scan.firstStyle === "CR")) {
    findings.push({
      code: "shebang_cr",
      level: "danger",
      message: `The shebang line ends with ${scan.firstStyle}. The kernel keeps the CR as part of the interpreter path, which surfaces as "bad interpreter" or "command not found".`,
    });
  }
  if (hasShebang && bom === "utf8") {
    findings.push({
      code: "bom_before_shebang",
      level: "danger",
      message:
        "A UTF-8 BOM sits in front of the shebang, so the file no longer starts with #! and is not recognised as a script.",
    });
  } else if (bom === "utf8") {
    findings.push({
      code: "bom_present",
      level: "warning",
      message:
        "Leading UTF-8 BOM (EF BB BF). Several JSON, shell and CSV parsers treat it as content rather than as a signature.",
    });
  }

  if (isMixed) {
    const parts = present.map(
      (s) =>
        `${s} ${countOf(scan.counts, s)} (${pct(
          s === "LF" ? ratios.lf : s === "CRLF" ? ratios.crlf : ratios.cr,
        )})`,
    );
    findings.push({
      code: "mixed",
      level: "warning",
      message: `Mixed line endings: ${parts.join(", ")}. Tools that assume one style will produce noisy diffs or wrong line counts.`,
    });
    if (minorityTotal / terminators < OUTLIER_RATIO) {
      findings.push({
        code: "mixed_outlier",
        level: "info",
        message: `${minorityTotal} of ${terminators} terminators differ from the dominant ${dominant} — this reads as a few stray edits rather than a convention. Affected line${minorityTotal === 1 ? "" : "s"}: ${minorityLines.join(", ")}${minorityTotal > minorityLines.length ? ", …" : ""}.`,
      });
    }
  }

  if (!isMixed && dominant === "CR") {
    findings.push({
      code: "cr_only",
      level: "warning",
      message:
        "Every terminator is a lone CR (classic Mac OS ≤ 9). Most Unix tools see such a file as a single line.",
    });
  }

  if (scan.totalLines > 0 && !scan.endsWithTerminator) {
    findings.push({
      code: "no_trailing_newline",
      level: "warning",
      message:
        "No newline at end of file. POSIX defines a line as ending in a newline, so the final line is incomplete — this is what Git reports as \\ No newline at end of file.",
    });
  }

  if (bytes.length === 0) {
    findings.push({
      code: "empty",
      level: "info",
      message: "Empty input — there is nothing to have a line ending.",
    });
  }

  if (options.source === "text") {
    findings.push({
      code: "text_input_caveat",
      level: "info",
      message:
        "Counted from the supplied string. If it passed through a browser textarea, CRLF and CR may already have been normalised to LF before this tool saw them — send the file bytes (fileBase64) for a byte-exact verdict.",
    });
  }

  if (options.sampled) {
    findings.push({
      code: "sampled",
      level: "info",
      message: `Only the first ${bytes.length} of ${options.sourceBytes} bytes were scanned; counts describe that window.`,
    });
  }

  if (decodeWarning) {
    findings.push({ code: "decode", level: "warning", message: decodeWarning });
  }

  const result: LineEndingDetectResult = {
    dominant,
    isMixed,
    counts: scan.counts,
    ratios,
    totalLines: scan.totalLines,
    byteSize: bytes.length,
    trailingNewline: scan.endsWithTerminator ? "present" : "absent",
    bom,
    source: options.source,
    sampled: options.sampled,
    sourceBytes: options.sourceBytes,
    minorityLines,
    minorityLinesTruncated: minorityTotal > minorityLines.length,
    findings,
  };
  if (decodeWarning) result.decodeWarning = decodeWarning;
  return result;
}

/** Headline sentence — the same one the human page shows, for text exits. */
export function summarizeLineEndings(result: LineEndingDetectResult): string {
  if (result.dominant === "none") {
    return result.byteSize === 0 ? "Empty input" : "No line terminator found (single line)";
  }
  if (!result.isMixed) return `${styleLabel(result.dominant)} — consistent`;
  const parts: string[] = [];
  if (result.counts.lf > 0) parts.push(`${pct(result.ratios.lf)} LF`);
  if (result.counts.crlf > 0) parts.push(`${pct(result.ratios.crlf)} CRLF`);
  if (result.counts.cr > 0) parts.push(`${pct(result.ratios.cr)} CR`);
  return `MIXED — ${parts.join(", ")}`;
}

/* ── tool definition ───────────────────────────────────────────────────── */

const inputSchema = z
  .object({
    text: z
      .string()
      .max(4_000_000)
      .optional()
      .describe(
        "Text to inspect. Subject to newline normalisation if it came from a browser textarea. Supply exactly one of text or fileBase64.",
      ),
    fileBase64: z
      .string()
      .max(8_000_000)
      .optional()
      .describe(
        "Raw file bytes as base64 (data: URLs accepted). The byte-exact path. Exactly one of text or fileBase64.",
      ),
    filename: z.string().max(512).optional().describe("Informational only; never parsed."),
    sampleBytes: z.coerce
      .number()
      .int()
      .min(16)
      .max(MAX_SAMPLE_BYTES)
      .default(DEFAULT_SAMPLE_BYTES)
      .describe("Detection window: only this many leading bytes are scanned."),
  })
  .refine(
    (val) => {
      const hasText = typeof val.text === "string";
      const hasFile = typeof val.fileBase64 === "string" && val.fileBase64.length > 0;
      return hasText !== hasFile;
    },
    { message: "Provide exactly one of `text` or `fileBase64`." },
  );

type LineEndingDetectInput = z.infer<typeof inputSchema>;

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * The tool declares `runtime: ["server", "client"]`, so the decoder may not be
 * `Buffer` — that name does not exist in a browser, and a tool that claims a
 * runtime it throws in is lying in its own registry entry.
 */
function decodeBase64(b64: string): Uint8Array {
  const payload = b64.includes(",") ? (b64.split(",").pop() ?? b64) : b64;
  const cleaned = payload
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((cleaned.length * 3) / 4));
  let acc = 0;
  let bits = 0;
  let n = 0;
  for (const ch of cleaned) {
    const v = B64_ALPHABET.indexOf(ch);
    if (v < 0) throw new Error(`invalid_base64: unexpected character ${JSON.stringify(ch)}`);
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[n] = (acc >> bits) & 0xff;
      n += 1;
    }
  }
  return out.subarray(0, n);
}

export const lineEndingDetectTool = tool({
  id: "text/line-ending-detect",
  slug: "line-ending-detect",
  category: "text",
  title: { zh: "换行符检测", en: "Line Ending Detector" },
  description: {
    zh: "检测 LF / CRLF / CR：分别计数与占比、主导风格、混用行号、文件末尾换行与 UTF-8 BOM；只检测不改写",
    en: "Detect LF / CRLF / CR with per-style counts and ratios, the dominant style, the stray line numbers, trailing-newline state and UTF-8 BOM — read-only, never rewrites",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.text.line_ending_detect",
  roots: ["detector", "analyzer"],
  engine: {
    name: "forge-line-ending-scan",
    upstream:
      "IEEE Std 1003.1-2017 (POSIX) line/newline definitions · The Unicode Standard 15.0 §5.8 Newline Guidelines · §23.8 + RFC 3629 §6 (UTF-8 BOM) · RFC 3629 §4 (well-formed UTF-8)",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "换行符检测,crlf lf 检测,查看文件换行符,windows unix 换行,行尾符号检测",
    en: "line ending detector, crlf lf detector, detect line endings, check line endings online, mixed line endings",
  },
  inputSchema,
  execute: (input: LineEndingDetectInput): LineEndingDetectResult => {
    const sampleBytes = input.sampleBytes ?? DEFAULT_SAMPLE_BYTES;
    const fromText = typeof input.text === "string";
    const all = fromText
      ? new TextEncoder().encode(input.text as string)
      : decodeBase64(input.fileBase64 as string);
    const sampled = all.length > sampleBytes;
    const window = sampled ? all.subarray(0, sampleBytes) : all;
    return detectLineEndings(window, {
      source: fromText ? "text" : "file",
      sourceBytes: all.length,
      sampled,
    });
  },
});

export const w3LineEndingDetectTools: readonly AnyForgeToolDefinition[] = [lineEndingDetectTool];
