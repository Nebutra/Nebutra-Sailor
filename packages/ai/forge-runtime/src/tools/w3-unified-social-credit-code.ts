/**
 * unified-social-credit-code — 统一社会信用代码 verifier + seeded test-data
 * generator (Verifier root).
 *
 * Spec implemented, not a ported library:
 *   - GB 32100-2015《法人和其他组织统一社会信用代码编码规则》 — the five-field
 *     structure (登记管理部门代码 1 · 机构类别代码 1 · 登记管理机关行政区划码 6 ·
 *     主体标识码 9 · 校验码 1) and the code character set, which excludes the
 *     visually ambiguous letters I, O, S, V, Z leaving 31 characters. 表2
 *     (twelve registration departments) and 表3 (their per-department category
 *     codes) are transcribed in full below — see the note on those tables for
 *     why a truncated copy is the expensive failure mode here.
 *   - Check digit per GB/T 17710 (= ISO 7064) **MOD 31-3**: weights
 *     W = 3^(i-1) mod 31 over positions 1–17, C18 = 31 − (Σ Ci·Wi mod 31),
 *     with 31 written as 0. Table 4 of GB 32100-2015 lists the same vector
 *     [1,3,9,27,19,26,16,17,20,29,25,13,8,24,10,30,28].
 *   - GB/T 2260 administrative-division codes for positions 3–8.
 *   - GB 11714-1997 mod-11 check character for the embedded legacy 9-character
 *     组织机构代码 at positions 9–17 — computed as an **advisory** signal only
 *     (see below), never as a pass/fail gate.
 *
 * Deliberate scope limits, stated rather than silently skipped:
 *   - A passing code is structurally well-formed. It is NOT evidence that any
 *     organisation is registered under it. That question belongs to the national
 *     registry (cods.org.cn) and is a different side-effect class; this tool
 *     stays `pure`.
 *   - Positions 3–8 are checked against the GB/T 2260 **province-level** table
 *     plus the structural rules of the six-digit form. The full county-level
 *     table (~3000 rows, revised yearly) is not carried, so a code with a real
 *     province and a retired county is reported as `province-known` rather than
 *     claimed fully verified — `adminDivision.depth` says exactly how far the
 *     check went.
 *   - The legacy GB 11714 check character does hold for many real codes
 *     (verified against several), but not for every registrant class, so a
 *     mismatch is surfaced as a note and never flips `valid`.
 *
 * Generation is **seeded**, so this tool is genuinely deterministic and can
 * honestly declare `sideEffect: "pure"`: the same seed always yields the same
 * batch. A caller who wants a fresh batch passes a new seed. Every generated
 * code carries a structural `isTestData: true` — a prose disclaimer is
 * something a script ignores.
 */
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

/* ── code character set + weights (GB 32100-2015) ──────────────────────── */

/** 31 characters: 0–9 then A–Y minus the ambiguous I, O, S, V, Z. */
export const USCC_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";

const CHAR_VALUE: ReadonlyMap<string, number> = new Map(
  Array.from(USCC_ALPHABET, (c, i) => [c, i] as const),
);

/** GB 32100-2015 Table 4 — W(i) = 3^(i−1) mod 31. */
export const USCC_WEIGHTS: readonly number[] = [
  1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28,
];

/** GB 11714-1997 weights for the 8-digit body of a legacy 组织机构代码. */
const LEGACY_WEIGHTS: readonly number[] = [3, 7, 9, 10, 5, 8, 4, 2];

/* ── reference tables ──────────────────────────────────────────────────── */

export interface LocalizedLabel {
  readonly zh: string;
  readonly en: string;
}

/**
 * GB 32100-2015 表2 — 登记管理部门代码, transcribed in full (twelve entries).
 *
 * Carrying only the four everyone quotes (1 / 5 / 9 / Y) is the expensive
 * mistake here: a law firm's code opens `31`, a 基层工会 `81`, a 宗教活动场所
 * `71`, a 村级集体经济组织 `N2`. Truncating the table turns every one of those
 * real, checksum-correct codes into `department-unknown` — a verifier failing
 * the documents it exists to check.
 */
export const REGISTRATION_DEPARTMENTS: Readonly<Record<string, LocalizedLabel>> = {
  "1": { zh: "机构编制", en: "Institutional staffing authority" },
  "2": { zh: "外交", en: "Foreign affairs" },
  "3": { zh: "司法行政", en: "Judicial administration" },
  "4": { zh: "文化", en: "Culture" },
  "5": { zh: "民政", en: "Civil affairs" },
  "6": { zh: "旅游", en: "Tourism" },
  "7": { zh: "宗教", en: "Religious affairs" },
  "8": { zh: "工会", en: "Trade union" },
  "9": { zh: "工商", en: "Market regulation (industry & commerce)" },
  A: { zh: "中央军委改革和编制办公室", en: "CMC Office for Reform and Organisational Structure" },
  N: { zh: "农业", en: "Agriculture" },
  Y: { zh: "其他", en: "Other" },
};

/**
 * GB 32100-2015 表3 — 机构类别代码, which is scoped *by department*: the same
 * second character means different things (and is legal in some departments and
 * not others) depending on the first.
 *
 * One deliberate deviation from the printed table, marked rather than hidden:
 * 工商 (9) is printed with three categories (企业 / 个体工商户 / 农民专业合作社)
 * and no 其他. `9` is kept here as the standard's universal 其他 value so a
 * `99…` code answers "checksum fine, category not in the table we hold" rather
 * than a hard structural rejection — a verifier should not manufacture false
 * negatives out of a table it cannot re-issue.
 */
export const ORG_CATEGORIES: Readonly<Record<string, Readonly<Record<string, LocalizedLabel>>>> = {
  "1": {
    "1": { zh: "机关", en: "State organ" },
    "2": { zh: "事业单位", en: "Public institution" },
    "3": {
      zh: "编办直接管理机构编制的群众团体",
      en: "Mass organisation staffed directly by the staffing office",
    },
    "9": { zh: "其他", en: "Other" },
  },
  "2": {
    "1": { zh: "外国常驻新闻机构", en: "Resident foreign news agency" },
    "9": { zh: "其他", en: "Other" },
  },
  "3": {
    "1": { zh: "律师执业机构", en: "Law firm" },
    "2": { zh: "公证处", en: "Notary office" },
    "3": { zh: "基层法律服务所", en: "Grassroots legal service office" },
    "4": { zh: "司法鉴定机构", en: "Forensic appraisal institution" },
    "5": { zh: "仲裁委员会", en: "Arbitration commission" },
    "9": { zh: "其他", en: "Other" },
  },
  "4": {
    "1": { zh: "外国在华文化中心", en: "Foreign cultural centre in China" },
    "9": { zh: "其他", en: "Other" },
  },
  "5": {
    "1": { zh: "社会团体", en: "Social organisation" },
    "2": { zh: "民办非企业单位", en: "Private non-enterprise unit" },
    "3": { zh: "基金会", en: "Foundation" },
    "9": { zh: "其他", en: "Other" },
  },
  "6": {
    "1": { zh: "外国旅游部门常驻代表机构", en: "Resident office of a foreign tourism authority" },
    "2": {
      zh: "港澳台地区旅游部门常驻内地（大陆）代表机构",
      en: "Mainland resident office of a HK/Macao/Taiwan tourism authority",
    },
    "9": { zh: "其他", en: "Other" },
  },
  "7": {
    "1": { zh: "宗教活动场所", en: "Place of religious activity" },
    "2": { zh: "宗教院校", en: "Religious school" },
    "9": { zh: "其他", en: "Other" },
  },
  "8": {
    "1": { zh: "基层工会", en: "Grassroots trade union" },
    "9": { zh: "其他", en: "Other" },
  },
  "9": {
    "1": { zh: "企业", en: "Enterprise" },
    "2": { zh: "个体工商户", en: "Individual industrial & commercial household" },
    "3": { zh: "农民专业合作社", en: "Farmers' specialised cooperative" },
    "9": { zh: "其他", en: "Other" },
  },
  A: {
    "1": { zh: "军队事业单位", en: "Military public institution" },
    "9": { zh: "其他", en: "Other" },
  },
  N: {
    "1": { zh: "组级集体经济组织", en: "Group-level collective economic organisation" },
    "2": { zh: "村级集体经济组织", en: "Village-level collective economic organisation" },
    "3": { zh: "乡镇级集体经济组织", en: "Township-level collective economic organisation" },
    "9": { zh: "其他", en: "Other" },
  },
  Y: {
    "1": { zh: "其他", en: "Other" },
  },
};

/** GB/T 2260 province-level codes (31 mainland + TW/HK/MO). */
export const PROVINCE_CODES: Readonly<Record<string, LocalizedLabel>> = {
  "11": { zh: "北京市", en: "Beijing" },
  "12": { zh: "天津市", en: "Tianjin" },
  "13": { zh: "河北省", en: "Hebei" },
  "14": { zh: "山西省", en: "Shanxi" },
  "15": { zh: "内蒙古自治区", en: "Inner Mongolia" },
  "21": { zh: "辽宁省", en: "Liaoning" },
  "22": { zh: "吉林省", en: "Jilin" },
  "23": { zh: "黑龙江省", en: "Heilongjiang" },
  "31": { zh: "上海市", en: "Shanghai" },
  "32": { zh: "江苏省", en: "Jiangsu" },
  "33": { zh: "浙江省", en: "Zhejiang" },
  "34": { zh: "安徽省", en: "Anhui" },
  "35": { zh: "福建省", en: "Fujian" },
  "36": { zh: "江西省", en: "Jiangxi" },
  "37": { zh: "山东省", en: "Shandong" },
  "41": { zh: "河南省", en: "Henan" },
  "42": { zh: "湖北省", en: "Hubei" },
  "43": { zh: "湖南省", en: "Hunan" },
  "44": { zh: "广东省", en: "Guangdong" },
  "45": { zh: "广西壮族自治区", en: "Guangxi" },
  "46": { zh: "海南省", en: "Hainan" },
  "50": { zh: "重庆市", en: "Chongqing" },
  "51": { zh: "四川省", en: "Sichuan" },
  "52": { zh: "贵州省", en: "Guizhou" },
  "53": { zh: "云南省", en: "Yunnan" },
  "54": { zh: "西藏自治区", en: "Tibet" },
  "61": { zh: "陕西省", en: "Shaanxi" },
  "62": { zh: "甘肃省", en: "Gansu" },
  "63": { zh: "青海省", en: "Qinghai" },
  "64": { zh: "宁夏回族自治区", en: "Ningxia" },
  "65": { zh: "新疆维吾尔自治区", en: "Xinjiang" },
  "71": { zh: "台湾省", en: "Taiwan" },
  "81": { zh: "香港特别行政区", en: "Hong Kong SAR" },
  "82": { zh: "澳门特别行政区", en: "Macao SAR" },
};

/**
 * `10` is not a GB/T 2260 province — it is the division a central-level
 * registrant carries (100000). Real codes use it, so rejecting it would be a
 * false negative; it is accepted and labelled for what it is.
 */
const CENTRAL_DIVISION: LocalizedLabel = { zh: "中央/国家级", en: "Central (national) level" };

/** Where a caller goes for the question this tool deliberately does not answer. */
export const REGISTRY_URL = "https://www.cods.org.cn/";

/* ── contract ──────────────────────────────────────────────────────────── */

export type UsccNoteCode =
  /** Nothing typed yet. */
  | "empty"
  /** Fewer than 18 characters — neutral, not a failure. */
  | "incomplete"
  /** More than 18 characters after separators were stripped. */
  | "too-long"
  /** A character outside the 31-character set (I, O, S, V, Z or punctuation). */
  | "illegal-character"
  /** Right shape, wrong final character. */
  | "check-digit-mismatch"
  /** Position 1 is not one of the twelve departments in GB 32100-2015 表2. */
  | "department-unknown"
  /** Position 2 is not a category GB 32100-2015 表3 defines for that department. */
  | "category-unknown-for-department"
  /** Positions 3–8 are not six digits. */
  | "division-not-numeric"
  /** Positions 3–4 are not a GB/T 2260 province (nor the central-level 10). */
  | "division-unknown-province"
  /** A county under no prefecture (XX00nn) cannot exist in GB/T 2260. */
  | "division-malformed"
  /** The legacy GB 11714 check character does not match — advisory only. */
  | "legacy-checksum-mismatch";

/** How far the administrative-division check actually got. Honest by design. */
export type DivisionDepth = "none" | "province" | "prefecture" | "county";

export interface UsccFieldResult {
  readonly value: string;
  readonly valid: boolean;
  readonly label?: LocalizedLabel;
  readonly noteCode?: UsccNoteCode;
  readonly note?: string;
}

export interface UsccDivisionResult extends UsccFieldResult {
  readonly provinceCode?: string;
  readonly region?: LocalizedLabel;
  /**
   * `province` means the province digits were matched and the remaining digits
   * are structurally sound — NOT that the county exists in GB/T 2260.
   */
  readonly depth: DivisionDepth;
}

export interface UsccOrgIdentifierResult extends UsccFieldResult {
  /** True when the legacy GB 11714 check character could be computed. */
  readonly legacyChecksumChecked: boolean;
  /** Advisory: many but not all registrant classes satisfy it. */
  readonly legacyChecksumValid?: boolean;
  readonly legacyChecksumExpected?: string;
}

export interface UsccCheckDigitResult {
  readonly expected: string;
  readonly actual: string;
  readonly valid: boolean;
}

export interface UsccFields {
  readonly registrationDept: UsccFieldResult;
  readonly orgCategory: UsccFieldResult;
  readonly adminDivision: UsccDivisionResult;
  readonly orgIdentifier: UsccOrgIdentifierResult;
  readonly checkDigit: UsccCheckDigitResult;
}

export interface UsccVerifyResult {
  /** Verbatim, as supplied. */
  readonly input: string;
  /** Upper-cased, separators stripped. */
  readonly normalized: string;
  readonly length: number;
  readonly complete: boolean;
  /** Every field conforms AND the MOD 31-3 check digit matches. */
  readonly valid: boolean;
  /** Charset + length + check digit only — the provable arithmetic half. */
  readonly checksumValid: boolean;
  /** Reported before 18 characters exist, so a typo surfaces immediately. */
  readonly illegalCharacters: readonly { readonly position: number; readonly char: string }[];
  readonly fields?: UsccFields;
  readonly errorCode?: UsccNoteCode;
  readonly error?: string;
  /** This tool proves form, never registration. */
  readonly verifyRealEntityAt: string;
}

export interface UsccGeneratedCode {
  readonly code: string;
  /** Structural, not prose: a script cannot miss this the way it misses a footnote. */
  readonly isTestData: true;
  readonly fields: UsccFields;
}

export interface UsccGenerateResult {
  readonly codes: readonly UsccGeneratedCode[];
  readonly count: number;
  /** Same seed → same batch. That is what keeps this tool `pure`. */
  readonly seed: number;
  readonly isTestData: true;
  readonly disclaimer: string;
  readonly verifyRealEntityAt: string;
}

const NOTE_TEXT: Record<UsccNoteCode, string> = {
  empty: "No code supplied.",
  incomplete: "A unified social credit code has exactly 18 characters.",
  "too-long": "More than 18 characters after separators were removed.",
  "illegal-character":
    "Contains a character outside the GB 32100-2015 set (I, O, S, V and Z are excluded).",
  "check-digit-mismatch": "Check digit does not match the first 17 characters (ISO 7064 MOD 31-3).",
  "department-unknown":
    "Position 1 is not a registration department listed in GB 32100-2015 表2 (1, 2, 3, 4, 5, 6, 7, 8, 9, A, N, Y).",
  "category-unknown-for-department":
    "Position 2 is not an organisation category GB 32100-2015 表3 defines for this department.",
  "division-not-numeric": "Positions 3-8 (administrative division) must be six digits.",
  "division-unknown-province":
    "Positions 3-4 are not a GB/T 2260 province code (nor the central-level 10).",
  "division-malformed":
    "Administrative division has a county under no prefecture, which GB/T 2260 does not allow.",
  "legacy-checksum-mismatch":
    "Legacy GB 11714 check character of the embedded 9-digit organisation code does not match. Advisory only: not every registrant class carries a legacy organisation code.",
};

const DISCLAIMER =
  "Test data only. These codes are structurally valid but correspond to no registered organisation; using them to represent a real entity is prohibited.";

/* ── normalisation + arithmetic ────────────────────────────────────────── */

/** Spaces and the dashes spreadsheets substitute are formatting, not content. */
const SEPARATORS = /[\s ‐‑‒–—−-]/g;
const LABEL = /^(?:统一社会信用代码|信用代码|uscc|usci)\s*[:：]?\s*/i;

export function normalizeUscc(raw: string): string {
  return raw.trim().replace(LABEL, "").replace(SEPARATORS, "").toUpperCase();
}

export function isUsccChar(ch: string): boolean {
  return CHAR_VALUE.has(ch);
}

/**
 * ISO 7064 MOD 31-3 over the first 17 characters.
 * Returns null when any of them is outside the code character set.
 */
export function usccCheckDigit(first17: string): string | null {
  if (first17.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const value = CHAR_VALUE.get(first17[i] as string);
    if (value === undefined) return null;
    sum += value * (USCC_WEIGHTS[i] as number);
  }
  const remainder = 31 - (sum % 31);
  return USCC_ALPHABET[remainder === 31 ? 0 : remainder] as string;
}

/**
 * GB 11714-1997 check character for a legacy 9-character 组织机构代码:
 * weights [3,7,9,10,5,8,4,2] over the 8-character body, letters valued A=10…Z=35,
 * C9 = 11 − (Σ mod 11), where 11 is written 0 and 10 is written X.
 */
export function legacyOrgCodeCheckChar(body8: string): string | null {
  if (body8.length !== 8) return null;
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    const ch = body8[i] as string;
    let value: number;
    if (ch >= "0" && ch <= "9") value = ch.charCodeAt(0) - 48;
    else if (ch >= "A" && ch <= "Z") value = ch.charCodeAt(0) - 55;
    else return null;
    sum += value * (LEGACY_WEIGHTS[i] as number);
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "X";
  return String(remainder);
}

/* ── per-field checks ──────────────────────────────────────────────────── */

function note(code: UsccNoteCode): { noteCode: UsccNoteCode; note: string } {
  return { noteCode: code, note: NOTE_TEXT[code] };
}

function checkDepartment(value: string): UsccFieldResult {
  const label = REGISTRATION_DEPARTMENTS[value];
  if (!label) return { value, valid: false, ...note("department-unknown") };
  return { value, valid: true, label };
}

function checkCategory(dept: string, value: string): UsccFieldResult {
  const table = ORG_CATEGORIES[dept];
  // An unknown department cannot scope a category; say that rather than
  // guessing against the wrong table.
  if (!table) return { value, valid: false, ...note("category-unknown-for-department") };
  const label = table[value];
  if (!label) return { value, valid: false, ...note("category-unknown-for-department") };
  return { value, valid: true, label };
}

export function checkAdminDivision(value: string): UsccDivisionResult {
  if (!/^\d{6}$/.test(value)) {
    return { value, valid: false, depth: "none", ...note("division-not-numeric") };
  }
  const provinceCode = value.slice(0, 2);
  const prefecture = value.slice(2, 4);
  const county = value.slice(4, 6);
  const region = provinceCode === "10" ? CENTRAL_DIVISION : PROVINCE_CODES[provinceCode];
  if (!region) {
    return {
      value,
      valid: false,
      provinceCode,
      depth: "none",
      ...note("division-unknown-province"),
    };
  }
  // GB/T 2260 nests strictly: a county code only exists beneath a prefecture.
  if (prefecture === "00" && county !== "00") {
    return {
      value,
      valid: false,
      provinceCode,
      region,
      depth: "province",
      ...note("division-malformed"),
    };
  }
  const depth: DivisionDepth =
    prefecture === "00" ? "province" : county === "00" ? "prefecture" : "county";
  return { value, valid: true, provinceCode, region, depth };
}

function checkOrgIdentifier(value: string): UsccOrgIdentifierResult {
  for (const ch of value) {
    if (!isUsccChar(ch)) {
      return {
        value,
        valid: false,
        legacyChecksumChecked: false,
        ...note("illegal-character"),
      };
    }
  }
  const expected = legacyOrgCodeCheckChar(value.slice(0, 8));
  if (expected === null) {
    return { value, valid: true, legacyChecksumChecked: false };
  }
  const legacyChecksumValid = expected === value[8];
  // Advisory: `valid` stays true either way. Codes issued after 三证合一 do not
  // all carry a GB 11714-conformant organisation code.
  if (!legacyChecksumValid) {
    return {
      value,
      valid: true,
      legacyChecksumChecked: true,
      legacyChecksumValid,
      legacyChecksumExpected: expected,
      ...note("legacy-checksum-mismatch"),
    };
  }
  return {
    value,
    valid: true,
    legacyChecksumChecked: true,
    legacyChecksumValid,
    legacyChecksumExpected: expected,
  };
}

/* ── verify ────────────────────────────────────────────────────────────── */

function illegalCharactersOf(s: string): { position: number; char: string }[] {
  const out: { position: number; char: string }[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i] as string;
    if (!isUsccChar(ch)) out.push({ position: i + 1, char: ch });
  }
  return out;
}

function shortResult(
  input: string,
  normalized: string,
  illegal: readonly { position: number; char: string }[],
  code: UsccNoteCode,
): UsccVerifyResult {
  return {
    input,
    normalized,
    length: normalized.length,
    complete: normalized.length === 18,
    valid: false,
    checksumValid: false,
    illegalCharacters: illegal,
    errorCode: code,
    error: NOTE_TEXT[code],
    verifyRealEntityAt: REGISTRY_URL,
  };
}

export function verifyUscc(input: string): UsccVerifyResult {
  const normalized = normalizeUscc(input);
  const illegal = illegalCharactersOf(normalized);

  // An unfinished code is not a wrong code — but a bad character is wrong the
  // moment it is typed, so it is reported before the length is complete.
  if (normalized.length === 0) return shortResult(input, normalized, illegal, "empty");
  if (normalized.length < 18) {
    return shortResult(
      input,
      normalized,
      illegal,
      illegal.length > 0 ? "illegal-character" : "incomplete",
    );
  }
  if (normalized.length > 18) return shortResult(input, normalized, illegal, "too-long");
  if (illegal.length > 0) return shortResult(input, normalized, illegal, "illegal-character");

  const registrationDept = checkDepartment(normalized.slice(0, 1));
  const orgCategory = checkCategory(normalized.slice(0, 1), normalized.slice(1, 2));
  const adminDivision = checkAdminDivision(normalized.slice(2, 8));
  const orgIdentifier = checkOrgIdentifier(normalized.slice(8, 17));
  const actual = normalized.slice(17);
  const expected = usccCheckDigit(normalized.slice(0, 17)) as string;
  const checkDigit: UsccCheckDigitResult = { expected, actual, valid: expected === actual };

  const fields: UsccFields = {
    registrationDept,
    orgCategory,
    adminDivision,
    orgIdentifier,
    checkDigit,
  };
  const structural =
    registrationDept.valid && orgCategory.valid && adminDivision.valid && orgIdentifier.valid;
  const valid = structural && checkDigit.valid;

  // One error, in the order a human would want to hear it: the checksum first
  // (a typo), then the field that does not conform.
  let errorCode: UsccNoteCode | undefined;
  if (!checkDigit.valid) errorCode = "check-digit-mismatch";
  else if (!registrationDept.valid) errorCode = registrationDept.noteCode;
  else if (!orgCategory.valid) errorCode = orgCategory.noteCode;
  else if (!adminDivision.valid) errorCode = adminDivision.noteCode;
  else if (!orgIdentifier.valid) errorCode = orgIdentifier.noteCode;

  return {
    input,
    normalized,
    length: 18,
    complete: true,
    valid,
    checksumValid: checkDigit.valid,
    illegalCharacters: [],
    fields,
    ...(errorCode ? { errorCode, error: NOTE_TEXT[errorCode] } : {}),
    verifyRealEntityAt: REGISTRY_URL,
  };
}

/* ── generate (seeded, therefore deterministic and pure) ───────────────── */

/** mulberry32 — small, fast, fully determined by its seed. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROVINCE_LIST = Object.keys(PROVINCE_CODES);

export interface UsccGenerateOptions {
  readonly registrationDept?: string;
  readonly orgCategory?: string;
  /** Two digits (province, padded to XX0000) or a full six-digit division. */
  readonly adminDivision?: string;
  readonly count?: number;
  readonly seed?: number;
}

export function generateUscc(options: UsccGenerateOptions = {}): UsccGenerateResult {
  const seed = options.seed ?? 1;
  const count = options.count ?? 1;
  const rng = makeRng(seed);

  const dept = options.registrationDept ?? "9";
  if (!REGISTRATION_DEPARTMENTS[dept]) {
    throw new Error(
      `Unknown registrationDept "${dept}". GB 32100-2015 表2 defines ${Object.keys(REGISTRATION_DEPARTMENTS).join(", ")}.`,
    );
  }
  const categories = ORG_CATEGORIES[dept] as Readonly<Record<string, LocalizedLabel>>;
  const category = options.orgCategory ?? (Object.keys(categories)[0] as string);
  if (!categories[category]) {
    throw new Error(
      `Organisation category "${category}" is not defined for registration department "${dept}" (GB 32100-2015 表3 allows ${Object.keys(categories).join(", ")}).`,
    );
  }

  let fixedDivision: string | null = null;
  if (options.adminDivision) {
    const raw = options.adminDivision;
    const division = raw.length === 2 ? `${raw}0000` : raw;
    const checked = checkAdminDivision(division);
    if (!checked.valid) {
      throw new Error(`Invalid adminDivision "${raw}": ${checked.note ?? "not a GB/T 2260 code"}`);
    }
    fixedDivision = division;
  }

  const codes: UsccGeneratedCode[] = [];
  for (let i = 0; i < count; i += 1) {
    const division =
      fixedDivision ?? `${PROVINCE_LIST[Math.floor(rng() * PROVINCE_LIST.length)] as string}0000`;
    // 8 digits + the GB 11714 check character, so generated codes also satisfy
    // the legacy organisation-code rule instead of only the outer checksum.
    let body = "";
    for (let d = 0; d < 8; d += 1) body += String(Math.floor(rng() * 10));
    const orgIdentifier = body + (legacyOrgCodeCheckChar(body) as string);
    const first17 = `${dept}${category}${division}${orgIdentifier}`;
    const code = first17 + (usccCheckDigit(first17) as string);
    const verified = verifyUscc(code);
    codes.push({ code, isTestData: true, fields: verified.fields as UsccFields });
  }

  return {
    codes,
    count: codes.length,
    seed,
    isTestData: true,
    disclaimer: DISCLAIMER,
    verifyRealEntityAt: REGISTRY_URL,
  };
}

/* ── tool ──────────────────────────────────────────────────────────────── */

export type UsccToolInput = {
  mode?: "verify" | "generate";
  code?: string;
  registrationDept?: string;
  orgCategory?: string;
  adminDivision?: string;
  count?: number;
  seed?: number;
};

export const unifiedSocialCreditCodeTool = tool({
  id: "cn/unified-social-credit-code",
  slug: "unified-social-credit-code",
  category: "cn",
  title: { zh: "统一社会信用代码校验/生成", en: "Unified Social Credit Code Validator" },
  description: {
    zh: "按 GB 32100-2015 逐字段校验统一社会信用代码（ISO 7064 MOD 31-3 校验码、GB/T 2260 行政区划、登记管理部门与机构类别），并可按种子生成可复现的测试代码",
    en: "Field-level validation of China's 18-character unified social credit code per GB 32100-2015 (ISO 7064 MOD 31-3 check digit, GB/T 2260 division, department and category tables), plus seeded reproducible test-code generation",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["client", "server"],
  meterId: "forge.cn.unified_social_credit_code",
  roots: ["verifier", "checker", "generator"],
  engine: {
    name: "gb32100-uscc",
    upstream: "GB 32100-2015 + GB/T 17710 (ISO 7064 MOD 31-3) + GB/T 2260 + GB 11714-1997",
    version: "GB 32100-2015",
  },
  seoKeywords: {
    zh: "统一社会信用代码校验,统一社会信用代码验证,统一社会信用代码生成器,信用代码校验位,GB32100",
    en: "unified social credit code validator, china social credit code check, uscc checker, gb 32100 check digit, social credit code generator",
  },
  inputSchema: z.object({
    mode: z
      .enum(["verify", "generate"])
      .default("verify")
      .describe(
        "`verify` checks one code field by field. `generate` produces reproducible TEST codes that belong to no registered organisation.",
      ),
    code: z
      .string()
      .max(64)
      .optional()
      .describe(
        "The 18-character code to verify. Spaces, hyphens and a leading '统一社会信用代码:' label are ignored. Required when mode is `verify`.",
      ),
    registrationDept: z
      .enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "N", "Y"])
      .optional()
      .describe(
        "generate: 登记管理部门代码 per GB 32100-2015 表2 — 1 机构编制, 2 外交, 3 司法行政, 4 文化, 5 民政, 6 旅游, 7 宗教, 8 工会, 9 工商, A 中央军委改革和编制办公室, N 农业, Y 其他. Default 9.",
      ),
    orgCategory: z
      .enum(["1", "2", "3", "4", "5", "9"])
      .optional()
      .describe(
        "generate: 机构类别代码 per GB 32100-2015 表3. Its meaning is scoped by registrationDept; an undefined pairing is rejected. Default: the first category of the chosen department.",
      ),
    adminDivision: z
      .string()
      .regex(/^\d{2}(?:\d{4})?$/)
      .optional()
      .describe(
        "generate: GB/T 2260 division — two digits for a province (padded to XX0000) or the full six digits. Default: a province chosen by the seed.",
      ),
    count: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(1)
      .describe("generate: how many test codes to produce."),
    seed: z.coerce
      .number()
      .int()
      .min(0)
      .max(2147483647)
      .default(1)
      .describe(
        "generate: the same seed always yields the same batch, which is what keeps this tool deterministic. Pass a new seed for a fresh batch.",
      ),
  }),
  execute: (input: UsccToolInput): UsccVerifyResult | UsccGenerateResult => {
    if ((input.mode ?? "verify") === "generate") {
      return generateUscc({
        ...(input.registrationDept ? { registrationDept: input.registrationDept } : {}),
        ...(input.orgCategory ? { orgCategory: input.orgCategory } : {}),
        ...(input.adminDivision ? { adminDivision: input.adminDivision } : {}),
        count: input.count ?? 1,
        seed: input.seed ?? 1,
      });
    }
    if (input.code === undefined) {
      throw new Error('`code` is required when mode is "verify".');
    }
    return verifyUscc(input.code);
  },
});

export const w3UnifiedSocialCreditCodeTools: readonly AnyForgeToolDefinition[] = [
  unifiedSocialCreditCodeTool,
];
