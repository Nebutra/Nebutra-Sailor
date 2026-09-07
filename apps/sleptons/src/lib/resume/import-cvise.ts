import { type ResumeContentV1Input, ResumeContentV1Schema } from "@nebutra/contracts/sleptons";
import { z } from "zod";

/**
 * One-time importer for CVise `Profile` JSON exports (legacy résumé builder,
 * archived 2026-09-07). Field mapping is spec §3.3. Lenient on input: CVise
 * data lived in localStorage and was never server-validated.
 */

const str = z.string().optional();
const strs = z.array(z.string()).optional();

const CviseEntry = z
  .object({
    period: str,
    org: str,
    title: str,
    details: strs,
    rich: str,
    tags: strs,
  })
  .loose();

export const CviseProfileSchema = z
  .object({
    basic: z
      .object({
        name: str,
        name_en: str,
        phone: str,
        email: str,
        location: str,
        website: str,
        linkedin: str,
      })
      .loose(),
    objective: z.object({ summary: str, advantage_tags: strs }).loose().optional(),
    education: z
      .array(
        z
          .object({
            school: str,
            school_en: str,
            major: str,
            degree: str,
            period: str,
            gpa: str,
            courses: strs,
          })
          .loose(),
      )
      .optional(),
    campus_experiences: z.array(CviseEntry).optional(),
    internships: z.array(CviseEntry).optional(),
    projects: z
      .array(
        z
          .object({
            name: str,
            role: str,
            period: str,
            stack: strs,
            details: strs,
            rich: str,
            links: strs,
          })
          .loose(),
      )
      .optional(),
    achievements: z.array(z.object({ title: str, level: str, year: str }).loose()).optional(),
    certificates: z.array(z.object({ name: str, issuer: str, year: str }).loose()).optional(),
    skills: z.record(z.string(), strs).optional(),
    publications: z
      .array(z.object({ title: str, venue: str, year: str, url: str }).loose())
      .optional(),
    patents: z.array(z.object({ title: str, id: str, year: str, status: str }).loose()).optional(),
    opensource: z
      .array(
        z.object({ repo: str, stars: z.number().optional(), role: str, highlights: strs }).loose(),
      )
      .optional(),
    links: z.record(z.string(), z.string().optional()).optional(),
    volunteering: z
      .array(z.object({ org: str, role: str, period: str, details: strs }).loose())
      .optional(),
    interests: strs,
    preferences: z
      .object({
        length: z.enum(["1page", "2pages"]).optional(),
        show_icons: z.boolean().optional(),
        paper: z.enum(["A4", "Letter"]).optional(),
        margins: z
          .object({ top: z.string(), right: z.string(), bottom: z.string(), left: z.string() })
          .optional(),
        max_bullets_per_entry: z.number().optional(),
      })
      .loose()
      .optional(),
  })
  .loose();
export type CviseProfile = z.infer<typeof CviseProfileSchema>;

const SKILL_KEYS = [
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

function isUrl(s: string | undefined): s is string {
  if (!s) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
}

/**
 * Map a CVise profile to ResumeContentV1 input, then validate. Throws ZodError
 * if the result is still invalid (e.g. missing name), so callers can surface
 * exactly what the user has to fix.
 */
export function mapCviseProfileToResumeV1(raw: unknown) {
  const p = CviseProfileSchema.parse(raw);

  const experiences: NonNullable<ResumeContentV1Input["experiences"]> = [
    ...(p.internships ?? []).map((e) => ({ ...toEntry(e), kind: "work" as const })),
    ...(p.campus_experiences ?? []).map((e) => ({ ...toEntry(e), kind: "campus" as const })),
  ].filter((e) => e.org && e.title && e.period);

  const skills = Object.fromEntries(
    SKILL_KEYS.map((k) => [k, p.skills?.[k]?.filter(Boolean)]).filter(
      ([, v]) => Array.isArray(v) && v.length > 0,
    ),
  ) as ResumeContentV1Input["skills"];

  const github = p.links?.github;
  const personal = p.links?.personal_website || p.links?.portfolio;

  const input: ResumeContentV1Input = {
    basic: compact({
      name: p.basic.name ?? "",
      name_en: p.basic.name_en,
      email: p.basic.email,
      phone: p.basic.phone,
      location: p.basic.location,
      website: isUrl(p.basic.website) ? p.basic.website : undefined,
      links: compact({ github, linkedin: p.basic.linkedin, personal }),
    }),
    objective: compact({
      summary: p.objective?.summary,
      advantage_tags: p.objective?.advantage_tags?.slice(0, 8),
    }),
    experiences: experiences.length ? experiences : undefined,
    education: p.education
      ?.filter((e) => e.school)
      .map((e) =>
        compact({
          school: e.school ?? "",
          school_en: e.school_en,
          major: e.major,
          degree: e.degree,
          period: e.period,
          gpa: e.gpa,
          courses: e.courses,
        }),
      ),
    projects: p.projects
      ?.filter((x) => x.name)
      .map((x) =>
        compact({
          name: x.name ?? "",
          role: x.role,
          period: x.period,
          stack: x.stack,
          details: x.details ?? (x.rich ? [x.rich] : undefined),
          links: x.links,
        }),
      ),
    achievements: p.achievements
      ?.filter((a) => a.title)
      .map((a) => compact({ title: a.title ?? "", level: a.level, year: a.year })),
    certificates: p.certificates
      ?.filter((c) => c.name)
      .map((c) => compact({ name: c.name ?? "", issuer: c.issuer, year: c.year })),
    skills: skills && Object.keys(skills).length ? skills : undefined,
    publications: p.publications
      ?.filter((x) => x.title)
      .map((x) => compact({ title: x.title ?? "", venue: x.venue, year: x.year, url: x.url })),
    patents: p.patents
      ?.filter((x) => x.title)
      .map((x) => compact({ title: x.title ?? "", id: x.id, year: x.year, status: x.status })),
    opensource: p.opensource
      ?.filter((x) => x.repo)
      .map((x) =>
        compact({ repo: x.repo ?? "", stars: x.stars, role: x.role, highlights: x.highlights }),
      ),
    volunteering: p.volunteering
      ?.filter((x) => x.org)
      .map((x) =>
        compact({ org: x.org ?? "", role: x.role, period: x.period, details: x.details }),
      ),
    interests: p.interests,
    preferences: compact({
      length: p.preferences?.length,
      show_icons: p.preferences?.show_icons,
      paper: p.preferences?.paper,
      margins: p.preferences?.margins,
      max_bullets_per_entry: p.preferences?.max_bullets_per_entry,
    }),
  };

  return ResumeContentV1Schema.parse(input);
}

function toEntry(e: z.infer<typeof CviseEntry>) {
  return compact({
    period: e.period ?? "",
    org: e.org ?? "",
    title: e.title ?? "",
    details: e.details ?? (e.rich ? [e.rich] : undefined),
    tags: e.tags,
  });
}
