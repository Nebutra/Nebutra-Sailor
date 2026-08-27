-- Migration: Add LicenseTier enum, LicenseType enum, CommunityProfile model, License model
-- These tables support the AGPL-3.0 dual-license onboarding flow.
-- user_id stores the Clerk user ID directly (no FK — Clerk manages users externally).

CREATE TYPE "public"."LicenseTier" AS ENUM ('INDIVIDUAL', 'OPC', 'STARTUP', 'ENTERPRISE');
CREATE TYPE "public"."LicenseType" AS ENUM ('FREE', 'COMMERCIAL');

CREATE TABLE "public"."community_profiles" (
    "id"              TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "display_name"    TEXT,
    "role"            TEXT NOT NULL,
    "company"         TEXT,
    "team_size"       TEXT,
    "industry"        TEXT,
    "use_case"        TEXT NOT NULL,
    "building_what"   TEXT,
    "referral_source" TEXT,
    "showcase_url"    TEXT,
    "github_handle"   TEXT,
    "twitter_handle"  TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_profiles_user_id_key" ON "public"."community_profiles"("user_id");

CREATE TABLE "public"."licenses" (
    "id"                      TEXT NOT NULL,
    "user_id"                 TEXT NOT NULL,
    "tier"                    "public"."LicenseTier" NOT NULL,
    "type"                    "public"."LicenseType" NOT NULL,
    "license_key"             TEXT NOT NULL,
    "accepted_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_ip"             TEXT,
    "accepted_version"        TEXT NOT NULL DEFAULT '1.0',
    "stripe_customer_id"      TEXT,
    "stripe_subscription_id"  TEXT,
    "stripe_price_id"         TEXT,
    "expires_at"              TIMESTAMP(3),
    "is_active"               BOOLEAN NOT NULL DEFAULT true,
    "project_name"            TEXT,
    "project_url"             TEXT,
    "created_at"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "licenses_license_key_key" ON "public"."licenses"("license_key");
