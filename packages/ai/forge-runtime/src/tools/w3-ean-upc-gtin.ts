/**
 * ean-upc-gtin — GS1 standard check digit, calculated and validated in bulk
 * (Verifier root, docs/plans/tools/ean-upc-gtin.md).
 *
 * One computation covers the whole family. The GS1 standard check digit is a
 * single mod-10 rule applied to a right-aligned digit string, so GTIN-8,
 * UPC-A (GTIN-12), EAN-13 (GTIN-13), GTIN-14, SSCC-18 and GLN-13 are the same
 * arithmetic over different lengths — which is why GS1 US's own calculator and
 * Morovia's both put them on one page (brief §7.9). This tool follows that
 * scope decision rather than shipping GTIN-only.
 *
 * What the brief demands beyond a naive clone:
 *  1. **Two verbs, not one.** Every one of the nine competitors researched is
 *     Calculate-only (§6). `operation: "calculate"` appends the check digit to
 *     an incomplete code; `operation: "validate"` accepts a complete code and
 *     confirms or rejects it, returning the *expected* digit and the corrected
 *     code so a typo is actionable rather than merely reported (§7.6).
 *  2. **Weights run from the right, never from the left.** The 3/1 alternation
 *     is anchored at the rightmost payload digit, so the weight the *leading*
 *     digit receives flips with the payload's length parity. Indexing from the
 *     left with a fixed parity is the most common naive-implementation bug
 *     (§7.2), and it is a quiet one: four of this family's five payload lengths
 *     are odd (7, 11, 13, 17), where left-anchoring coincides with the standard.
 *     It diverges only on the 12-digit EAN-13/GLN-13 payload — the most common
 *     barcode there is.
 *  3. **Valid ≠ registered.** The checksum proves the number is well formed; it
 *     says nothing about whether GS1 ever assigned it. Stated in the output
 *     itself (`note`), not only in page copy (§7.3).
 *  4. **Bulk keeps line order and per-line addressability.** Results come back
 *     in input order, each carrying its 0-based `index`, so a 5,000-row catalog
 *     import can be joined straight back onto its source rows (§7.5).
 *  5. **GLN-13 and EAN-13 are the same length.** Length alone cannot separate
 *     them, and it must not pretend to: a 13-digit code is reported as EAN-13
 *     with `GLN-13` offered in `alternateTypes` — a relabel, not a second
 *     silently computed result, because the arithmetic is identical and only
 *     the semantics differ (§9.6). `type` forces the label when the caller
 *     knows which register the number came from.
 *  6. **978/979 are the Bookland prefixes**, so for those the alternate reading
 *     is ISBN-13 rather than GLN-13. ISBN-13 is mathematically an EAN-13; the
 *     mod-11 ISBN-10 algorithm (with its `X` check character) is a different
 *     computation and is deliberately out of scope (§7.4, §9.4).
 *  7. **Separators are a UX problem, not a math problem** (§7.8). Spaces,
 *     hyphens, dots and underscores are stripped and the strip is reported;
 *     anything else non-digit is a rejection with a stable reason code rather
 *     than a silently mangled number.
 *  8. **Calculate mode warns when its payload is itself a complete length.**
 *     A 12- or 13-digit payload is a legitimate UPC-A or EAN-13, so a user who
 *     pastes complete codes into calculate mode gets a warning instead of a
 *     confidently wrong 13th/14th digit.
 *
 * Deliberately out of scope (brief §9.4): Bill of Lading (BLN) — bundled by
 * GS1 US and Morovia on the same page, but its algorithm was not verified
 * against a primary source, and an unverified algorithm sharing this code path
 * would be a guess wearing a checkmark (§7.10). UPC-E is a zero-suppression
 * *conversion*, not a checksum (§7.11). ISBN-10's mod-11 is a different
 * algorithm. Product-database / GEPIR assignment lookup is a different product.
 *
 * Spec implemented: GS1 General Specifications — standard check digit
 * calculation for GS1 data structures (mod 10, alternating 3/1 weighting from
 * the rightmost payload position), applied to GTIN-8/12/13/14, SSCC and GLN.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── result shape (the §9.6 I/O contract) ──────────────────────────────── */

export type BarcodeType = "GTIN-8" | "UPC-A" | "EAN-13" | "GTIN-14" | "SSCC-18" | "GLN-13";
export type AlternateType = "GLN-13" | "EAN-13" | "ISBN-13";
export type DetectedType = BarcodeType | "unrecognized-length";
export type CheckVerdict = "valid" | "invalid" | "calculated" | "unrecognized-length";
export type CheckOperation = "validate" | "calculate";
/** "auto" detects by length; anything else forces the label and the length. */
export type ForcedType = BarcodeType | "auto";

/** Stable reason codes (ship gate §6.5 #7) — these are contract, not prose. */
export type CheckReason =
  | "empty"
  | "non-digit-characters"
  | "unsupported-length"
  | "length-mismatch"
  | "check-digit-mismatch";

/** Stable advisory codes. Advisories never change a verdict. */
export type CheckWarning = "separators-stripped" | "all-zero" | "payload-is-also-a-complete-code";

export interface CodeCheckResult {
  /** 0-based position in `codes` — bulk stays joinable to its source rows (§7.5). */
  index: number;
  /** Exactly as supplied, so the caller can echo the user's own text back. */
  input: string;
  /** Digits only, after separators were stripped. Absent when nothing parsed. */
  normalized?: string;
  detectedType: DetectedType;
  /** Same digits, other register (§9.6). Never a second computation. */
  alternateTypes?: AlternateType[];
  verdict: CheckVerdict;
  /** The digit the standard requires — present for both verbs when computable. */
  checkDigit?: number;
  /** Complete code carrying the correct check digit; the fix, not just the fault. */
  correctedCode?: string;
  /** GTIN family right-aligned in a 14-digit field, the GS1 storage form (§7.1). */
  gtin14?: string;
  reason?: CheckReason;
  warnings?: CheckWarning[];
}

export interface CheckSummary {
  total: number;
  valid: number;
  invalid: number;
  calculated: number;
  unrecognized: number;
}

export interface EanUpcGtinResult {
  operation: CheckOperation;
  results: CodeCheckResult[];
  summary: CheckSummary;
  /** The honest scope statement, travelling with the data (§7.3). */
  note: string;
}

/* ── the standard check digit ──────────────────────────────────────────── */

/** Complete lengths this tool recognises, and the label each length carries. */
const LENGTH_TO_TYPE: Readonly<Record<number, BarcodeType>> = {
  8: "GTIN-8",
  12: "UPC-A",
  13: "EAN-13",
  14: "GTIN-14",
  18: "SSCC-18",
};

/** Complete length of each forced type. GLN-13 rides EAN-13's length. */
const TYPE_TO_LENGTH: Readonly<Record<BarcodeType, number>> = {
  "GTIN-8": 8,
  "UPC-A": 12,
  "EAN-13": 13,
  "GTIN-14": 14,
  "SSCC-18": 18,
  "GLN-13": 13,
};

/** The GTIN lengths — SSCC and GLN are not GTINs and get no 14-digit form. */
const GTIN_TYPES: ReadonlySet<BarcodeType> = new Set<BarcodeType>([
  "GTIN-8",
  "UPC-A",
  "EAN-13",
  "GTIN-14",
]);

const SEPARATORS = /[\s\-_.]/g;
const DIGITS_ONLY = /^[0-9]+$/;

/**
 * GS1 standard check digit over a payload that does **not** include it.
 *
 * Weighting is anchored at the rightmost payload digit (3, then 1, alternating
 * leftwards) — never at the leftmost. A left-anchored 3 coincides with the
 * standard on the *odd*-length payloads (7, 11, 13, 17 — GTIN-8, UPC-A,
 * GTIN-14, SSCC-18) and diverges only on the 12-digit EAN-13/GLN-13 payload
 * (§7.2). That is what makes the bug quiet: it passes four of five lengths and
 * fails the most common barcode on earth.
 */
export function gs1CheckDigit(payload: string): number {
  let sum = 0;
  let weight = 3;
  for (let i = payload.length - 1; i >= 0; i -= 1) {
    sum += Number(payload[i]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Same digits, different register. A 13-digit code is an EAN-13/GTIN-13 by
 * default; the GLN reading is offered rather than computed twice, because the
 * check digit is identical either way. 978/979 are the Bookland prefixes, so
 * there the alternate reading is ISBN-13, not a location number.
 */
function alternatesFor(type: BarcodeType, digits: string): AlternateType[] | undefined {
  if (type === "EAN-13") {
    const prefix = digits.slice(0, 3);
    return prefix === "978" || prefix === "979" ? ["ISBN-13"] : ["GLN-13"];
  }
  if (type === "GLN-13") return ["EAN-13"];
  return undefined;
}

/** GS1 stores GTINs right-aligned in a 14-digit field; UPC-A is an EAN-13 with a leading zero (§7.1). */
function gtin14Form(type: BarcodeType, completeCode: string): string | undefined {
  if (!GTIN_TYPES.has(type)) return undefined;
  return completeCode.padStart(14, "0");
}

interface Normalized {
  digits: string;
  strippedSeparators: boolean;
}

function normalize(raw: string): Normalized | { reason: CheckReason } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { reason: "empty" };
  const digits = trimmed.replace(SEPARATORS, "");
  if (digits.length === 0) return { reason: "empty" };
  if (!DIGITS_ONLY.test(digits)) return { reason: "non-digit-characters" };
  return { digits, strippedSeparators: digits.length !== trimmed.length };
}

function pushWarning(list: CheckWarning[], warning: CheckWarning): void {
  if (!list.includes(warning)) list.push(warning);
}

function checkOne(
  raw: string,
  index: number,
  operation: CheckOperation,
  forced: ForcedType,
): CodeCheckResult {
  const normalized = normalize(raw);
  if ("reason" in normalized) {
    return {
      index,
      input: raw,
      detectedType: "unrecognized-length",
      verdict: normalized.reason === "empty" ? "unrecognized-length" : "invalid",
      reason: normalized.reason,
    };
  }

  const { digits, strippedSeparators } = normalized;
  const warnings: CheckWarning[] = [];
  if (strippedSeparators) pushWarning(warnings, "separators-stripped");

  // A forced type fixes both the label and the expected length; "auto" reads
  // the length and takes the default label for it.
  const completeLength = forced === "auto" ? digits.length : TYPE_TO_LENGTH[forced];
  const payloadLength = operation === "calculate" ? digits.length + 1 : digits.length;

  if (forced !== "auto" && payloadLength !== completeLength) {
    return {
      index,
      input: raw,
      normalized: digits,
      detectedType: "unrecognized-length",
      verdict: "unrecognized-length",
      reason: "length-mismatch",
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  const type: BarcodeType | undefined = forced === "auto" ? LENGTH_TO_TYPE[payloadLength] : forced;
  if (!type) {
    return {
      index,
      input: raw,
      normalized: digits,
      detectedType: "unrecognized-length",
      verdict: "unrecognized-length",
      reason: "unsupported-length",
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  if (operation === "calculate") {
    // The payload the user pasted is itself a complete code length — they may
    // have meant to validate. Say so instead of appending a 13th/14th digit
    // to a number that already carries its own (§8, know-how add).
    if (LENGTH_TO_TYPE[digits.length]) {
      pushWarning(warnings, "payload-is-also-a-complete-code");
    }
    const checkDigit = gs1CheckDigit(digits);
    const correctedCode = `${digits}${checkDigit}`;
    if (/^0+$/.test(correctedCode)) pushWarning(warnings, "all-zero");
    const alternates = alternatesFor(type, correctedCode);
    const gtin14 = gtin14Form(type, correctedCode);
    return {
      index,
      input: raw,
      normalized: digits,
      detectedType: type,
      ...(alternates ? { alternateTypes: alternates } : {}),
      verdict: "calculated",
      checkDigit,
      correctedCode,
      ...(gtin14 ? { gtin14 } : {}),
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  const payload = digits.slice(0, -1);
  const supplied = Number(digits.slice(-1));
  const checkDigit = gs1CheckDigit(payload);
  const valid = supplied === checkDigit;
  const correctedCode = `${payload}${checkDigit}`;
  if (/^0+$/.test(digits)) pushWarning(warnings, "all-zero");
  const alternates = alternatesFor(type, digits);
  const gtin14 = gtin14Form(type, valid ? digits : correctedCode);

  return {
    index,
    input: raw,
    normalized: digits,
    detectedType: type,
    ...(alternates ? { alternateTypes: alternates } : {}),
    verdict: valid ? "valid" : "invalid",
    checkDigit,
    // On a mismatch this is the fix; on a match it is the same code, which
    // keeps the field's meaning ("the code that carries the right digit")
    // stable for a caller reading a column rather than a branch.
    correctedCode,
    ...(gtin14 ? { gtin14 } : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
    ...(valid ? {} : { reason: "check-digit-mismatch" as const }),
  };
}

export const VALIDITY_SCOPE_NOTE =
  "A correct check digit proves the number is mathematically well formed. It does not prove the number was ever assigned to a real product, company or location — only a GS1 registry lookup (GEPIR) answers that.";

export function checkBarcodes(input: {
  codes: readonly string[];
  operation?: CheckOperation;
  type?: ForcedType;
}): EanUpcGtinResult {
  const operation = input.operation ?? "validate";
  const forced = input.type ?? "auto";
  const results = input.codes.map((code, index) => checkOne(code, index, operation, forced));
  const summary: CheckSummary = {
    total: results.length,
    valid: results.filter((r) => r.verdict === "valid").length,
    invalid: results.filter((r) => r.verdict === "invalid").length,
    calculated: results.filter((r) => r.verdict === "calculated").length,
    unrecognized: results.filter((r) => r.verdict === "unrecognized-length").length,
  };
  return { operation, results, summary, note: VALIDITY_SCOPE_NOTE };
}

/* ── tool declaration ──────────────────────────────────────────────────── */

const inputSchema = z.object({
  codes: z
    .array(
      z
        .string()
        .max(64, "A GS1 identifier is at most 18 digits; 64 characters allows for separators."),
    )
    .min(1)
    .max(20_000)
    .describe("Barcode numbers, one per array entry, in the order they should be returned."),
  operation: z
    .enum(["validate", "calculate"])
    .default("validate")
    .describe(
      "validate: the code includes its check digit — confirm or reject it. calculate: the code omits its check digit — append it.",
    ),
  type: z
    .enum(["auto", "GTIN-8", "UPC-A", "EAN-13", "GTIN-14", "SSCC-18", "GLN-13"])
    .default("auto")
    .describe(
      "auto detects by length. Force a type to fix the expected length and the label — the only way to read a 13-digit code as a GLN rather than an EAN-13.",
    ),
});

export const eanUpcGtinTool = tool({
  id: "life/ean-upc-gtin",
  slug: "ean-upc-gtin",
  category: "life",
  title: { zh: "EAN / UPC / GTIN 条码校验位", en: "EAN / UPC / GTIN Check Digit" },
  description: {
    zh: "批量校验或计算 GS1 标准校验位：GTIN-8/12/13/14、SSCC-18、GLN-13",
    en: "Validate or calculate the GS1 check digit in bulk: GTIN-8/12/13/14, SSCC-18, GLN-13",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.life.ean_upc_gtin",
  roots: ["verifier", "checker", "calculator"],
  engine: {
    name: "gs1-mod10",
    upstream:
      "GS1 General Specifications — standard check digit calculation for GS1 data structures (mod 10, 3/1 weighting anchored at the rightmost payload digit), applied to GTIN-8/12/13/14, SSCC and GLN",
    version: "1.0.0",
  },
  seoKeywords: {
    zh: "ean校验位计算,upc校验,gtin校验位,条码校验,sscc校验位,gln校验位",
    en: "ean check digit calculator, upc validator, gtin checksum calculator, barcode validator, sscc check digit, gln check digit",
  },
  inputSchema,
  execute: (input: z.infer<typeof inputSchema>) => checkBarcodes(input),
});

export const w3EanUpcGtinTools: readonly AnyForgeToolDefinition[] = [eanUpcGtinTool];
