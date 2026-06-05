-- Match Your Cofounder: opt-in cofounder pool (CofounderProfile) + directional
-- interest signals (CofounderInterest; mutual INTERESTED = a match). Additive only.
-- RLS policies live in infra/data/database/policies/rls.sql (applied on deploy):
--   cofounder_profiles  : a tenant reads ACTIVE pool profiles, writes only its own row.
--   cofounder_interests : a tenant writes interests only from its own profile.

CREATE TYPE "public"."CofounderInterestKind" AS ENUM ('PASS', 'INTERESTED', 'PITCH');

CREATE TABLE "public"."cofounder_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "archetype" VARCHAR(40),
    "arena" VARCHAR(60) NOT NULL,
    "headline" VARCHAR(280) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cofounder_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."cofounder_interests" (
    "id" TEXT NOT NULL,
    "from_profile_id" TEXT NOT NULL,
    "to_profile_id" TEXT NOT NULL,
    "kind" "public"."CofounderInterestKind" NOT NULL,
    "pitch" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cofounder_interests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cofounder_profiles_tenant_id_key" ON "public"."cofounder_profiles"("tenant_id");
CREATE INDEX "cofounder_profiles_is_active_arena_idx" ON "public"."cofounder_profiles"("is_active", "arena");
CREATE INDEX "cofounder_interests_to_profile_id_kind_idx" ON "public"."cofounder_interests"("to_profile_id", "kind");
CREATE UNIQUE INDEX "cofounder_interests_from_profile_id_to_profile_id_key" ON "public"."cofounder_interests"("from_profile_id", "to_profile_id");

ALTER TABLE "public"."cofounder_profiles" ADD CONSTRAINT "cofounder_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."cofounder_interests" ADD CONSTRAINT "cofounder_interests_from_profile_id_fkey" FOREIGN KEY ("from_profile_id") REFERENCES "public"."cofounder_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."cofounder_interests" ADD CONSTRAINT "cofounder_interests_to_profile_id_fkey" FOREIGN KEY ("to_profile_id") REFERENCES "public"."cofounder_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
