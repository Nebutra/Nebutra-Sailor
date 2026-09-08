import {
  type ResumeContentV1,
  type ResumeLang,
  ResumeWriteSchema,
} from "@nebutra/contracts/sleptons";
import { getSystemDb } from "@nebutra/db";
import { deriveResume } from "./resume/derive";

// AUDIT(no-tenant): Sleptons résumés are a global namespace keyed on the member
// profile, same as members.ts. No tenant scoping.

function shouldUseEmptyFallback() {
  return (
    !process.env.DATABASE_URL &&
    (process.env.NODE_ENV !== "production" ||
      process.env.CI === "true" ||
      process.env.SKIP_ENV_VALIDATION === "true")
  );
}

function getOptionalSystemDb() {
  try {
    return getSystemDb();
  } catch (error) {
    if (shouldUseEmptyFallback()) return null;
    throw error;
  }
}

export async function getMemberIdForUser(userId: string): Promise<string | null> {
  const prisma = getOptionalSystemDb();
  if (!prisma) return null;
  const member = await prisma.sleptonsaMemberProfile.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  return member?.id ?? null;
}

export async function getResumeForMember(memberId: string) {
  const prisma = getOptionalSystemDb();
  if (!prisma) return null;
  return prisma.sleptonsResume.findUnique({ where: { member_id: memberId } });
}

/** Public read: member and résumé must both be public. */
export async function getPublicResumeBySlug(slug: string) {
  const prisma = getOptionalSystemDb();
  if (!prisma) return null;
  const member = await prisma.sleptonsaMemberProfile.findFirst({
    where: { slug, is_public: true },
    select: { id: true, slug: true, display_name: true, tier: true, resume: true },
  });
  if (!member?.resume || !member.resume.is_public) return null;
  return {
    member: {
      id: member.id,
      slug: member.slug,
      display_name: member.display_name,
      tier: member.tier,
    },
    resume: member.resume,
  };
}

export type UpsertResumeInput = {
  content: ResumeContentV1;
  is_public?: boolean;
  language?: ResumeLang;
};

/** Validate, derive, and upsert. Throws ZodError on invalid content. */
export async function upsertResume(memberId: string, input: unknown) {
  const write = ResumeWriteSchema.parse(input);
  const derived = deriveResume(write.content);
  const prisma = getOptionalSystemDb();
  if (!prisma) return null;

  const data = {
    content: write.content,
    schema_version: write.content.version,
    headline: derived.headline,
    skills_flat: derived.skills_flat,
    highlights: derived.highlights,
    years_active: derived.years_active,
    completeness: derived.completeness,
    ...(write.is_public !== undefined ? { is_public: write.is_public } : {}),
    ...(write.language !== undefined ? { language: write.language } : {}),
  };

  return prisma.sleptonsResume.upsert({
    where: { member_id: memberId },
    create: { member_id: memberId, ...data },
    update: data,
  });
}
