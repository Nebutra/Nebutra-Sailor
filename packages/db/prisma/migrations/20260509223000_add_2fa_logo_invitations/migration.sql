-- Add 2FA support to AuthUser, branding to Organization, and OrganizationInvitation table.
--
-- Backs:
--   - apps/web /settings/security TwoFactorBlock (B-followup)
--   - apps/web /settings/team OrganizationLogoForm (C-orgsettings)
--   - apps/web /organization-invitation/[id] accept/decline flow (C-invitation)
--
-- All additions are non-destructive (new nullable columns and a new table).
-- Safe to apply against an existing populated database.

-- 1) AuthUser: 2FA columns
ALTER TABLE "auth_users"
  ADD COLUMN IF NOT EXISTS "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "two_factor_secret" TEXT,
  ADD COLUMN IF NOT EXISTS "backup_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2) Organization: branding column
ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "logo" TEXT;

-- 3) OrganizationInvitation: pending → accepted | declined | expired state machine
CREATE TABLE IF NOT EXISTS "organization_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "inviter_id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "declined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invitations_token_key"
  ON "organization_invitations"("token");

CREATE INDEX IF NOT EXISTS "organization_invitations_email_idx"
  ON "organization_invitations"("email");

CREATE INDEX IF NOT EXISTS "organization_invitations_organization_id_idx"
  ON "organization_invitations"("organization_id");
