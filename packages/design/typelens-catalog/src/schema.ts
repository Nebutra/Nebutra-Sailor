import { z } from "zod";

export const ScriptTagSchema = z.enum([
  "latin",
  "cjk-hans",
  "cjk-hant",
  "cjk-jp",
  "cjk-kr",
  "cyrillic",
  "greek",
  "arabic",
  "hebrew",
  "other",
]);
export type ScriptTag = z.infer<typeof ScriptTagSchema>;

export const MediumSchema = z.enum([
  "poster",
  "website",
  "app-ui",
  "brand-identity",
  "editorial",
  "packaging",
  "other",
]);
export type Medium = z.infer<typeof MediumSchema>;

export const WorkStatusSchema = z.enum(["draft", "parsed", "human_reviewed", "published"]);
export type WorkStatus = z.infer<typeof WorkStatusSchema>;

export const TypeRoleSchema = z.enum(["display", "headline", "body", "caption", "accent", "mono"]);
export type TypeRole = z.infer<typeof TypeRoleSchema>;

// "source-listing" = the catalogue records what the source listed and claims
// nothing beyond it. Distinct from "hybrid", which implied a review that the
// promote pipeline never performed.
export const VerifiedBySchema = z.enum(["human", "hybrid", "model-only", "source-listing"]);
export type VerifiedBy = z.infer<typeof VerifiedBySchema>;

export const LicenseRecordSchema = z.object({
  spdxOrLabel: z.string().min(1),
  commercialOk: z.literal(true),
  attributionRequired: z.boolean(),
  redistributable: z.boolean().optional(),
  licenseUrl: z.string().url(),
  notes: z.string().optional(),
});
export type LicenseRecord = z.infer<typeof LicenseRecordSchema>;

export const TypefaceSchema = z.object({
  id: z.string().min(1),
  family: z.string().min(1),
  foundry: z.string().min(1),
  scripts: z.array(ScriptTagSchema).min(1),
  license: LicenseRecordSchema,
  sourceUrl: z.string().url().optional(),
  cssStack: z.string().min(1),
  category: z.enum(["sans", "serif", "display", "mono", "handwriting", "other"]),
  /** Specimen image, where a face has one. Read by the pairings surface. */
  sampleImageUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type Typeface = z.infer<typeof TypefaceSchema>;

/** Work = 作品 */
export const WorkSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  titleZh: z.string().optional(),
  medium: MediumSchema,
  industry: z.string().optional(),
  mood: z.array(z.string()).default([]),
  scripts: z.array(ScriptTagSchema).min(1),
  sourceUrl: z.string().url().optional(),
  imageAssets: z.array(z.string()).default([]),
  curatorNotes: z.string().optional(),
  status: WorkStatusSchema,
});
export type Work = z.infer<typeof WorkSchema>;

export const SpecimenTypefaceRefSchema = z.object({
  typefaceId: z.string().min(1),
  /**
   * Optional, and absent for everything promoted from Fonts In Use. The source
   * lists which faces a work uses, not which one set the headline — and the
   * promote script used to fill this in by array index. Present only when the
   * role is known.
   */
  role: TypeRoleSchema.optional(),
  weight: z.number().int().min(100).max(900).optional(),
  style: z.enum(["normal", "italic"]).optional(),
});
export type SpecimenTypefaceRef = z.infer<typeof SpecimenTypefaceRefSchema>;

export const HierarchyStepSchema = z.object({
  role: TypeRoleSchema,
  rem: z.number().positive(),
  weight: z.number().int().min(100).max(900),
  tracking: z.string().optional(),
  leading: z.number().positive().optional(),
});
export type HierarchyStep = z.infer<typeof HierarchyStepSchema>;

export const PairingSchema = z.object({
  strategy: z.string().min(1),
  contrast: z.enum(["low", "medium", "high", "harmonious"]).optional(),
  notes: z.string().optional(),
});
export type Pairing = z.infer<typeof PairingSchema>;

/** Specimen = 范例 */
export const SpecimenSchema = z.object({
  id: z.string().min(1),
  workId: z.string().min(1),
  typefaces: z.array(SpecimenTypefaceRefSchema).min(1),
  pairing: PairingSchema,
  /** Only where a real type scale was recorded, never derived from position. */
  hierarchy: z.array(HierarchyStepSchema).min(1).optional(),
  rhythm: z.string().optional(),
  tags: z.array(z.string()).default([]),
  /** A measurement, not a constant. Absent when nothing measured it. */
  confidence: z.number().min(0).max(1).optional(),
  verifiedBy: VerifiedBySchema,
  summary: z.string().min(1),
  summaryZh: z.string().optional(),
});
export type Specimen = z.infer<typeof SpecimenSchema>;

/** Extract pack = 生成包 */
export const AgentExtractPackSchema = z.object({
  schemaVersion: z.literal(1),
  specimenId: z.string(),
  workId: z.string(),
  workSlug: z.string(),
  intentHints: z.array(z.string()),
  pairing: z.record(
    z.string(),
    z.object({
      family: z.string(),
      typefaceId: z.string(),
      /** Present only when the source recorded it. */
      role: TypeRoleSchema.optional(),
      weight: z.number().optional(),
      cssStack: z.string(),
    }),
  ),
  hierarchy: z.object({ steps: z.array(HierarchyStepSchema) }).optional(),
  cssTokens: z.record(z.string(), z.string()),
  licenses: z.array(
    z.object({
      typefaceId: z.string(),
      family: z.string(),
      commercialOk: z.literal(true),
      spdxOrLabel: z.string(),
      licenseUrl: z.string(),
      attributionRequired: z.boolean(),
    }),
  ),
  /** Absent unless something measured it. */
  confidence: z.number().min(0).max(1).optional(),
  humanVerified: z.boolean(),
  medium: MediumSchema,
  scripts: z.array(ScriptTagSchema),
  summary: z.string(),
});
export type AgentExtractPack = z.infer<typeof AgentExtractPackSchema>;

export const LicenseCheckResultSchema = z.object({
  typefaceId: z.string(),
  found: z.boolean(),
  commercialOk: z.boolean(),
  spdxOrLabel: z.string().optional(),
  licenseUrl: z.string().optional(),
  attributionRequired: z.boolean().optional(),
  family: z.string().optional(),
});
export type LicenseCheckResult = z.infer<typeof LicenseCheckResultSchema>;
