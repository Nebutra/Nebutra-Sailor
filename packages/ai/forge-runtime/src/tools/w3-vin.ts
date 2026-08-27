/**
 * vin — VIN structure + check-digit verifier (Verifier root).
 *
 * Closed-form arithmetic straight from the regulation, not a heuristic and not
 * a vehicle lookup:
 *   - 49 CFR §565.15(c): position 9 of a 17-character VIN is the check digit,
 *     "whose purpose is to provide a means for verifying the accuracy of any
 *     VIN transcription".
 *   - §565.15(c)(1)-(3): assign each digit its own value and each letter the
 *     value in Table III, multiply by the Table IV position weight, sum the
 *     products, divide the total by 11 — the remainder is the check digit.
 *   - Table III (letters): A-H = 1-8, J-N = 1-5, P = 7, R = 9, S-Z = 2-9.
 *     I, O and Q are not VIN characters at all (confusable with 1, 0, 0).
 *   - Table IV (weights): 8 7 6 5 4 3 2 10 0 9 8 7 6 5 4 3 2. Position 9 is
 *     weighted 0 — the check digit never contributes to its own value — and
 *     position 10 carries the deliberately non-descending weight 10.
 *   - Table V (remainder -> check digit): 0-9 map to "0"-"9"; a remainder of
 *     10 is written as the letter "X".
 *
 * Deliberate scope limits, each of which is surfaced to the caller rather than
 * left implicit:
 *   - A passing check digit proves the seventeen characters are internally
 *     consistent. It does not prove the vehicle exists, is unmodified, or has
 *     a clean title — a cloned VIN copies a real VIN and therefore passes
 *     trivially. Provenance is a vehicle-history-report job, not this one.
 *   - The scheme is North American / ISO 3779 17-character VINs (post-1981).
 *     Pre-1981 vehicles and several non-North-American markets never adopted
 *     this check digit, so a mismatch on an otherwise well-formed VIN carries
 *     a soft notice instead of being reported as proof of a bad VIN.
 *   - Length and character-set failures are reported as their own reasons and
 *     stop before the arithmetic: a VIN that is 16 characters long, or that
 *     contains an O, has no meaningful check digit to evaluate.
 *
 * No network, no clock, no randomness — same answer for the same VIN forever.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── contract ──────────────────────────────────────────────────────────── */

export type VinReason =
  /** Seventeen valid characters and the position-9 check digit matches. */
  | "ok"
  /** Not exactly 17 characters — the check digit cannot be evaluated at all. */
  | "wrong-length"
  /** Contains a character outside the VIN alphabet (most often I, O or Q). */
  | "invalid-character"
  /** Right shape, wrong position-9 character. */
  | "check-digit-mismatch";

export type VinNoticeCode =
  /** Shown on every passing VIN: a valid checksum is not provenance. */
  | "checksum-is-not-provenance"
  /** Shown on a mismatch: this scheme may simply not apply to the vehicle. */
  | "pre-1981-or-non-na-scheme"
  /** Shown when the input is shorter than 17: a partial VIN is a different job. */
  | "partial-vin-needs-17";

export interface VinNotice {
  readonly code: VinNoticeCode;
  /** English prose for API and plain-text consumers; UIs localise from `code`. */
  readonly text: string;
}

export interface VinInvalidCharacter {
  /** 1-based position in the normalised VIN. */
  readonly position: number;
  readonly char: string;
  /** The valid character this one is commonly mistaken for, when there is one. */
  readonly confusableHint?: string;
}

export interface VinSegments {
  /** World Manufacturer Identifier, positions 1-3. */
  readonly wmi: string;
  /** Vehicle Descriptor Section, positions 4-8. */
  readonly vds: string;
  /** Positions 9 — the check digit itself. */
  readonly checkDigit: string;
  /** Position 10. */
  readonly modelYearCode: string;
  /** Position 11. */
  readonly plantCode: string;
  /** Positions 12-17. */
  readonly serial: string;
}

export interface VinMathPosition {
  /** 1-based. */
  readonly position: number;
  readonly char: string;
  /** Table III value (digits keep their own value). */
  readonly value: number;
  /** Table IV weight. Position 9 is 0. */
  readonly weight: number;
  readonly product: number;
}

export interface VinMath {
  readonly positions: readonly VinMathPosition[];
  readonly sum: number;
  /** `sum mod 11`. 10 is written "X". */
  readonly remainder: number;
}

export interface VinCheckResult {
  /** Verbatim, as supplied. */
  readonly input: string;
  /** Upper-cased with whitespace and a leading "VIN:" label removed. */
  readonly normalized: string;
  readonly length: number;
  readonly valid: boolean;
  readonly reason: VinReason;
  /** English prose for `reason`. */
  readonly reasonText: string;
  /** First offending position, 1-based (`invalid-character` only). */
  readonly invalidCharacterPosition?: number;
  /** Hint for that first offending position, when it has a known look-alike. */
  readonly confusableHint?: string;
  /** Every offending position, not just the first — a mistyped VIN often has one. */
  readonly invalidCharacters?: readonly VinInvalidCharacter[];
  /** Table V result for the other sixteen characters. */
  readonly expectedCheckDigit?: string;
  /** What position 9 actually holds. */
  readonly foundCheckDigit?: string;
  /** Present only for a 17-character input — otherwise there is nothing to cut up. */
  readonly segments?: VinSegments;
  /** Present only when length and character set both passed. */
  readonly math?: VinMath;
  /** Soft caveats. Never a substitute for `reason`. */
  readonly notices: readonly VinNotice[];
}

const REASON_TEXT: Record<VinReason, string> = {
  ok: "Valid: 17 characters, all in the VIN alphabet, and the position-9 check digit matches.",
  "wrong-length":
    "A VIN has exactly 17 characters. Check-digit validation needs the full 17-character VIN.",
  "invalid-character":
    "Contains a character that is not a VIN character. I, O and Q are never used in a VIN.",
  "check-digit-mismatch":
    "The position-9 check digit does not match the other 16 characters (49 CFR 565.15).",
};

const NOTICE_TEXT: Record<VinNoticeCode, string> = {
  "checksum-is-not-provenance":
    "A valid check digit confirms the VIN is correctly formed. It does not confirm the vehicle exists, is unmodified, or has a clean history — a cloned VIN copies a real VIN and passes this check.",
  "pre-1981-or-non-na-scheme":
    "The 49 CFR 565.15 check digit applies to North American VINs built from 1981 onward. Vehicles built before 1981, and some imported (JDM/European) vehicles, do not use this scheme, so a mismatch may not mean the VIN was mistyped.",
  "partial-vin-needs-17":
    "Check-digit validation requires the full 17-character VIN. A partial VIN (WMI/VDS only) is a decode job, not a checksum job.",
};

/* ── Table III — transliteration ───────────────────────────────────────── */

/**
 * 49 CFR §565.15 Table III. Not an alphabet-position map: the values restart
 * at J and R jumps to 9. I, O and Q are absent because they are not VIN
 * characters — reimplementing this "from memory" as A=1..Z=26 mod something is
 * the single most likely naive-implementation bug.
 */
export const VIN_LETTER_VALUES: Readonly<Record<string, number>> = Object.freeze({
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
});

/** 49 CFR §565.15 Table IV, positions 1-17. Position 9 is 0; position 10 is 10. */
export const VIN_WEIGHTS: readonly number[] = Object.freeze([
  8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2,
]);

export const VIN_LENGTH = 17;
/** 1-based position of the check digit. */
export const VIN_CHECK_POSITION = 9;

/**
 * The characters a VIN may contain: digits plus the letters of Table III.
 * I, O and Q are excluded by the standard itself, not by this implementation.
 */
const VIN_CHARACTER = /^[0-9A-HJ-NPR-Z]$/;

/**
 * Look-alikes the standard excluded precisely because they are confusable.
 * Only characters that cannot appear in a VIN get a hint — 8/B and 5/S are
 * both-valid pairs, so no hint can be offered for those without guessing.
 */
const CONFUSABLE: Readonly<Record<string, string>> = Object.freeze({
  I: "1",
  O: "0",
  Q: "0",
});

/** Table III value for one already-normalised VIN character. */
export function vinCharValue(char: string): number | null {
  if (char >= "0" && char <= "9") return Number(char);
  return VIN_LETTER_VALUES[char] ?? null;
}

/* ── normalisation ─────────────────────────────────────────────────────── */

/** Whitespace, including the NBSP that copy/paste out of a PDF title leaves. */
const WHITESPACE = /[\s ]/g;
/** "VIN:", "vin " — labels arrive glued to a VIN pasted out of a form. */
const LABEL = /^vin\s*[:：]?\s*/i;

/**
 * Uppercase, drop whitespace and a leading VIN label. Hyphens are deliberately
 * NOT stripped: a hyphen is never part of a VIN, so leaving it in reports an
 * honest `invalid-character` instead of silently repairing the input.
 */
export function normalizeVin(raw: string): string {
  return raw.trim().replace(LABEL, "").replace(WHITESPACE, "").toUpperCase();
}

/* ── the arithmetic ────────────────────────────────────────────────────── */

/** Table V: remainder 0-9 are themselves; remainder 10 is written "X". */
export function remainderToCheckDigit(remainder: number): string {
  return remainder === 10 ? "X" : String(remainder);
}

/**
 * Full position-by-position working for a 17-character, charset-valid VIN.
 * Throws on anything else — callers reach here only after those two gates.
 */
export function vinMath(vin: string): VinMath {
  if (vin.length !== VIN_LENGTH) {
    throw new Error(`vinMath expects ${VIN_LENGTH} characters, received ${vin.length}`);
  }
  const positions: VinMathPosition[] = [];
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i += 1) {
    const char = vin[i] as string;
    const value = vinCharValue(char);
    if (value === null)
      throw new Error(`vinMath received a non-VIN character at position ${i + 1}`);
    const weight = VIN_WEIGHTS[i] as number;
    const product = value * weight;
    sum += product;
    positions.push({ position: i + 1, char, value, weight, product });
  }
  return { positions, sum, remainder: sum % 11 };
}

/** The check digit the other sixteen characters imply. */
export function vinCheckDigit(vin: string): string {
  return remainderToCheckDigit(vinMath(vin).remainder);
}

function segmentsOf(vin: string): VinSegments {
  return {
    wmi: vin.slice(0, 3),
    vds: vin.slice(3, 8),
    checkDigit: vin.slice(8, 9),
    modelYearCode: vin.slice(9, 10),
    plantCode: vin.slice(10, 11),
    serial: vin.slice(11, 17),
  };
}

function notice(code: VinNoticeCode): VinNotice {
  return { code, text: NOTICE_TEXT[code] };
}

/* ── verification ──────────────────────────────────────────────────────── */

export function checkVin(input: string): VinCheckResult {
  const normalized = normalizeVin(input);
  const base = { input, normalized, length: normalized.length } as const;

  // Gate 1 — length. Reported on its own so a user holding a partial VIN is
  // not told their VIN is wrong when it is merely incomplete.
  if (normalized.length !== VIN_LENGTH) {
    return {
      ...base,
      valid: false,
      reason: "wrong-length",
      reasonText: REASON_TEXT["wrong-length"],
      notices: normalized.length < VIN_LENGTH ? [notice("partial-vin-needs-17")] : [],
    };
  }

  // Gate 2 — character set. Every offending position is reported, because a
  // VIN transcribed off a dashboard usually has more than one look-alike slip.
  const invalidCharacters: VinInvalidCharacter[] = [];
  for (let i = 0; i < VIN_LENGTH; i += 1) {
    const char = normalized[i] as string;
    if (VIN_CHARACTER.test(char)) continue;
    const hint = CONFUSABLE[char];
    invalidCharacters.push({ position: i + 1, char, ...(hint ? { confusableHint: hint } : {}) });
  }
  if (invalidCharacters.length > 0) {
    const first = invalidCharacters[0] as VinInvalidCharacter;
    return {
      ...base,
      valid: false,
      reason: "invalid-character",
      reasonText: REASON_TEXT["invalid-character"],
      invalidCharacterPosition: first.position,
      ...(first.confusableHint ? { confusableHint: first.confusableHint } : {}),
      invalidCharacters,
      segments: segmentsOf(normalized),
      notices: [],
    };
  }

  // Gate 3 — the check digit itself.
  const math = vinMath(normalized);
  const expected = remainderToCheckDigit(math.remainder);
  const found = normalized[VIN_CHECK_POSITION - 1] as string;
  const segments = segmentsOf(normalized);

  if (expected !== found) {
    return {
      ...base,
      valid: false,
      reason: "check-digit-mismatch",
      reasonText: REASON_TEXT["check-digit-mismatch"],
      expectedCheckDigit: expected,
      foundCheckDigit: found,
      segments,
      math,
      // A mismatch is a fact; "therefore the VIN is bad" is not. Pre-1981 and
      // several import markets never used this check digit.
      notices: [notice("pre-1981-or-non-na-scheme")],
    };
  }

  return {
    ...base,
    valid: true,
    reason: "ok",
    reasonText: REASON_TEXT.ok,
    expectedCheckDigit: expected,
    foundCheckDigit: found,
    segments,
    math,
    // Always, on every pass — this is the one caveat that must never be
    // reachable only by scrolling to an FAQ.
    notices: [notice("checksum-is-not-provenance")],
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

/**
 * Exported so the human page can parse its input through the very schema the
 * agent API enforces — one contract, two readers.
 */
export const vinInputSchema = z.object({
  vin: z
    .string()
    .min(1)
    .max(64)
    .describe(
      "A single VIN. Case-insensitive; whitespace and a leading 'VIN:' label are ignored. Must normalise to exactly 17 characters for the check digit to be evaluated.",
    ),
});

export type VinInput = z.infer<typeof vinInputSchema>;

export const vinTool = tool({
  id: "text/vin",
  slug: "vin",
  category: "text",
  title: { zh: "VIN 车架号校验位验证", en: "VIN Check-Digit Validator" },
  description: {
    zh: "按 49 CFR 565.15 / ISO 3779 校验 17 位车架号：长度、字符集（无 I/O/Q）、第 9 位校验位，并给出逐位算式",
    en: "Validate a 17-character VIN against 49 CFR 565.15 / ISO 3779: length, character set (no I/O/Q) and the position-9 check digit, with the position-by-position math",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.vin",
  roots: ["verifier", "checker"],
  engine: {
    name: "vin-check-digit",
    upstream:
      "49 CFR §565.15 (Table III transliteration, Table IV weights, Table V remainder) + ISO 3779",
    version: "49 CFR 565.15",
  },
  seoKeywords: {
    zh: "vin校验位,车架号校验,车架号验证,vin码校验位计算,17位车架号校验",
    en: "vin check digit validator, vin checksum calculator, vin validator online, vin check digit calculator, validate vin number",
  },
  inputSchema: vinInputSchema,
  execute: (input: { vin: string }): VinCheckResult => checkVin(input.vin),
});

export const w3VinTools = [vinTool];
