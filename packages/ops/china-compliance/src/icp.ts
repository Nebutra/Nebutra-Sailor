/**
 * ICP (Internet Content Provider) record number helpers.
 *
 * Mainland China requires every public-facing site to display its 工信部 ICP
 * filing on every page (typically in the footer). The expected canonical
 * format is `<省>ICP备<8-digit>号-<seq>`, e.g. `京ICP备12345678号-1`.
 *
 * Hong Kong / Macao / Taiwan and overseas deployments do not need ICP.
 */

/**
 * Set of one-character province codes accepted in ICP numbers.
 * Source: GB/T 2260-2007 administrative-region single-character abbreviations.
 *
 * Kept as a Set for O(1) membership checks; not exhaustive on purpose —
 * the regex below is the actual gate.
 */
export const PROVINCE_CODES = [
  "京",
  "津",
  "沪",
  "渝",
  "冀",
  "豫",
  "云",
  "辽",
  "黑",
  "湘",
  "皖",
  "鲁",
  "新",
  "苏",
  "浙",
  "赣",
  "鄂",
  "桂",
  "甘",
  "晋",
  "蒙",
  "陕",
  "吉",
  "闽",
  "贵",
  "粤",
  "青",
  "藏",
  "川",
  "宁",
  "琼",
] as const;

/**
 * Strict regex for a canonical ICP number.
 *
 * - Province: one of the codes above (any CJK character accepted; we don't
 *   over-constrain because the registry can change).
 * - Body: `ICP备` (or `ICP證` for some older filings — accept both).
 * - Number: 6 to 10 digits (8 is current standard, but old records exist).
 * - Suffix: `号-<digits>` (`号` mandatory, `-N` mandatory).
 */
const ICP_REGEX = /^[一-龥]{1,4}ICP[备證证]\d{6,10}号-\d{1,3}$/;

/**
 * Format a loose ICP string into the canonical form.
 *
 * Accepts:
 *   - lower-case `icp`
 *   - half-width digits / dashes
 *   - extra whitespace
 *
 * Returns the canonical string. If the input cannot be coerced, returns the
 * trimmed input untouched — `validateICPNumber` is the source of truth for
 * "is this valid", `formatICPNumber` only normalizes.
 */
export function formatICPNumber(icp: string): string {
  if (typeof icp !== "string") {
    return "";
  }
  const trimmed = icp
    .trim()
    .replace(/\s+/g, "")
    // Normalize full-width digits / dash / 号 placement
    .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
    .replace(/[—–－]/g, "-");

  // Upper-case the literal "ICP" segment.
  const withUpperIcp = trimmed.replace(/icp/gi, "ICP");

  return withUpperIcp;
}

/**
 * Validate an ICP record number against the canonical format.
 *
 * This is a structural check only — it does NOT call MIIT to verify the
 * record is real. For production, pair this with a server-side lookup.
 */
export function validateICPNumber(icp: string): boolean {
  if (typeof icp !== "string") {
    return false;
  }
  const formatted = formatICPNumber(icp);
  return ICP_REGEX.test(formatted);
}
