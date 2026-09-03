/**
 * Consent for putting a face through a model.
 *
 * 观澜 sends a photograph of a real person to a third-party model and keeps the
 * result. In China that is 敏感个人信息 and needs separate, explicit, revocable
 * consent against a stated version — not a line buried in terms accepted at
 * sign-up.
 *
 * The shape below mirrors the platform's `UserConsent` model field for field
 * (documentSlug / documentVersion / consentType / consentedAt / withdrawnAt /
 * consentContext / ipAddress / userAgent) so that when 观澜 reaches a database
 * these records become rows without reinterpretation. Until then they live in
 * R2, which is the store this app already has and already fails closed on.
 */

export const FACE_NOTICE_SLUG = "kuanlan-face-processing";

/**
 * Bump when the notice below changes in substance. A person who accepted an
 * older version is asked again — that is the whole point of versioning it.
 */
export const FACE_NOTICE_VERSION = "2026-09-03";

export const FACE_NOTICE = {
  title: "开拍前，有几句话要先说清楚",
  points: [
    "你上传的照片会送到第三方模型处理，用来拍出你选的那一张。",
    "原图不会被保存。处理完就丢掉，不写进任何存储。",
    "拍好的那张留在你的 Moments 里，只有你能看到，你可以随时删掉。",
    "你可以随时在「我」里撤回这份同意。撤回之后不能再开拍，已经拍过的不受影响。",
  ],
  agree: "我同意用我的照片开拍",
} as const;

export type ConsentRecord = {
  documentSlug: string;
  documentVersion: string;
  consentType: "EXPLICIT";
  consentGiven: boolean;
  /** ISO 8601, UTC. */
  consentedAt: string;
  /** Set when the person took it back; the record is kept, not deleted. */
  withdrawnAt?: string;
  consentContext: string;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Whether this record clears someone to shoot right now.
 *
 * Three ways to fail, and they are different: never asked, taken back, or given
 * against a notice we have since rewritten. All three mean ask again.
 */
export function isConsentCurrent(record: ConsentRecord | null | undefined): boolean {
  if (!record) return false;
  if (!record.consentGiven) return false;
  if (record.withdrawnAt) return false;
  if (record.documentSlug !== FACE_NOTICE_SLUG) return false;
  return record.documentVersion === FACE_NOTICE_VERSION;
}

/** Why the person is being asked again, so the page can say something true. */
export type ConsentGap = "never" | "withdrawn" | "outdated";

export function consentGap(record: ConsentRecord | null | undefined): ConsentGap | null {
  if (isConsentCurrent(record)) return null;
  if (!record || !record.consentGiven) return "never";
  if (record.withdrawnAt) return "withdrawn";
  return "outdated";
}
