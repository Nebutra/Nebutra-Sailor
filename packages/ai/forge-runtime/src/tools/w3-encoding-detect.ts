/**
 * encoding-detect — charset / BOM / line-ending gate (Detector root).
 *
 * Read-only by design (§6.7.9): this tool answers "what is this", never
 * "rewrite it". Conversion belongs to the Converter root.
 *
 * The probe is structural, anchored on published specs rather than on a
 * bundled frequency corpus:
 *   - BOM signatures (Unicode Standard, byte order mark signatures)
 *   - UTF-8 well-formedness (RFC 3629 + Unicode Table 3-7 — rejects overlongs,
 *     surrogates and > U+10FFFF)
 *   - GB 18030-2022 two-byte and four-byte forms
 *   - Big5 lead/trail ranges
 *   - JIS X 0201 + JIS X 0208 (Shift_JIS) and EUC-JP packing (SS2/SS3)
 *   - KS X 1001 (EUC-KR) lead/trail ranges
 * Plausibility, not just validity, decides the ranking: a candidate is scored
 * by how much of its decoded double-byte traffic lands inside that charset's
 * core ideograph/kana block, so "structurally legal but nonsense" loses to
 * "structurally legal and shaped like real text".
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── constants ─────────────────────────────────────────────────────────── */

/** Below this, byte statistics are not evidence — see the short-input rule. */
const SHORT_INPUT_BYTES = 50;
const SHORT_INPUT_CONFIDENCE_CAP = 60;
const DEFAULT_SAMPLE_BYTES = 262_144;
const MAX_SAMPLE_BYTES = 4_194_304;
/** Share of non-text control bytes above which the input is called binary. */
const BINARY_CONTROL_RATIO = 0.05;
const MAX_CANDIDATES = 8;

export type EncodingName =
  | "ASCII"
  | "UTF-8"
  | "UTF-16LE"
  | "UTF-16BE"
  | "UTF-32LE"
  | "UTF-32BE"
  | "GB18030"
  | "Big5"
  | "Shift_JIS"
  | "EUC-JP"
  | "EUC-KR"
  | "windows-1252"
  | "ISO-8859-1"
  | "binary";

export interface EncodingCandidate {
  encoding: EncodingName;
  confidence: number;
}

export interface EncodingDetectResult {
  primary: {
    encoding: EncodingName;
    confidence: number;
    bomDetected: boolean;
    bomBytes?: string;
  };
  candidates: EncodingCandidate[];
  lineEndings: { lf: number; cr: number; crlf: number; mixed: boolean };
  byteStats: {
    totalBytes: number;
    asciiCount: number;
    highByteCount: number;
    nullByteCount: number;
  };
  languageGuess?: { language: string; confidence: number };
  sampled: boolean;
  /** Full source size in bytes when known; equals totalBytes when not sampled. */
  sourceBytes: number;
  warnings: string[];
  warning?: string;
  /** Set when pasted text looks like UTF-8 bytes already mis-rendered as Latin-1. */
  mojibake?: { suspected: true; recovered: string };
  engine: string;
}

/* ── BOM table ─────────────────────────────────────────────────────────── */

interface BomSpec {
  readonly bytes: readonly number[];
  readonly encoding: EncodingName;
}

/**
 * Order matters: FF FE 00 00 (UTF-32LE) must be tested before FF FE
 * (UTF-16LE), otherwise every UTF-32LE file is misreported as UTF-16LE.
 */
const BOMS: readonly BomSpec[] = [
  { bytes: [0x00, 0x00, 0xfe, 0xff], encoding: "UTF-32BE" },
  { bytes: [0xff, 0xfe, 0x00, 0x00], encoding: "UTF-32LE" },
  { bytes: [0xef, 0xbb, 0xbf], encoding: "UTF-8" },
  { bytes: [0xfe, 0xff], encoding: "UTF-16BE" },
  { bytes: [0xff, 0xfe], encoding: "UTF-16LE" },
];

function matchBom(bytes: Uint8Array): { spec: BomSpec; hex: string } | null {
  for (const spec of BOMS) {
    if (bytes.length < spec.bytes.length) continue;
    let hit = true;
    for (let i = 0; i < spec.bytes.length; i += 1) {
      if (bytes[i] !== spec.bytes[i]) {
        hit = false;
        break;
      }
    }
    if (hit) {
      const hex = spec.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
      return { spec, hex };
    }
  }
  return null;
}

/* ── structural scanners ───────────────────────────────────────────────── */

interface Scan {
  /** false ⇒ the byte stream cannot be this charset at all. */
  valid: boolean;
  /** multi-byte units successfully consumed. */
  units: number;
  /**
   * Weighted plausibility: 1.0 per unit inside the charset's *frequent* block
   * (level-1 hanzi / kana / precomposed hangul), 0.5 inside its rare block,
   * 0 elsewhere. Real text lives in the frequent block; a byte stream that is
   * merely structurally legal does not.
   */
  core: number;
  /**
   * True when the scan saw a byte pattern that only this charset family uses —
   * kana rows, precomposed hangul rows, the GB18030 four-byte form. This is
   * what separates candidates whose byte ranges genuinely overlap (Big5 and
   * EUC-JP share most of the A1..FE plane), without a frequency corpus.
   */
  signal: boolean;
}

const INVALID: Scan = { valid: false, units: 0, core: 0, signal: false };

/**
 * RFC 3629 + Unicode Table 3-7 (well-formed UTF-8 byte sequences).
 *
 * `tail` says the byte array is a *window* onto a longer source. A window ends
 * wherever the sample cap fell, which for any CJK-dense file is two times out
 * of three in the middle of a multi-byte sequence. Calling that malformed drops
 * UTF-8 out of the candidate list entirely and hands the verdict to GB18030 —
 * the exact question this tool exists to answer, answered backwards. So a
 * sequence that runs off the end of a sample stops the scan; it never fails it.
 */
function scanUtf8(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  const n = b.length;
  const cont = (x: number | undefined, lo: number, hi: number) =>
    x !== undefined && x >= lo && x <= hi;
  while (i < n) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    // Width is fixed by the lead byte, so "ran out of window" is knowable
    // before any continuation byte is inspected.
    const width = c >= 0xf0 ? 4 : c >= 0xe0 ? 3 : 2;
    if (tail && i + width > n) break;
    if (c >= 0xc2 && c <= 0xdf) {
      if (!cont(b[i + 1], 0x80, 0xbf)) return INVALID;
      i += 2;
    } else if (c === 0xe0) {
      if (!cont(b[i + 1], 0xa0, 0xbf) || !cont(b[i + 2], 0x80, 0xbf)) return INVALID;
      i += 3;
    } else if (c === 0xed) {
      // 0xED A0..BF would encode a UTF-16 surrogate — not well-formed UTF-8.
      if (!cont(b[i + 1], 0x80, 0x9f) || !cont(b[i + 2], 0x80, 0xbf)) return INVALID;
      i += 3;
    } else if ((c >= 0xe1 && c <= 0xec) || c === 0xee || c === 0xef) {
      if (!cont(b[i + 1], 0x80, 0xbf) || !cont(b[i + 2], 0x80, 0xbf)) return INVALID;
      i += 3;
    } else if (c === 0xf0) {
      if (
        !cont(b[i + 1], 0x90, 0xbf) ||
        !cont(b[i + 2], 0x80, 0xbf) ||
        !cont(b[i + 3], 0x80, 0xbf)
      ) {
        return INVALID;
      }
      i += 4;
    } else if (c >= 0xf1 && c <= 0xf3) {
      if (
        !cont(b[i + 1], 0x80, 0xbf) ||
        !cont(b[i + 2], 0x80, 0xbf) ||
        !cont(b[i + 3], 0x80, 0xbf)
      ) {
        return INVALID;
      }
      i += 4;
    } else if (c === 0xf4) {
      // 0xF4 90.. would exceed U+10FFFF.
      if (
        !cont(b[i + 1], 0x80, 0x8f) ||
        !cont(b[i + 2], 0x80, 0xbf) ||
        !cont(b[i + 3], 0x80, 0xbf)
      ) {
        return INVALID;
      }
      i += 4;
    } else {
      // 0x80..0xC1 as a lead (bare continuation / overlong), 0xF5..0xFF.
      return INVALID;
    }
    units += 1;
    core += 1;
  }
  return { valid: true, units, core, signal: units > 0 };
}

/** GB 18030-2022: two-byte form plus the four-byte (b2/b4 in 0x30..0x39) form. */
function scanGb18030(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  let signal = false;
  while (i < b.length) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    if (c === 0x80 || c === 0xff) return INVALID;
    const b2 = b[i + 1];
    if (b2 === undefined) {
      if (tail) break;
      return INVALID;
    }
    if (b2 >= 0x30 && b2 <= 0x39) {
      const b3 = b[i + 2];
      const b4 = b[i + 3];
      if (b3 === undefined || b4 === undefined) {
        if (tail) break;
        return INVALID;
      }
      if (b3 < 0x81 || b3 > 0xfe || b4 < 0x30 || b4 > 0x39) return INVALID;
      i += 4;
      units += 1;
      // The four-byte form exists in no other charset — a decisive tell.
      signal = true;
      continue;
    }
    if (b2 < 0x40 || b2 > 0xfe || b2 === 0x7f) return INVALID;
    // Trails 0x80..0xA0 are the GBK extension — Big5 forbids them entirely.
    if (b2 >= 0x80 && b2 <= 0xa0) signal = true;
    if (b2 >= 0xa1 && b2 <= 0xfe) {
      // GB 2312 level-1 (frequent) hanzi B0..D7, level-2 (rare) D8..F7.
      if (c >= 0xb0 && c <= 0xd7) core += 1;
      else if (c >= 0xd8 && c <= 0xf7) core += 0.5;
    }
    i += 2;
    units += 1;
  }
  return { valid: true, units, core, signal };
}

/** Big5: lead 0x81..0xFE, trail 0x40..0x7E or 0xA1..0xFE. */
function scanBig5(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  while (i < b.length) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    if (c < 0x81 || c > 0xfe) return INVALID;
    const b2 = b[i + 1];
    if (b2 === undefined) {
      if (tail) break;
      return INVALID;
    }
    const trailOk = (b2 >= 0x40 && b2 <= 0x7e) || (b2 >= 0xa1 && b2 <= 0xfe);
    if (!trailOk) return INVALID;
    // Level-1 (frequent, A440..C67E) vs level-2 (rare, C940..F9D5) hanzi leads.
    if (c >= 0xa4 && c <= 0xc6) core += 1;
    else if (c >= 0xc9 && c <= 0xf9) core += 0.5;
    i += 2;
    units += 1;
  }
  // Big5 has no byte pattern the other CJK charsets cannot also produce.
  return { valid: true, units, core, signal: false };
}

/** Shift_JIS: JIS X 0201 singles (incl. half-width katakana) + JIS X 0208 pairs. */
function scanShiftJis(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  let signal = false;
  while (i < b.length) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    if (c >= 0xa1 && c <= 0xdf) {
      // Half-width katakana. Structurally legal but *weak* evidence: this
      // single-byte range swallows any high-byte run, so scoring it highly
      // would make Shift_JIS win on GBK, Big5, EUC-JP and EUC-KR text alike.
      // Real Japanese is never dominated by half-width katakana.
      i += 1;
      units += 1;
      core += 0.2;
      continue;
    }
    const leadOk = (c >= 0x81 && c <= 0x9f) || (c >= 0xe0 && c <= 0xfc);
    if (!leadOk) return INVALID;
    const b2 = b[i + 1];
    if (b2 === undefined) {
      if (tail) break;
      return INVALID;
    }
    const trailOk = (b2 >= 0x40 && b2 <= 0x7e) || (b2 >= 0x80 && b2 <= 0xfc);
    if (!trailOk) return INVALID;
    if (c >= 0x82 && c <= 0x83) {
      // Kana rows — phonetic, script-exclusive, and near-universal in Japanese.
      core += 1;
      signal = true;
    } else if (c >= 0x88 && c <= 0x9f) {
      core += 1; // JIS X 0208 level-1 kanji.
    } else if (c >= 0xe0 && c <= 0xea) {
      core += 0.5; // level-2 kanji.
    }
    i += 2;
    units += 1;
  }
  return { valid: true, units, core, signal };
}

/** EUC-JP: SS2 (0x8E) half-width katakana, SS3 (0x8F) JIS X 0212, A1..FE pairs. */
function scanEucJp(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  let signal = false;
  while (i < b.length) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    if (c === 0x8e) {
      const b2 = b[i + 1];
      if (b2 === undefined) {
        if (tail) break;
        return INVALID;
      }
      if (b2 < 0xa1 || b2 > 0xdf) return INVALID;
      i += 2;
      units += 1;
      core += 1;
      signal = true; // SS2 half-width katakana.
      continue;
    }
    if (c === 0x8f) {
      const b2 = b[i + 1];
      const b3 = b[i + 2];
      if (b2 === undefined || b3 === undefined) {
        if (tail) break;
        return INVALID;
      }
      if (b2 < 0xa1 || b2 > 0xfe || b3 < 0xa1 || b3 > 0xfe) return INVALID;
      i += 3;
      units += 1;
      continue;
    }
    if (c < 0xa1 || c > 0xfe) return INVALID;
    const b2 = b[i + 1];
    if (b2 === undefined) {
      if (tail) break;
      return INVALID;
    }
    if (b2 < 0xa1 || b2 > 0xfe) return INVALID;
    if (c === 0xa4 || c === 0xa5) {
      core += 1; // Hiragana / katakana rows — script-exclusive.
      signal = true;
    } else if (c >= 0xb0 && c <= 0xcf) {
      core += 1; // JIS X 0208 level-1 kanji.
    } else if (c >= 0xd0 && c <= 0xf4) {
      core += 0.5; // level-2 kanji.
    }
    i += 2;
    units += 1;
  }
  return { valid: true, units, core, signal };
}

/** EUC-KR (KS X 1001): lead 0xA1..0xFE, trail 0xA1..0xFE. */
function scanEucKr(b: Uint8Array, tail = false): Scan {
  let i = 0;
  let units = 0;
  let core = 0;
  let signal = false;
  while (i < b.length) {
    const c = b[i] as number;
    if (c < 0x80) {
      i += 1;
      continue;
    }
    if (c < 0xa1 || c > 0xfe) return INVALID;
    const b2 = b[i + 1];
    if (b2 === undefined) {
      if (tail) break;
      return INVALID;
    }
    if (b2 < 0xa1 || b2 > 0xfe) return INVALID;
    if (c >= 0xb0 && c <= 0xc8) {
      core += 1; // Precomposed hangul syllable rows — script-exclusive.
      signal = true;
    } else {
      core += 0.3; // Symbol rows and the hanja block: legal, weak evidence.
    }
    i += 2;
    units += 1;
  }
  return { valid: true, units, core, signal };
}

/* ── UTF-16 without a BOM ──────────────────────────────────────────────── */

function scanUtf16NoBom(
  b: Uint8Array,
): { encoding: "UTF-16LE" | "UTF-16BE"; score: number } | null {
  if (b.length < 4 || b.length % 2 !== 0) return null;
  let nulls = 0;
  let evenNulls = 0;
  let oddNulls = 0;
  for (let i = 0; i < b.length; i += 1) {
    if (b[i] === 0x00) {
      nulls += 1;
      if (i % 2 === 0) evenNulls += 1;
      else oddNulls += 1;
    }
  }
  const ratio = nulls / b.length;
  if (ratio < 0.2) return null;
  const score = Math.min(95, Math.round(60 + 70 * ratio));
  if (oddNulls >= nulls * 0.9) return { encoding: "UTF-16LE", score };
  if (evenNulls >= nulls * 0.9) return { encoding: "UTF-16BE", score };
  return null;
}

/* ── line endings + byte stats ─────────────────────────────────────────── */

interface LineEndings {
  lf: number;
  cr: number;
  crlf: number;
  mixed: boolean;
}

/**
 * Counted over *code units*, not raw bytes: in UTF-16 a CRLF is 0D 00 0A 00,
 * so a byte-level scan would see a lone CR followed by a lone LF and report
 * every UTF-16 file as having mixed line endings.
 */
function countLineEndings(units: ArrayLike<number>): LineEndings {
  let lfTotal = 0;
  let crTotal = 0;
  let crlf = 0;
  for (let i = 0; i < units.length; i += 1) {
    const c = units[i];
    if (c === 0x0a) {
      lfTotal += 1;
      if (i > 0 && units[i - 1] === 0x0d) crlf += 1;
    } else if (c === 0x0d) {
      crTotal += 1;
    }
  }
  const lf = lfTotal - crlf;
  const cr = crTotal - crlf;
  const present = [lf, cr, crlf].filter((n) => n > 0).length;
  return { lf, cr, crlf, mixed: present >= 2 };
}

/** Regroups bytes into the code units of a fixed-width encoding. */
function codeUnits(b: Uint8Array, encoding: EncodingName): ArrayLike<number> {
  const width = encoding === "UTF-16LE" || encoding === "UTF-16BE" ? 2 : 4;
  if (
    encoding !== "UTF-16LE" &&
    encoding !== "UTF-16BE" &&
    encoding !== "UTF-32LE" &&
    encoding !== "UTF-32BE"
  ) {
    return b;
  }
  const little = encoding === "UTF-16LE" || encoding === "UTF-32LE";
  const out = new Uint32Array(Math.floor(b.length / width));
  for (let u = 0; u < out.length; u += 1) {
    let value = 0;
    for (let k = 0; k < width; k += 1) {
      const byte = b[u * width + (little ? width - 1 - k : k)] as number;
      value = value * 256 + byte;
    }
    out[u] = value;
  }
  return out;
}

function lineEndingsFor(b: Uint8Array, encoding: EncodingName): LineEndings {
  return countLineEndings(codeUnits(b, encoding));
}

function byteStats(b: Uint8Array) {
  let ascii = 0;
  let high = 0;
  let nul = 0;
  let control = 0;
  for (let i = 0; i < b.length; i += 1) {
    const c = b[i] as number;
    if (c >= 0x80) high += 1;
    else ascii += 1;
    if (c === 0x00) nul += 1;
    if ((c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) || c === 0x7f) control += 1;
  }
  return {
    totalBytes: b.length,
    asciiCount: ascii,
    highByteCount: high,
    nullByteCount: nul,
    control,
  };
}

/* ── language guess (script-based, best effort) ────────────────────────── */

const SCRIPT_BY_CHARSET: Partial<Record<EncodingName, string>> = {
  GB18030: "zh",
  Big5: "zh",
  Shift_JIS: "ja",
  "EUC-JP": "ja",
  "EUC-KR": "ko",
};

function guessLanguageFromText(text: string): { language: string; confidence: number } | undefined {
  let han = 0;
  let kana = 0;
  let hangul = 0;
  let cyrillic = 0;
  let arabic = 0;
  let latin = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp >= 0x4e00 && cp <= 0x9fff) han += 1;
    else if ((cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0xff66 && cp <= 0xff9d)) kana += 1;
    else if ((cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0x1100 && cp <= 0x11ff)) hangul += 1;
    else if (cp >= 0x0400 && cp <= 0x04ff) cyrillic += 1;
    else if (cp >= 0x0600 && cp <= 0x06ff) arabic += 1;
    else if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) latin += 1;
  }
  const total = han + kana + hangul + cyrillic + arabic + latin;
  if (total === 0) return undefined;
  // Kana is decisive for Japanese even when Han dominates the character count.
  if (kana > 0)
    return { language: "ja", confidence: Math.min(95, Math.round((100 * (kana + han)) / total)) };
  const pairs: Array<[string, number]> = [
    ["zh", han],
    ["ko", hangul],
    ["ru", cyrillic],
    ["ar", arabic],
    ["en", latin],
  ];
  pairs.sort((a, b) => b[1] - a[1]);
  const top = pairs[0] as [string, number];
  if (top[1] === 0) return undefined;
  return { language: top[0], confidence: Math.min(95, Math.round((100 * top[1]) / total)) };
}

function decodeUtf16(b: Uint8Array, little: boolean): string {
  let out = "";
  for (let i = 0; i + 1 < b.length; i += 2) {
    const lo = b[i] as number;
    const hi = b[i + 1] as number;
    out += String.fromCharCode(little ? lo | (hi << 8) : hi | (lo << 8));
  }
  return out;
}

/* ── the detector ──────────────────────────────────────────────────────── */

function push(list: EncodingCandidate[], encoding: EncodingName, score: number) {
  if (score <= 0) return;
  list.push({ encoding, confidence: Math.max(1, Math.min(100, Math.round(score))) });
}

export interface DetectOptions {
  /** Full byte length of the source when `bytes` is only a prefix. */
  sourceBytes?: number;
  /** True when the caller pasted an already-decoded string. */
  fromText?: boolean;
  /** The original pasted string, used only for the mojibake check. */
  originalText?: string;
}

const ENGINE_ID = "charset-structure-probe";

export function detectEncoding(bytes: Uint8Array, opts: DetectOptions = {}): EncodingDetectResult {
  const stats = byteStats(bytes);
  // Byte-level default; the fixed-width encodings recount over code units once
  // the verdict is known.
  const lineEndings = countLineEndings(bytes);
  const sourceBytes = opts.sourceBytes ?? bytes.length;
  const sampled = sourceBytes > bytes.length;
  const warnings: string[] = [];
  const candidates: EncodingCandidate[] = [];

  const bom = matchBom(bytes);
  if (bom) {
    const bomLineEndings = lineEndingsFor(bytes, bom.spec.encoding);
    // Know-how #1: a BOM is unambiguous. Report it and skip the guessing.
    const result: EncodingDetectResult = {
      primary: {
        encoding: bom.spec.encoding,
        confidence: 100,
        bomDetected: true,
        bomBytes: bom.hex,
      },
      candidates: [{ encoding: bom.spec.encoding, confidence: 100 }],
      lineEndings: bomLineEndings,
      byteStats: {
        totalBytes: stats.totalBytes,
        asciiCount: stats.asciiCount,
        highByteCount: stats.highByteCount,
        nullByteCount: stats.nullByteCount,
      },
      sampled,
      sourceBytes,
      warnings,
      engine: ENGINE_ID,
    };
    if (bom.spec.encoding === "UTF-8") {
      warnings.push(
        "UTF-8 BOM present — it is not part of the text and breaks shell shebangs, JSON and YAML parsers.",
      );
    }
    const body =
      bom.spec.encoding === "UTF-8"
        ? new TextDecoder("utf-8").decode(bytes.subarray(3))
        : bom.spec.encoding === "UTF-16LE"
          ? decodeUtf16(bytes.subarray(2), true)
          : bom.spec.encoding === "UTF-16BE"
            ? decodeUtf16(bytes.subarray(2), false)
            : "";
    const lang = body ? guessLanguageFromText(body) : undefined;
    if (lang) result.languageGuess = lang;
    warnMixedLineEndings(bomLineEndings, warnings);
    if (warnings.length > 0) result.warning = warnings.join(" ");
    return result;
  }

  if (bytes.length === 0) {
    return {
      primary: { encoding: "ASCII", confidence: 0, bomDetected: false },
      candidates: [],
      lineEndings,
      byteStats: {
        totalBytes: 0,
        asciiCount: 0,
        highByteCount: 0,
        nullByteCount: 0,
      },
      sampled: false,
      sourceBytes,
      warnings: ["Empty input — nothing to detect."],
      warning: "Empty input — nothing to detect.",
      engine: ENGINE_ID,
    };
  }

  const utf16 = scanUtf16NoBom(bytes);

  // Know-how #2: pure ASCII is simultaneously valid UTF-8, ISO-8859-1 and
  // windows-1252. Say so instead of over-reporting UTF-8.
  if (stats.highByteCount === 0 && stats.control === 0) {
    push(candidates, "ASCII", 100);
    push(candidates, "UTF-8", 100);
    push(candidates, "ISO-8859-1", 100);
    push(candidates, "windows-1252", 100);
    warnings.push(
      "All bytes are below 0x80: this is ASCII, which is also valid UTF-8, ISO-8859-1 and windows-1252 — the intended charset is not recoverable from the bytes.",
    );
    const text = new TextDecoder("utf-8").decode(bytes);
    const result: EncodingDetectResult = {
      primary: { encoding: "ASCII", confidence: 100, bomDetected: false },
      candidates,
      lineEndings,
      byteStats: {
        totalBytes: stats.totalBytes,
        asciiCount: stats.asciiCount,
        highByteCount: stats.highByteCount,
        nullByteCount: stats.nullByteCount,
      },
      sampled,
      sourceBytes,
      warnings,
      warning: warnings.join(" "),
      engine: ENGINE_ID,
    };
    const lang = guessLanguageFromText(text);
    if (lang) result.languageGuess = lang;
    warnMixedLineEndings(lineEndings, warnings);
    result.warning = warnings.join(" ");
    applyShortInputCap(result, warnings);
    return result;
  }

  if (utf16) push(candidates, utf16.encoding, utf16.score);

  if (stats.highByteCount === 0) {
    // Every byte is ASCII, but a control byte kept it out of the clean branch
    // above. ASCII is still the right answer; the control byte is a warning.
    push(candidates, "ASCII", 90);
    push(candidates, "UTF-8", 90);
  }

  const utf8 = scanUtf8(bytes, sampled);
  if (utf8.valid && utf8.units > 0) {
    // Multi-byte UTF-8 is self-synchronising: legacy bytes almost never form a
    // valid sequence by accident, so validity here is strong evidence.
    push(candidates, "UTF-8", 80 + 15 * Math.min(1, utf8.units / 4));
  }

  // Every scanner gets the same courtesy: a sequence cut by the sample cap is
  // the window's fault, not the file's, so no charset is disqualified for it.
  const legacy: Array<[EncodingName, Scan]> = [
    ["GB18030", scanGb18030(bytes, sampled)],
    ["Big5", scanBig5(bytes, sampled)],
    ["Shift_JIS", scanShiftJis(bytes, sampled)],
    ["EUC-JP", scanEucJp(bytes, sampled)],
    ["EUC-KR", scanEucKr(bytes, sampled)],
  ];
  for (const [name, scan] of legacy) {
    if (!scan.valid || scan.units === 0) continue;
    const coreRatio = Math.min(1, scan.core / scan.units);
    // 55 for "structurally legal", +30 for "shaped like real text in this
    // charset", +10 for a script-exclusive byte pattern, all scaled down when
    // there is barely any multi-byte evidence to go on.
    const evidence = Math.min(1, scan.units / 4);
    const score = (55 + 30 * coreRatio + (scan.signal ? 10 : 0)) * (0.6 + 0.4 * evidence);
    push(candidates, name, score);
  }

  // Single-byte fallbacks are structurally valid for almost anything, so they
  // only win when nothing multi-byte fits.
  const c1Controls = countC1(bytes);
  const undefined1252 = countUndefined1252(bytes);
  push(candidates, "ISO-8859-1", c1Controls > 0 ? 25 : 40);
  push(candidates, "windows-1252", undefined1252 > 0 ? 22 : 45);

  candidates.sort((a, b) => b.confidence - a.confidence || a.encoding.localeCompare(b.encoding));
  const ranked = candidates.slice(0, MAX_CANDIDATES);

  const controlRatio = stats.control / stats.totalBytes;
  const utf16Wins = utf16 !== null && ranked[0]?.encoding === utf16.encoding;
  const binary = !utf16Wins && controlRatio > BINARY_CONTROL_RATIO;

  let primaryEncoding: EncodingName = ranked[0]?.encoding ?? "windows-1252";
  let primaryConfidence = ranked[0]?.confidence ?? 20;

  if (binary) {
    warnings.push(
      "Binary content suspected — this does not look like text; the charset ranking below is not trustworthy.",
    );
    primaryEncoding = "binary";
    primaryConfidence = Math.min(99, Math.round(50 + controlRatio * 100));
  } else if (stats.nullByteCount > 0 && !utf16Wins) {
    warnings.push("NUL bytes present outside a UTF-16 pattern — the input may be binary.");
  }

  const result: EncodingDetectResult = {
    primary: { encoding: primaryEncoding, confidence: primaryConfidence, bomDetected: false },
    candidates: ranked,
    lineEndings: lineEndingsFor(bytes, primaryEncoding),
    byteStats: {
      totalBytes: stats.totalBytes,
      asciiCount: stats.asciiCount,
      highByteCount: stats.highByteCount,
      nullByteCount: stats.nullByteCount,
    },
    sampled,
    sourceBytes,
    warnings,
    engine: ENGINE_ID,
  };

  if (!binary) {
    const lang = languageFor(primaryEncoding, bytes, primaryConfidence);
    if (lang) result.languageGuess = lang;
  }

  warnMixedLineEndings(result.lineEndings, warnings);

  if (opts.fromText && opts.originalText) {
    const moji = detectMojibake(opts.originalText);
    if (moji) {
      result.mojibake = moji;
      warnings.push(
        "Mojibake suspected: the pasted characters look like UTF-8 bytes that were rendered as Latin-1/windows-1252.",
      );
    }
  }

  applyShortInputCap(result, warnings);
  if (warnings.length > 0) result.warning = warnings.join(" ");
  return result;
}

function countC1(b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < b.length; i += 1) {
    const c = b[i] as number;
    if (c >= 0x80 && c <= 0x9f) n += 1;
  }
  return n;
}

/** windows-1252 leaves 0x81, 0x8D, 0x8F, 0x90 and 0x9D undefined. */
function countUndefined1252(b: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < b.length; i += 1) {
    const c = b[i] as number;
    if (c === 0x81 || c === 0x8d || c === 0x8f || c === 0x90 || c === 0x9d) n += 1;
  }
  return n;
}

function languageFor(
  encoding: EncodingName,
  bytes: Uint8Array,
  confidence: number,
): { language: string; confidence: number } | undefined {
  const implied = SCRIPT_BY_CHARSET[encoding];
  if (implied) return { language: implied, confidence: Math.min(confidence, 90) };
  if (encoding === "UTF-8" || encoding === "ASCII") {
    return guessLanguageFromText(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
  }
  if (encoding === "UTF-16LE") return guessLanguageFromText(decodeUtf16(bytes, true));
  if (encoding === "UTF-16BE") return guessLanguageFromText(decodeUtf16(bytes, false));
  return undefined;
}

/**
 * Know-how from §1: "this renders as mojibake". If every code point fits in a
 * byte and re-reading those bytes as UTF-8 yields well-formed multi-byte text,
 * the string is almost certainly UTF-8 that was decoded as Latin-1.
 */
function detectMojibake(text: string): { suspected: true; recovered: string } | undefined {
  if (text.length === 0) return undefined;
  const bytes = new Uint8Array(text.length);
  let high = 0;
  for (let i = 0; i < text.length; i += 1) {
    const cp = text.charCodeAt(i);
    if (cp > 0xff) return undefined;
    if (cp >= 0x80) high += 1;
    bytes[i] = cp;
  }
  if (high === 0) return undefined;
  const scan = scanUtf8(bytes);
  if (!scan.valid || scan.units === 0) return undefined;
  const recovered = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (recovered === text) return undefined;
  return { suspected: true, recovered };
}

/** Know-how #4: mixed line endings are themselves a diagnosis, not a footnote. */
function warnMixedLineEndings(le: LineEndings, warnings: string[]) {
  if (!le.mixed) return;
  warnings.push(
    `Mixed line endings (LF ${le.lf}, CR ${le.cr}, CRLF ${le.crlf}) — usually a bad merge or a tooling mismatch.`,
  );
}

/** monocalc's own caveat, honoured: short samples do not earn high confidence. */
function applyShortInputCap(result: EncodingDetectResult, warnings: string[]) {
  if (result.byteStats.totalBytes >= SHORT_INPUT_BYTES) return;
  if (result.primary.bomDetected) return;
  result.primary.confidence = Math.min(result.primary.confidence, SHORT_INPUT_CONFIDENCE_CAP);
  result.candidates = result.candidates.map((c) => ({
    encoding: c.encoding,
    confidence: Math.min(c.confidence, SHORT_INPUT_CONFIDENCE_CAP),
  }));
  warnings.push(
    `Short input (${result.byteStats.totalBytes} bytes) — under ${SHORT_INPUT_BYTES} bytes the result may be unreliable, so confidence is capped.`,
  );
  result.warning = warnings.join(" ");
}

/* ── tool definition ───────────────────────────────────────────────────── */

const inputSchema = z
  .object({
    text: z
      .string()
      .max(4_000_000)
      .optional()
      .describe("Text to inspect. Supply exactly one of text or fileBase64."),
    fileBase64: z
      .string()
      .max(8_000_000)
      .optional()
      .describe(
        "Raw file bytes as base64 (data: URLs accepted). Exactly one of text or fileBase64.",
      ),
    filename: z.string().max(512).optional().describe("Informational only; never parsed."),
    sampleBytes: z.coerce
      .number()
      .int()
      .min(16)
      .max(MAX_SAMPLE_BYTES)
      .default(DEFAULT_SAMPLE_BYTES)
      .describe("Detection window: only this many leading bytes are analysed."),
  })
  .refine(
    (val) => {
      const hasText = typeof val.text === "string" && val.text.length > 0;
      const hasFile = typeof val.fileBase64 === "string" && val.fileBase64.length > 0;
      return hasText !== hasFile;
    },
    { message: "Provide exactly one of `text` or `fileBase64`." },
  );

type EncodingDetectInput = z.infer<typeof inputSchema>;

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

export const encodingDetectTool = tool({
  id: "text/encoding-detect",
  slug: "encoding-detect",
  category: "text",
  title: { zh: "文件编码检测", en: "Text Encoding Detector" },
  description: {
    zh: "检测字符编码、BOM、换行符与字节统计；只判断不改写，给出带置信度的候选排名",
    en: "Detect charset, BOM, line endings and byte stats — read-only, with a ranked confidence list instead of a single guess",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server", "client"],
  meterId: "forge.text.encoding_detect",
  roots: ["detector", "analyzer"],
  engine: {
    name: ENGINE_ID,
    upstream:
      "RFC 3629 + Unicode Table 3-7 (well-formed UTF-8) · Unicode byte order mark signatures · GB 18030-2022 · Big5 · JIS X 0201/0208 (Shift_JIS, EUC-JP) · KS X 1001 (EUC-KR)",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "文件编码检测,编码识别,字符集检测,BOM检测,乱码识别,GBK还是UTF-8",
    en: "text encoding detector, character encoding checker, charset detect online, BOM detector, detect file encoding",
  },
  inputSchema,
  execute: (input: EncodingDetectInput) => {
    const sampleBytes = input.sampleBytes ?? DEFAULT_SAMPLE_BYTES;
    let all: Uint8Array;
    let fromText = false;
    if (typeof input.text === "string" && input.text.length > 0) {
      all = new TextEncoder().encode(input.text);
      fromText = true;
    } else {
      all = decodeBase64(input.fileBase64 as string);
    }
    const window = all.length > sampleBytes ? all.subarray(0, sampleBytes) : all;
    const opts: DetectOptions = { sourceBytes: all.length, fromText };
    if (fromText) opts.originalText = input.text as string;
    return detectEncoding(window, opts);
  },
});

export const w3EncodingDetectTools: readonly AnyForgeToolDefinition[] = [encodingDetectTool];
