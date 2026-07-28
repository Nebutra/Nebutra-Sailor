/**
 * isbn — ISBN-10 / ISBN-13 check-digit verifier + converter (Verifier root).
 *
 * Closed-form arithmetic from the published spec, not a heuristic:
 *   - ISBN-10 check digit: ISO 2108 — weights 10…1 over the ten characters,
 *     sum ≡ 0 (mod 11); the check character 10 is written `X`.
 *   - ISBN-13 check digit: GS1 General Specifications EAN-13 — weights
 *     alternating 1/3 over the thirteen digits, sum ≡ 0 (mod 10).
 *   - Bookland prefixes: 978 (legacy, has a 10-digit equivalent) and 979
 *     (no 10-digit predecessor). 979-0 is the ISMN range, not ISBN.
 *
 * Scope is deliberately arithmetic only: a passing check digit proves the
 * number is internally consistent, never that an agency assigned it to a real
 * title. Registry lookup is a different job (and a different side-effect
 * class) — this tool stays `pure`.
 *
 * Hyphenation is stripped before the math and is NOT validated: correct
 * hyphen placement needs the ISBN International range file, which this tool
 * does not carry, so it makes no claim about it either way.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── contract ──────────────────────────────────────────────────────────── */

export type IsbnType = "isbn10" | "isbn13";
export type IsbnDetectedType = IsbnType | "invalid-length";

export type IsbnNoteCode =
  /** Not 10 or 13 characters after normalisation — never "add the check digit for them". */
  | "invalid-length"
  /** A character that is neither a digit nor a correctly placed `X`. */
  | "invalid-character"
  /** `X` outside the tenth position of an ISBN-10 (it is a check character, not a wildcard). */
  | "x-misplaced"
  /** Right shape, wrong final character — `checkDigitExpected` says what it should be. */
  | "check-digit-mismatch"
  /** Valid 979-prefixed ISBN-13: no ISBN-10 form has ever existed for it. */
  | "no-isbn10-equivalent"
  /** 13 digits, correct EAN check digit, but not a Bookland (978/979) prefix. */
  | "non-bookland-prefix"
  /** 979-0 is the ISMN range (printed music), not ISBN. */
  | "ismn-prefix";

export interface IsbnRowResult {
  /** Verbatim, as the user typed it. */
  readonly input: string;
  /** Separators removed, `x` upper-cased. */
  readonly normalized: string;
  readonly detectedType: IsbnDetectedType;
  readonly valid: boolean;
  /** Present only when length and character set are otherwise correct. */
  readonly checkDigitExpected?: string;
  /** The equivalent in the other format, when one exists. */
  readonly converted?: { readonly type: IsbnType; readonly value: string };
  /** Stable machine code for the note — clients localise from this. */
  readonly noteCode?: IsbnNoteCode;
  /** English prose for the same note (API + plain-text consumers). */
  readonly note?: string;
}

export interface IsbnCheckResult {
  readonly results: readonly IsbnRowResult[];
  readonly summary: {
    readonly total: number;
    readonly valid: number;
    readonly invalid: number;
  };
  /** True when more rows were supplied than `maxRows` allowed. */
  readonly truncated: boolean;
  /**
   * What `valid: true` does and does not mean, travelling with the data rather
   * than living only in page copy — an agent reading this response gets the
   * same caveat a human reads under the table (know-how #5, ship gate §6.5 #8).
   */
  readonly note: string;
}

const NOTE_TEXT: Record<IsbnNoteCode, string> = {
  "invalid-length": "Not an ISBN length: an ISBN has exactly 10 or 13 characters.",
  "invalid-character": "Contains a character that is not a digit (or a misplaced X).",
  "x-misplaced": "X is only valid as the tenth character of an ISBN-10.",
  "check-digit-mismatch": "Check digit does not match the other digits.",
  "no-isbn10-equivalent": "979 prefix has no ISBN-10 equivalent.",
  "non-bookland-prefix": "13-digit ISBNs must start with 978 or 979.",
  "ismn-prefix": "979-0 is the ISMN range (printed music), not ISBN.",
};

/* ── normalisation ─────────────────────────────────────────────────────── */

/** ASCII hyphen plus the dashes spreadsheets and word processors substitute. */
const SEPARATORS = /[\s\u00a0\u2010\u2011\u2012\u2013\u2014\u2212-]/g;
/** "ISBN:", "ISBN-13 ", "isbn 10:" — labels arrive glued to pasted columns. */
const LABEL = /^isbn(?:[\s-]?1[03])?\s*[:：]?\s*/i;

export function normalizeIsbn(raw: string): string {
  return raw.trim().replace(LABEL, "").replace(SEPARATORS, "").toUpperCase();
}

/**
 * Rows come from lines; a line may still hold a comma/semicolon/tab-separated
 * list. Plain spaces are NOT separators — `978 0 306 40615 7` is one ISBN.
 */
export function splitIsbnRows(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;\t]/))
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

/* ── check digits ──────────────────────────────────────────────────────── */

const isDigits = (s: string): boolean => /^[0-9]*$/.test(s);

/**
 * ISO 2108: weights 10…2 over the first nine digits, then
 * `(11 - sum mod 11) mod 11`, where 10 is written `X`.
 */
export function isbn10CheckDigit(firstNine: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += (10 - i) * Number(firstNine[i]);
  }
  const remainder = (11 - (sum % 11)) % 11;
  return remainder === 10 ? "X" : String(remainder);
}

/** GS1 EAN-13: weights 1/3 alternating over the first twelve digits. */
export function isbn13CheckDigit(firstTwelve: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += (i % 2 === 0 ? 1 : 3) * Number(firstTwelve[i]);
  }
  return String((10 - (sum % 10)) % 10);
}

/** ISBN-10 → ISBN-13: drop the old check digit, prefix 978, recompute. */
export function isbn10To13(isbn10: string): string {
  const body = `978${isbn10.slice(0, 9)}`;
  return body + isbn13CheckDigit(body);
}

/** ISBN-13 → ISBN-10: only 978-prefixed numbers have a 10-digit form. */
export function isbn13To10(isbn13: string): string | null {
  if (!isbn13.startsWith("978")) return null;
  const body = isbn13.slice(3, 12);
  return body + isbn10CheckDigit(body);
}

/* ── per-row verification ──────────────────────────────────────────────── */

function row(base: IsbnRowResult, noteCode?: IsbnNoteCode): IsbnRowResult {
  if (!noteCode) return base;
  return { ...base, noteCode, note: NOTE_TEXT[noteCode] };
}

export function checkIsbn(input: string): IsbnRowResult {
  const normalized = normalizeIsbn(input);
  const base = { input, normalized } as const;

  if (normalized.length !== 10 && normalized.length !== 13) {
    return row({ ...base, detectedType: "invalid-length", valid: false }, "invalid-length");
  }

  if (normalized.length === 10) {
    const body = normalized.slice(0, 9);
    const check = normalized.slice(9);
    if (!isDigits(body)) {
      const misplacedX = body.includes("X");
      return row(
        { ...base, detectedType: "isbn10", valid: false },
        misplacedX ? "x-misplaced" : "invalid-character",
      );
    }
    if (!/^[0-9X]$/.test(check)) {
      return row({ ...base, detectedType: "isbn10", valid: false }, "invalid-character");
    }
    const expected = isbn10CheckDigit(body);
    if (expected !== check) {
      return row(
        { ...base, detectedType: "isbn10", valid: false, checkDigitExpected: expected },
        "check-digit-mismatch",
      );
    }
    return {
      ...base,
      detectedType: "isbn10",
      valid: true,
      converted: { type: "isbn13", value: isbn10To13(normalized) },
    };
  }

  // 13 characters.
  if (!isDigits(normalized)) {
    return row({ ...base, detectedType: "isbn13", valid: false }, "invalid-character");
  }
  const expected = isbn13CheckDigit(normalized.slice(0, 12));
  if (expected !== normalized.slice(12)) {
    return row(
      { ...base, detectedType: "isbn13", valid: false, checkDigitExpected: expected },
      "check-digit-mismatch",
    );
  }
  if (normalized.startsWith("9790")) {
    return row({ ...base, detectedType: "isbn13", valid: false }, "ismn-prefix");
  }
  if (!normalized.startsWith("978") && !normalized.startsWith("979")) {
    return row({ ...base, detectedType: "isbn13", valid: false }, "non-bookland-prefix");
  }
  const converted = isbn13To10(normalized);
  if (converted === null) {
    return row({ ...base, detectedType: "isbn13", valid: true }, "no-isbn10-equivalent");
  }
  return {
    ...base,
    detectedType: "isbn13",
    valid: true,
    converted: { type: "isbn10", value: converted },
  };
}

export const VALIDITY_SCOPE_NOTE =
  "A correct check digit proves the number is internally consistent, and hyphen placement is not checked at all. It does not prove an ISBN agency ever assigned the number to a published title — only a bibliographic registry lookup answers that.";

export function checkIsbnBatch(text: string, maxRows: number): IsbnCheckResult {
  const cells = splitIsbnRows(text);
  const truncated = cells.length > maxRows;
  const results = (truncated ? cells.slice(0, maxRows) : cells).map(checkIsbn);
  const valid = results.reduce((n, r) => n + (r.valid ? 1 : 0), 0);
  return {
    results,
    summary: { total: results.length, valid, invalid: results.length - valid },
    truncated,
    note: VALIDITY_SCOPE_NOTE,
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

const DEFAULT_MAX_ROWS = 1_000;

export const isbnTool = tool({
  id: "text/isbn",
  slug: "isbn",
  category: "text",
  title: { zh: "ISBN 校验与转换", en: "ISBN Validator & Converter" },
  description: {
    zh: "批量校验 ISBN-10/ISBN-13 校验位，给出应有校验位并互转（979 无 ISBN-10）",
    en: "Bulk-validate ISBN-10/ISBN-13 check digits, suggest the correct one, convert 10↔13",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.text.isbn",
  roots: ["verifier", "checker", "converter"],
  engine: {
    name: "isbn-check-digit",
    upstream: "ISO 2108 (ISBN) + GS1 General Specifications (EAN-13 check digit)",
    version: "ISO 2108:2017",
  },
  seoKeywords: {
    zh: "isbn校验,isbn验证,isbn10转isbn13,书号校验位,批量校验isbn",
    en: "isbn validator, isbn checker, validate isbn-13, isbn check digit calculator, isbn converter, bulk isbn validation",
  },
  inputSchema: z.object({
    text: z
      .string()
      .max(500_000)
      .describe(
        "One or more ISBNs. One per line; a line may also be comma/semicolon/tab separated. Hyphens, spaces and an 'ISBN:' label are ignored.",
      ),
    maxRows: z.coerce
      .number()
      .int()
      .min(1)
      .max(10_000)
      .default(DEFAULT_MAX_ROWS)
      .describe("Rows beyond this cap are dropped and `truncated` is set."),
  }),
  execute: (input: { text: string; maxRows?: number }): IsbnCheckResult =>
    checkIsbnBatch(input.text, input.maxRows ?? DEFAULT_MAX_ROWS),
});

export const w3IsbnTools = [isbnTool];
