-- Add UserProfile + Skill + UserSkill + Connector tables.
--
-- TEMPLATE migration: tables ship empty and no UI exposes them yet. Each
-- table maps to one Manus-style settings surface but is intentionally
-- decoupled — product can activate them independently.
--
-- Activation order suggestion:
--   1. UserProfile — wire `<PersonalizationPanel>` into /settings, inject
--      customInstructions into chat system prompt
--   2. Connector — wire `<ConnectorsHub>` once @nebutra/vault encryption is
--      in the request flow
--   3. Skill + UserSkill — seed @nebutra/agents skill catalogue, then wire
--      `<SkillsGrid>` (largest activation — needs agent integration)

-- CreateTable: user_profiles
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nickname" VARCHAR(80),
    "occupation" VARCHAR(120),
    "bio" TEXT,
    "custom_instructions" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "public"."user_profiles"("user_id");
CREATE INDEX "user_profiles_user_id_idx" ON "public"."user_profiles"("user_id");

-- CreateTable: skills (catalogue)
CREATE TABLE "public"."skills" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(40),
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "version" VARCHAR(20) NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "icon_url" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skills_slug_key" ON "public"."skills"("slug");
CREATE INDEX "skills_is_official_category_idx" ON "public"."skills"("is_official", "category");

-- CreateTable: user_skills (installations)
CREATE TABLE "public"."user_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "skill_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "public"."user_skills"("user_id", "skill_id");
CREATE INDEX "user_skills_user_id_enabled_idx" ON "public"."user_skills"("user_id", "enabled");

-- AddForeignKey
ALTER TABLE "public"."user_skills"
    ADD CONSTRAINT "user_skills_skill_id_fkey"
    FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: connectors
CREATE TABLE "public"."connectors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "type" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "icon_url" TEXT,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "connectors_user_id_is_active_last_used_at_idx"
    ON "public"."connectors"("user_id", "is_active", "last_used_at" DESC);
