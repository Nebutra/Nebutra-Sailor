-- ADR-12 Phase 1 — extend auth.invitation with the 4 fields that
-- public.OrganizationInvitation has but the BA invitation table is missing.
-- Strictly additive: every column is nullable or has a DEFAULT, so the
-- migration is safe against an existing populated table.
--
-- Reversible:
--   ALTER TABLE "auth"."invitation" DROP COLUMN "token", DROP COLUMN
--   "accepted_at", DROP COLUMN "declined_at", DROP COLUMN "created_at";
--
-- Deferred to phase 3:
--   - UNIQUE constraint on token
--   - NOT NULL tightening on token + expires_at

-- AlterTable
ALTER TABLE "auth"."invitation" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "declined_at" TIMESTAMP(3),
ADD COLUMN     "token" TEXT;
