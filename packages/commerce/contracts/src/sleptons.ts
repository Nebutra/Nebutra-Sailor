import { z } from "zod";

/**
 * Sleptons résumé content contract (v1).
 *
 * The résumé is the structured "track record" attached 1:1 to a Sleptons member
 * profile. It is stored as a JSON document (`sleptons_resumes.content`) and
 * validated against this schema on every write. Derived/query columns are
 * computed by the consumer (apps/sleptons), never stored inside `content`.
 *
 * Design source: docs/superpowers/specs/2026-09-07-sleptons-resume-system-design.md §3.
 * Lineage: adapted from the CVise `Profile` Zod model (legacy, archived 2026-09-07).
 */

export const RESUME_CONTENT_VERSION = 1 as const;

export const ResumeLangSchema = z.enum(["ZH", "EN", "MIX"]);
export type ResumeLang = z.infer<typeof ResumeLangSchema>;

export const ResumePeriodSchema = z.string().max(40); // free text, e.g. "2024.06 – 2025.01"

const shortText = z.string().max(200);
const bullet = z.string().max(600);
const bullets = z.array(bullet).max(12);
const tags = z.array(z.string().max(40)).max(20);

export const ResumeLinksSchema = z
  .object({
    github: z.string().max(200).optional(),
    linkedin: z.string().max(200).optional(),
    twitter: z.string().max(200).optional(),
    personal: z.string().max(200).optional(),
  })
  .partial();

export const ResumeBasicSchema = z.object({
  name: z.string().min(1).max(120),
  name_en: z.string().max(120).optional(),
  email: z.email().optional(),
  phone: z.string().max(40).optional(),
  location: z.string().max(120).optional(),
  website: z.url().optional(),
  links: ResumeLinksSchema.optional(),
});

export const ResumeObjectiveSchema = z.object({
  summary: z.string().max(4000).optional(), // sanitized HTML or plain text
  advantage_tags: z.array(z.string().max(40)).max(8).optional(),
});

export const VentureStageSchema = z.enum([
  "idea",
  "building",
  "launched",
  "scaling",
  "exited",
  "closed",
]);
export type VentureStage = z.infer<typeof VentureStageSchema>;

export const ResumeVentureSchema = z.object({
  name: shortText,
  role: shortText.optional(),
  period: ResumePeriodSchema.optional(),
  stage: VentureStageSchema.optional(),
  outcome: z.string().max(600).optional(),
  url: z.url().optional(),
  details: bullets.optional(),
});

export const ExperienceKindSchema = z.enum(["work", "campus", "founder"]);
export type ExperienceKind = z.infer<typeof ExperienceKindSchema>;

export const ResumeExperienceSchema = z.object({
  kind: ExperienceKindSchema.default("work"),
  period: ResumePeriodSchema,
  org: shortText,
  title: shortText,
  details: bullets.optional(),
  rich: z.string().max(6000).optional(),
  tags: tags.optional(),
});

export const ResumeEducationSchema = z.object({
  school: shortText,
  school_en: shortText.optional(),
  major: shortText.optional(),
  degree: shortText.optional(),
  period: ResumePeriodSchema.optional(),
  gpa: z.string().max(40).optional(),
  courses: z.array(z.string().max(80)).max(30).optional(),
});

export const ResumeProjectSchema = z.object({
  name: shortText,
  role: shortText.optional(),
  period: ResumePeriodSchema.optional(),
  stack: tags.optional(),
  details: bullets.optional(),
  links: z.array(z.string().max(300)).max(6).optional(),
});

export const ResumeAchievementSchema = z.object({
  title: shortText,
  level: z.string().max(40).optional(),
  year: z.string().max(10).optional(),
});

export const ResumeCertificateSchema = z.object({
  name: shortText,
  issuer: shortText.optional(),
  year: z.string().max(10).optional(),
});

export const RESUME_SKILL_CATEGORIES = [
  "programming",
  "ai_engineering",
  "ai_theory",
  "data",
  "product",
  "finance",
  "tools",
  "ai_tools",
  "languages",
] as const;
export type ResumeSkillCategory = (typeof RESUME_SKILL_CATEGORIES)[number];

export const ResumeSkillsSchema = z
  .object(
    Object.fromEntries(RESUME_SKILL_CATEGORIES.map((k) => [k, tags.optional()])) as Record<
      ResumeSkillCategory,
      z.ZodOptional<typeof tags>
    >,
  )
  .partial();

export const ResumePublicationSchema = z.object({
  title: z.string().max(300),
  venue: shortText.optional(),
  year: z.string().max(10).optional(),
  url: z.string().max(300).optional(),
});

export const ResumePatentSchema = z.object({
  title: z.string().max(300),
  id: z.string().max(60).optional(),
  year: z.string().max(10).optional(),
  status: z.string().max(40).optional(),
});

export const ResumeOpenSourceSchema = z.object({
  repo: z.string().max(200),
  stars: z.number().int().nonnegative().optional(),
  role: shortText.optional(),
  highlights: bullets.optional(),
});

export const ResumeFundingSchema = z.object({
  round: z.string().max(40),
  amount: z.string().max(40).optional(),
  date: z.string().max(20).optional(),
  investors: z.array(shortText).max(20).optional(),
});

export const ResumePressSchema = z.object({
  title: z.string().max(300),
  outlet: shortText.optional(),
  url: z.url().optional(),
  date: z.string().max(20).optional(),
});

export const ResumeVolunteeringSchema = z.object({
  org: shortText,
  role: shortText.optional(),
  period: ResumePeriodSchema.optional(),
  details: bullets.optional(),
});

export const ResumeMarginsSchema = z.object({
  top: z.string().max(10),
  right: z.string().max(10),
  bottom: z.string().max(10),
  left: z.string().max(10),
});

export const DEFAULT_RESUME_MARGINS = {
  top: "12mm",
  right: "12mm",
  bottom: "12mm",
  left: "12mm",
} as const;

export const ResumePreferencesSchema = z.object({
  length: z.enum(["1page", "2pages"]).default("1page"),
  show_icons: z.boolean().default(true),
  show_contact_public: z.boolean().default(false),
  paper: z.enum(["A4", "Letter"]).default("A4"),
  margins: ResumeMarginsSchema.default(DEFAULT_RESUME_MARGINS),
  max_bullets_per_entry: z.number().int().min(1).max(8).default(3),
  section_order: z.array(z.string().max(40)).max(30).optional(),
});

export const ResumeContentV1Schema = z.object({
  version: z.literal(RESUME_CONTENT_VERSION).default(RESUME_CONTENT_VERSION),
  basic: ResumeBasicSchema,
  objective: ResumeObjectiveSchema.default({}),
  ventures: z.array(ResumeVentureSchema).max(20).optional(),
  experiences: z.array(ResumeExperienceSchema).max(30).optional(),
  education: z.array(ResumeEducationSchema).max(10).optional(),
  projects: z.array(ResumeProjectSchema).max(30).optional(),
  achievements: z.array(ResumeAchievementSchema).max(30).optional(),
  certificates: z.array(ResumeCertificateSchema).max(30).optional(),
  skills: ResumeSkillsSchema.optional(),
  publications: z.array(ResumePublicationSchema).max(50).optional(),
  patents: z.array(ResumePatentSchema).max(30).optional(),
  opensource: z.array(ResumeOpenSourceSchema).max(30).optional(),
  funding: z.array(ResumeFundingSchema).max(20).optional(),
  press: z.array(ResumePressSchema).max(30).optional(),
  volunteering: z.array(ResumeVolunteeringSchema).max(20).optional(),
  interests: z.array(z.string().max(60)).max(20).optional(),
  preferences: ResumePreferencesSchema.prefault({}),
});
export type ResumeContentV1 = z.infer<typeof ResumeContentV1Schema>;
export type ResumeContentV1Input = z.input<typeof ResumeContentV1Schema>;

/** Write payload accepted by `PUT /api/resume`. */
export const ResumeWriteSchema = z.object({
  content: ResumeContentV1Schema,
  is_public: z.boolean().optional(),
  language: ResumeLangSchema.optional(),
});
export type ResumeWrite = z.infer<typeof ResumeWriteSchema>;

/** Columns derived from `content` on every save; see apps/sleptons/src/lib/resume/derive.ts. */
export const ResumeDerivedSchema = z.object({
  headline: z.string().max(120).nullable(),
  skills_flat: z.array(z.string()),
  highlights: z.array(z.string()).max(3),
  years_active: z.number().int().nonnegative().nullable(),
  completeness: z.number().int().min(0).max(100),
});
export type ResumeDerived = z.infer<typeof ResumeDerivedSchema>;
