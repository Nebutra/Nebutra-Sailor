-- BYOK: customer-owned AI provider API keys, tenant-scoped + app-layer encrypted.
-- Additive only: creates the tenant_provider_keys table, unique key, index, FK.
-- RLS policy is managed in infra/data/database/policies/rls.sql (applied on deploy).
-- The "AIProvider" enum already exists (used by model_configs), so it is reused.

CREATE TABLE "public"."tenant_provider_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "public"."AIProvider" NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "always_use" BOOLEAN NOT NULL DEFAULT false,
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_provider_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_provider_keys_tenant_id_provider_key"
    ON "public"."tenant_provider_keys"("tenant_id", "provider");

CREATE INDEX "tenant_provider_keys_tenant_id_idx"
    ON "public"."tenant_provider_keys"("tenant_id");

ALTER TABLE "public"."tenant_provider_keys"
    ADD CONSTRAINT "tenant_provider_keys_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
