-- Sleptons résumé: the structured "track record" attached 1:1 to a member profile.
--
-- `content` is the validated ResumeContentV1 JSON document (see
-- @nebutra/contracts/sleptons). It is never queried inside; the derived columns
-- (headline, skills_flat, highlights, years_active, completeness) are recomputed
-- by apps/sleptons on every save and are what search, cards and matching read.
--
-- Not tenant-scoped: Sleptons is a global public namespace keyed on the member
-- profile, same as sleptons_member_profiles. No RLS policy is attached here.
-- Spec: docs/superpowers/specs/2026-09-07-sleptons-resume-system-design.md

CREATE TYPE "public"."ResumeLang" AS ENUM ('ZH', 'EN', 'MIX');

CREATE TABLE "public"."sleptons_resumes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "headline" VARCHAR(120),
    "skills_flat" TEXT[],
    "highlights" TEXT[],
    "years_active" INTEGER,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "language" "public"."ResumeLang" NOT NULL DEFAULT 'MIX',
    "last_exported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleptons_resumes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sleptons_resumes_member_id_key" ON "public"."sleptons_resumes"("member_id");
CREATE INDEX "sleptons_resumes_is_public_completeness_idx" ON "public"."sleptons_resumes"("is_public", "completeness");

ALTER TABLE "public"."sleptons_resumes"
  ADD CONSTRAINT "sleptons_resumes_member_id_fkey"
  FOREIGN KEY ("member_id") REFERENCES "public"."sleptons_member_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
