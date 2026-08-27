/**
 * iban — IBAN validator (Verifier root, brief docs/plans/tools/iban.md).
 *
 * Two sources, deliberately separated, because they do not carry the same
 * guarantee (brief §7 "Scope decision"):
 *
 *   1. PRIMARY — ISO 13616-1:2020(E). Clause 5 fixes the IBAN shape as
 *      `2!a2!n30c` (country code, two check digits, up to 30 alphanumerics).
 *      Clause 6.2 fixes the check: strip blanks, move the first four
 *      characters to the right-hand end, transliterate A=10 … Z=35, apply
 *      MOD 97-10 (ISO/IEC 7064) — valid iff the remainder is 1. Clause 6.3
 *      fixes generation: append country code + "00" to the BBAN,
 *      transliterate, MOD 97-10, check digits = 98 − remainder, whose valid
 *      range the standard states as [02..98].
 *      Everything in that list is computed here and is authoritative.
 *
 *   2. SECONDARY — per-country total length and BBAN field format. ISO
 *      13616-1 Clause 7 defers these to the ISO IBAN registry, which this
 *      implementation could not reach (`iso13616.org` / `swift.com` time out
 *      from this environment, as recorded in the brief). The table below was
 *      extracted from Wikipedia's "International Bank Account Number" IBAN
 *      formats-by-country table (89 registry countries, retrieved
 *      2026-07-28) and every row was checked for internal consistency: the
 *      BBAN segment lengths sum to `length - 4` for all 89 rows.
 *      It is still a third-party reproduction of the registry, so every
 *      response labels it `structureSource: "third-party-reference"` and an
 *      agent can tell a failed ISO checksum (authoritative) apart from a
 *      length/structure complaint (best effort).
 *
 * A pass means well-formed. It never means the account exists, is open, or
 * belongs to the person who sent it — see `caveat`, which is always present.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── country table (secondary source — see header) ─────────────────────── */

export interface IbanCountrySpec {
  /** English country/territory name as published in the registry table. */
  readonly name: string;
  /** Total IBAN length in characters, country code and check digits included. */
  readonly length: number;
  /** BBAN field format, ISO-13616 notation: `8n,16c` = 8 digits then 16 alphanumerics. */
  readonly bban: string;
  /** `[offset, length]` of the national bank code inside the BBAN, where one exists. */
  readonly bank?: readonly [number, number];
}

/**
 * The 89 countries/territories with an ISO 13616 registered IBAN format.
 * Deliberately not the "116" some competitors advertise: that larger figure
 * mixes in unofficial, bank-accepted IBAN-like formats. A code outside this
 * table answers `country_unsupported`, never a guessed length.
 */
export const IBAN_COUNTRIES: Readonly<Record<string, IbanCountrySpec>> = {
  AD: { name: "Andorra", length: 24, bban: "8n,12c", bank: [0, 4] },
  AE: { name: "United Arab Emirates", length: 23, bban: "3n,16n", bank: [0, 3] },
  AL: { name: "Albania", length: 28, bban: "8n,16c", bank: [0, 3] },
  AT: { name: "Austria", length: 20, bban: "16n", bank: [0, 5] },
  AZ: { name: "Azerbaijan", length: 28, bban: "4a,20c", bank: [0, 4] },
  BA: { name: "Bosnia and Herzegovina", length: 20, bban: "16n", bank: [0, 3] },
  BE: { name: "Belgium", length: 16, bban: "12n", bank: [0, 3] },
  BG: { name: "Bulgaria", length: 22, bban: "4a,6n,8c", bank: [0, 4] },
  BH: { name: "Bahrain", length: 22, bban: "4a,14c", bank: [0, 4] },
  BI: { name: "Burundi", length: 27, bban: "5n,5n,11n,2n", bank: [0, 5] },
  BR: { name: "Brazil", length: 29, bban: "23n,1a,1c", bank: [0, 8] },
  BY: { name: "Belarus", length: 28, bban: "4c,4n,16c", bank: [0, 4] },
  CH: { name: "Switzerland", length: 21, bban: "5n,12c", bank: [0, 5] },
  CR: { name: "Costa Rica", length: 22, bban: "18n", bank: [1, 3] },
  CY: { name: "Cyprus", length: 28, bban: "8n,16c", bank: [0, 3] },
  CZ: { name: "Czech Republic", length: 24, bban: "20n", bank: [0, 4] },
  DE: { name: "Germany", length: 22, bban: "18n", bank: [0, 8] },
  DJ: { name: "Djibouti", length: 27, bban: "5n,5n,11n,2n", bank: [0, 5] },
  DK: { name: "Denmark", length: 18, bban: "14n", bank: [0, 4] },
  DO: { name: "Dominican Republic", length: 28, bban: "4c,20n", bank: [0, 4] },
  EE: { name: "Estonia", length: 20, bban: "16n", bank: [0, 2] },
  EG: { name: "Egypt", length: 29, bban: "25n", bank: [0, 4] },
  ES: { name: "Spain", length: 24, bban: "20n", bank: [0, 4] },
  FI: { name: "Finland", length: 18, bban: "14n", bank: [0, 6] },
  FK: { name: "Falkland Islands", length: 18, bban: "2a,12n", bank: [0, 2] },
  FO: { name: "Faroe Islands", length: 18, bban: "14n", bank: [0, 4] },
  FR: { name: "France", length: 27, bban: "10n,11c,2n", bank: [0, 5] },
  GB: { name: "United Kingdom", length: 22, bban: "4a,14n", bank: [0, 4] },
  GE: { name: "Georgia", length: 22, bban: "2a,16n", bank: [0, 2] },
  GI: { name: "Gibraltar", length: 23, bban: "4a,15c", bank: [0, 4] },
  GL: { name: "Greenland", length: 18, bban: "14n", bank: [0, 4] },
  GR: { name: "Greece", length: 27, bban: "7n,16c", bank: [0, 3] },
  GT: { name: "Guatemala", length: 28, bban: "4c,20c", bank: [0, 4] },
  HN: { name: "Honduras", length: 28, bban: "4a,20n", bank: [0, 4] },
  HR: { name: "Croatia", length: 21, bban: "17n", bank: [0, 7] },
  HU: { name: "Hungary", length: 28, bban: "24n", bank: [0, 3] },
  IE: { name: "Ireland", length: 22, bban: "4a,6n,8n", bank: [4, 6] },
  IL: { name: "Israel", length: 23, bban: "19n", bank: [0, 3] },
  IQ: { name: "Iraq", length: 23, bban: "4a,15n", bank: [0, 4] },
  IS: { name: "Iceland", length: 26, bban: "22n", bank: [0, 2] },
  IT: { name: "Italy", length: 27, bban: "1a,10n,12c", bank: [1, 5] },
  JO: { name: "Jordan", length: 30, bban: "4a,4n,18c", bank: [0, 4] },
  KW: { name: "Kuwait", length: 30, bban: "4a,22c", bank: [0, 4] },
  KZ: { name: "Kazakhstan", length: 20, bban: "3n,13c", bank: [0, 3] },
  LB: { name: "Lebanon", length: 28, bban: "4n,20c", bank: [0, 4] },
  LC: { name: "Saint Lucia", length: 32, bban: "4a,24c", bank: [0, 4] },
  LI: { name: "Liechtenstein", length: 21, bban: "5n,12c", bank: [0, 5] },
  LT: { name: "Lithuania", length: 20, bban: "16n", bank: [0, 5] },
  LU: { name: "Luxembourg", length: 20, bban: "3n,13c", bank: [0, 3] },
  LV: { name: "Latvia", length: 21, bban: "4a,13c", bank: [0, 4] },
  LY: { name: "Libya", length: 25, bban: "21n", bank: [0, 3] },
  MC: { name: "Monaco", length: 27, bban: "10n,11c,2n", bank: [0, 5] },
  MD: { name: "Moldova", length: 24, bban: "2c,18c", bank: [0, 2] },
  ME: { name: "Montenegro", length: 22, bban: "18n", bank: [0, 3] },
  MK: { name: "North Macedonia", length: 19, bban: "3n,10c,2n", bank: [0, 3] },
  MN: { name: "Mongolia", length: 20, bban: "4n,12n", bank: [0, 4] },
  MR: { name: "Mauritania", length: 27, bban: "23n", bank: [0, 5] },
  MT: { name: "Malta", length: 31, bban: "4a,5n,18c", bank: [0, 4] },
  MU: { name: "Mauritius", length: 30, bban: "4a,19n,3a", bank: [0, 6] },
  NI: { name: "Nicaragua", length: 28, bban: "4a,20n" },
  NL: { name: "Netherlands", length: 18, bban: "4a,10n", bank: [0, 4] },
  NO: { name: "Norway", length: 15, bban: "11n", bank: [0, 4] },
  OM: { name: "Oman", length: 23, bban: "3n,16c", bank: [0, 3] },
  PK: { name: "Pakistan", length: 24, bban: "4a,16c", bank: [0, 4] },
  PL: { name: "Poland", length: 28, bban: "24n", bank: [0, 8] },
  PS: { name: "Palestinian territories", length: 29, bban: "4a,21c", bank: [0, 4] },
  PT: { name: "Portugal", length: 25, bban: "21n", bank: [0, 4] },
  QA: { name: "Qatar", length: 29, bban: "4a,21c", bank: [0, 4] },
  RO: { name: "Romania", length: 24, bban: "4a,16c", bank: [0, 4] },
  RS: { name: "Serbia", length: 22, bban: "18n", bank: [0, 3] },
  RU: { name: "Russia", length: 33, bban: "14n,15c", bank: [0, 9] },
  SA: { name: "Saudi Arabia", length: 24, bban: "2n,18c", bank: [0, 2] },
  SC: { name: "Seychelles", length: 31, bban: "4a,20n,3a", bank: [0, 6] },
  SD: { name: "Sudan", length: 18, bban: "14n", bank: [0, 2] },
  SE: { name: "Sweden", length: 24, bban: "20n", bank: [0, 3] },
  SI: { name: "Slovenia", length: 19, bban: "15n", bank: [0, 2] },
  SK: { name: "Slovakia", length: 24, bban: "20n", bank: [0, 4] },
  SM: { name: "San Marino", length: 27, bban: "1a,10n,12c", bank: [1, 5] },
  SO: { name: "Somalia", length: 23, bban: "4n,3n,12n", bank: [0, 4] },
  ST: { name: "São Tomé and Príncipe", length: 25, bban: "21n", bank: [0, 4] },
  SV: { name: "El Salvador", length: 28, bban: "4a,20n", bank: [0, 4] },
  TL: { name: "East Timor", length: 23, bban: "19n", bank: [0, 3] },
  TN: { name: "Tunisia", length: 24, bban: "20n", bank: [0, 2] },
  TR: { name: "Turkey", length: 26, bban: "5n,1n,16c", bank: [0, 5] },
  UA: { name: "Ukraine", length: 29, bban: "6n,19c", bank: [0, 6] },
  VA: { name: "Vatican City", length: 22, bban: "3n,15n", bank: [0, 3] },
  VG: { name: "Virgin Islands, British", length: 24, bban: "4a,16n", bank: [0, 4] },
  XK: { name: "Kosovo", length: 20, bban: "4n,10n,2n", bank: [0, 4] },
  YE: { name: "Yemen", length: 30, bban: "4a,4n,18c", bank: [0, 4] },
};

/* ── normalisation (know-how #6) ───────────────────────────────────────── */

/**
 * Separators a real paste carries: ASCII whitespace (which ISO 13616-1 6.2.1
 * itself deletes before checking), NBSP/narrow-NBSP/zero-width space, and the
 * hyphen and dash family some statements print between groups.
 */
const IBAN_SEPARATORS = /[\s  ​‐-―.-]/g;

/**
 * Real input is paper-format (`GB33 BUKB 2020 1555 5555 55`), lowercase, or
 * hyphenated. Normalise first, reject on genuinely invalid characters
 * afterwards — never on sight.
 */
export function normalizeIban(raw: string): string {
  return raw.replace(IBAN_SEPARATORS, "").toUpperCase();
}

/** Print format: groups of four, the way banks and invoices render an IBAN. */
export function formatIban(normalized: string): string {
  return normalized.replace(/(.{4})(?=.)/g, "$1 ");
}

/* ── MOD 97-10 (ISO 13616-1 Clause 6.2 / 6.3, ISO/IEC 7064) ────────────── */

/**
 * Remainder of the transliterated string mod 97, folded chunk by chunk so a
 * 34-character IBAN needs neither BigInt nor a number wider than a double.
 * Letters convert as A=10 … Z=35 (Clause 6.2.3); anything else yields NaN.
 */
function mod97(chars: string): number {
  let remainder = 0;
  for (const ch of chars) {
    const code = ch.charCodeAt(0);
    let piece: string;
    if (code >= 48 && code <= 57) piece = String(code - 48);
    else if (code >= 65 && code <= 90) piece = String(code - 55);
    else return Number.NaN;
    for (const digit of piece) remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return remainder;
}

/**
 * Clause 6.2: rotate the first four characters to the right-hand end,
 * transliterate, then mod 97 — valid iff the remainder is 1. Running mod 97
 * over the string as typed, or skipping the letter→number conversion, is the
 * classic naive bug (know-how #1).
 */
export function ibanRemainder(normalized: string): number {
  return mod97(normalized.slice(4) + normalized.slice(0, 4));
}

/**
 * Clause 6.3: the check digits for a country + BBAN pair — append the country
 * code and "00" to the BBAN, transliterate, mod 97, then `98 − remainder`,
 * zero-padded. The standard notes the result can only land in [02..98], so a
 * correct generator never emits "00" or "01" (know-how #2).
 */
export function ibanCheckDigits(countryCode: string, bban: string): string {
  const remainder = mod97(bban + countryCode + "00");
  if (Number.isNaN(remainder)) return "";
  return String(98 - remainder).padStart(2, "0");
}

/* ── BBAN structure mask ───────────────────────────────────────────────── */

interface BbanSegment {
  readonly len: number;
  readonly type: "n" | "a" | "c";
}

function parseBbanFormat(format: string): readonly BbanSegment[] {
  return format.split(",").flatMap((part) => {
    const match = /^\s*(\d+)([nac])\s*$/.exec(part);
    return match ? [{ len: Number(match[1]), type: match[2] as "n" | "a" | "c" }] : [];
  });
}

function segmentMatches(chunk: string, type: "n" | "a" | "c"): boolean {
  if (type === "n") return /^[0-9]+$/.test(chunk);
  if (type === "a") return /^[A-Z]+$/.test(chunk);
  return /^[0-9A-Z]+$/.test(chunk);
}

/**
 * Right length, wrong shape is still wrong: most countries pin which BBAN
 * positions are digits and which are letters, so a letter where the format
 * wants a digit fails structurally even when the arithmetic would pass
 * (know-how #3). Returns the 0-based BBAN offset of the first mismatching
 * segment, or -1 when the whole mask matches.
 */
export function bbanStructureMismatch(bban: string, format: string): number {
  let offset = 0;
  for (const segment of parseBbanFormat(format)) {
    const chunk = bban.slice(offset, offset + segment.len);
    if (chunk.length < segment.len || !segmentMatches(chunk, segment.type)) return offset;
    offset += segment.len;
  }
  return -1;
}

/* ── result shape ──────────────────────────────────────────────────────── */

export type IbanReason =
  | "bad_charset"
  | "country_unsupported"
  | "incomplete"
  | "wrong_length_for_country"
  | "structure_mismatch"
  | "checksum_failed";

export type IbanCheckState = "pass" | "fail" | "skipped";

export interface IbanChecks {
  readonly charset: IbanCheckState;
  readonly country: IbanCheckState;
  readonly length: IbanCheckState;
  readonly structure: IbanCheckState;
  readonly checksum: IbanCheckState;
}

export interface IbanValidateResult {
  /** True only when charset, country, length, structure and checksum all pass. */
  readonly valid: boolean;
  /** Shorter than this country's registered length — still being typed, not wrong. */
  readonly incomplete: boolean;
  /** Electronic format: uppercase, no spaces or hyphens. */
  readonly normalized: string;
  /** Print format: groups of four. */
  readonly formatted: string;
  readonly length: number;
  readonly country: {
    readonly code: string;
    readonly name?: string;
    readonly expectedLength?: number;
    readonly bbanFormat?: string;
  } | null;
  readonly checkDigits?: string;
  readonly bban?: string;
  /** Present only where the country's registered BBAN format pins a bank code. */
  readonly bankCode?: string;
  /** The check digits ISO 13616-1 6.3 derives for this BBAN — the typo hint. */
  readonly expectedCheckDigits?: string;
  readonly reason?: IbanReason;
  /** Which stage answered, so a caller can see how far the IBAN got. */
  readonly checks: IbanChecks;
  /** Always present: a passing checksum proves form, never existence. */
  readonly caveat: string;
  /** What guarantee each layer carries — ISO-primary vs reproduced registry. */
  readonly source: {
    readonly checksum: "iso-13616-1-2020";
    readonly structure: "third-party-reference";
    readonly countriesCovered: number;
  };
}

/** Know-how #4 — the one caveat every competitor independently arrives at. */
const CAVEAT =
  "Well-formed only. A passing MOD 97-10 checksum does not confirm that the account exists, is open, or belongs to the payee.";

const NO_CHECKS: IbanChecks = {
  charset: "skipped",
  country: "skipped",
  length: "skipped",
  structure: "skipped",
  checksum: "skipped",
};

const SOURCE = {
  checksum: "iso-13616-1-2020",
  structure: "third-party-reference",
  countriesCovered: Object.keys(IBAN_COUNTRIES).length,
} as const;

function baseResult(normalized: string): IbanValidateResult {
  return {
    valid: false,
    incomplete: false,
    normalized,
    formatted: formatIban(normalized),
    length: normalized.length,
    country: null,
    checks: NO_CHECKS,
    caveat: CAVEAT,
    source: SOURCE,
  };
}

/**
 * Staged validation: charset → country → length → BBAN structure → MOD 97-10,
 * each stage short-circuiting the next with its own reason, so a caller is
 * never told a bare "invalid" (brief §9.1 step 2).
 */
export function validateIban(raw: string): IbanValidateResult {
  const normalized = normalizeIban(raw);
  const base = baseResult(normalized);
  const badCharset = (checks: IbanChecks): IbanValidateResult => ({
    ...base,
    checks: { ...checks, charset: "fail" },
    reason: "bad_charset",
  });

  if (normalized.length === 0 || !/^[0-9A-Z]+$/.test(normalized)) return badCharset(NO_CHECKS);
  // ISO 13616-1 Clause 5: the IBAN is 2!a2!n30c — two letters, then two digits.
  // Checked prefix-wise so a half-typed IBAN is judged only on what it has.
  if (!/^[A-Z]{1,2}[0-9]{0,2}$/.test(normalized.slice(0, 4))) return badCharset(NO_CHECKS);

  const charsetOk: IbanChecks = { ...NO_CHECKS, charset: "pass" };
  const withCharset: IbanValidateResult = { ...base, checks: charsetOk };

  if (normalized.length < 2) {
    return { ...withCharset, incomplete: true, reason: "incomplete" };
  }
  const code = normalized.slice(0, 2);
  const spec = IBAN_COUNTRIES[code];
  if (!spec) {
    // A code outside the registry is a different problem from a bad checksum,
    // and IBAN is not universal (know-how #7) — say which one it is.
    return {
      ...withCharset,
      checks: { ...charsetOk, country: "fail" },
      country: { code },
      reason: "country_unsupported",
    };
  }
  const country = { code, name: spec.name, expectedLength: spec.length, bbanFormat: spec.bban };
  const countryOk: IbanChecks = { ...charsetOk, country: "pass" };
  const withCountry: IbanValidateResult = { ...withCharset, checks: countryOk, country };

  if (normalized.length < 4) {
    return { ...withCountry, incomplete: true, reason: "incomplete" };
  }
  if (!/^[0-9]{2}$/.test(normalized.slice(2, 4))) {
    return { ...withCountry, ...badCharset(countryOk), country };
  }

  const bban = normalized.slice(4);
  const withParts: IbanValidateResult = {
    ...withCountry,
    checkDigits: normalized.slice(2, 4),
    bban,
  };

  // Short of the registered length is "keep typing", not a red verdict
  // (brief §9.1 step 6); past it is a definite failure.
  if (normalized.length < spec.length) {
    return { ...withParts, incomplete: true, reason: "incomplete" };
  }
  if (normalized.length > spec.length) {
    return {
      ...withParts,
      checks: { ...countryOk, length: "fail" },
      reason: "wrong_length_for_country",
    };
  }
  const lengthOk: IbanChecks = { ...countryOk, length: "pass" };

  // Bank code only where the registered format pins one. No placeholder guess
  // for the countries whose BBAN does not encode a bank identifier (#5).
  const bankCode = spec.bank ? bban.slice(spec.bank[0], spec.bank[0] + spec.bank[1]) : undefined;
  const identified: IbanValidateResult = {
    ...withParts,
    checks: lengthOk,
    ...(bankCode ? { bankCode } : {}),
  };

  if (bbanStructureMismatch(bban, spec.bban) >= 0) {
    return {
      ...identified,
      checks: { ...lengthOk, structure: "fail" },
      reason: "structure_mismatch",
    };
  }
  const structureOk: IbanChecks = { ...lengthOk, structure: "pass" };

  const expectedCheckDigits = ibanCheckDigits(code, bban);
  if (ibanRemainder(normalized) !== 1) {
    return {
      ...identified,
      checks: { ...structureOk, checksum: "fail" },
      expectedCheckDigits,
      reason: "checksum_failed",
    };
  }

  return {
    ...identified,
    checks: { ...structureOk, checksum: "pass" },
    expectedCheckDigits,
    valid: true,
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

export const ibanTool = tool({
  id: "finance/iban",
  slug: "iban",
  category: "finance",
  title: { zh: "IBAN 校验", en: "IBAN Validator" },
  description: {
    zh: "按 ISO 13616 校验 IBAN：结构、国别长度与 MOD 97-10 校验位（离线、不存储）",
    en: "Validate an IBAN per ISO 13616: structure, per-country length and the MOD 97-10 check digits (offline, never stored)",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.finance.iban",
  roots: ["verifier", "checker"],
  engine: {
    name: "iban-mod97",
    upstream: "ISO 13616-1:2020 (structure + check digits) / ISO/IEC 7064 MOD 97-10",
    version: "0.1.0",
  },
  seoKeywords: {
    zh: "iban校验,iban验证,国际银行账号校验,iban格式检查",
    en: "iban validator, iban checker online, validate iban number, check iban format",
  },
  inputSchema: z.object({
    iban: z
      .string()
      .min(1)
      .max(64)
      .describe(
        "IBAN in electronic form (GB82WEST12345698765432) or print form with spaces (GB82 WEST 1234 5698 7654 32). Case, spaces and hyphens are normalised before validation. Max 64 chars: the ISO maximum is 34, the slack absorbs separators.",
      ),
  }),
  execute: (input: { iban: string }): IbanValidateResult => validateIban(input.iban),
});

export const w3IbanTools: readonly AnyForgeToolDefinition[] = [ibanTool];
