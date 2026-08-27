-- @conditional(access-gate=invite)
-- Add provider-agnostic cold-start access gate tables.
--
-- These tables model "who can create an account / first tenant" separately
-- from organization/team invitations. They intentionally do not FK user_id or
-- tenant_id to a single auth provider table so Better Auth, NextAuth/Auth.js,
-- Clerk, and future providers can share the same gate.

CREATE TYPE "public"."AccessInviteScope" AS ENUM ('PLATFORM', 'TENANT');
CREATE TYPE "public"."AccessInviteStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'REVOKED', 'EXPIRED');

-- CreateTable: access_invite_codes
CREATE TABLE "public"."access_invite_codes" (
    "id" TEXT NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "code_prefix" VARCHAR(16) NOT NULL,
    "scope" "public"."AccessInviteScope" NOT NULL DEFAULT 'PLATFORM',
    "tenant_id" TEXT,
    "issued_by_user_id" TEXT NOT NULL,
    "issued_to_email" VARCHAR(254),
    "status" "public"."AccessInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_redemptions" INTEGER NOT NULL DEFAULT 1,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_invite_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "access_invite_codes_max_redemptions_check" CHECK ("max_redemptions" > 0),
    CONSTRAINT "access_invite_codes_redemption_count_check" CHECK ("redemption_count" >= 0),
    CONSTRAINT "access_invite_codes_tenant_scope_check"
      CHECK (("scope" = 'TENANT' AND "tenant_id" IS NOT NULL) OR ("scope" = 'PLATFORM'))
);

-- CreateIndex
CREATE UNIQUE INDEX "access_invite_codes_code_hash_key"
    ON "public"."access_invite_codes"("code_hash");
CREATE INDEX "access_invite_codes_issued_by_user_id_status_created_at_idx"
    ON "public"."access_invite_codes"("issued_by_user_id", "status", "created_at" DESC);
CREATE INDEX "access_invite_codes_tenant_id_status_idx"
    ON "public"."access_invite_codes"("tenant_id", "status");
CREATE INDEX "access_invite_codes_code_prefix_idx"
    ON "public"."access_invite_codes"("code_prefix");

-- CreateTable: access_invite_redemptions
CREATE TABLE "public"."access_invite_redemptions" (
    "id" TEXT NOT NULL,
    "invite_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "email" VARCHAR(254),
    "ip_address" VARCHAR(45),
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "access_invite_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "access_invite_redemptions_invite_code_id_user_id_key"
    ON "public"."access_invite_redemptions"("invite_code_id", "user_id");
CREATE INDEX "access_invite_redemptions_user_id_redeemed_at_idx"
    ON "public"."access_invite_redemptions"("user_id", "redeemed_at" DESC);
CREATE INDEX "access_invite_redemptions_tenant_id_redeemed_at_idx"
    ON "public"."access_invite_redemptions"("tenant_id", "redeemed_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."access_invite_redemptions"
    ADD CONSTRAINT "access_invite_redemptions_invite_code_id_fkey"
    FOREIGN KEY ("invite_code_id") REFERENCES "public"."access_invite_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
