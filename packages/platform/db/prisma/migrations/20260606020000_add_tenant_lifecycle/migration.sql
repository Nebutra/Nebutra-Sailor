-- Personal-to-workspace tenant lifecycle (proposal 2026-06-03) + cofounder
-- form-team asset transfer journal. Additive only.
-- RLS policies live in infra/data/database/policies/rls.sql (applied on deploy):
--   tenant_transfer_journals : a tenant reads rows where from_tenant_id = current
--     tenant OR it initiated them; the provisioning worker (service role) writes
--     to_tenant_id / status during async org provisioning.

CREATE TYPE "public"."TenantLifecycleState" AS ENUM ('personal_draft', 'personal_paid', 'workspace_ready', 'organization_owned');
CREATE TYPE "public"."TenantTransferKind" AS ENUM ('company_context', 'startup_project', 'license');
CREATE TYPE "public"."TenantTransferStatus" AS ENUM ('pending', 'applied', 'failed');

ALTER TABLE "public"."tenants"
  ADD COLUMN "lifecycle_state" "public"."TenantLifecycleState" NOT NULL DEFAULT 'personal_draft';

-- Backfill: existing organization tenants are already org-owned.
UPDATE "public"."tenants" SET "lifecycle_state" = 'organization_owned' WHERE "kind" = 'ORGANIZATION';

CREATE TABLE "public"."tenant_transfer_journals" (
    "id" TEXT NOT NULL,
    "from_tenant_id" TEXT NOT NULL,
    "to_tenant_id" TEXT,
    "to_organization_id" TEXT NOT NULL,
    "kind" "public"."TenantTransferKind" NOT NULL,
    "subject_id" TEXT,
    "status" "public"."TenantTransferStatus" NOT NULL DEFAULT 'pending',
    "initiated_by_user_id" TEXT NOT NULL,
    "cofounder_profile_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),
    CONSTRAINT "tenant_transfer_journals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_transfer_journals_to_organization_id_status_idx" ON "public"."tenant_transfer_journals"("to_organization_id", "status");
CREATE INDEX "tenant_transfer_journals_from_tenant_id_idx" ON "public"."tenant_transfer_journals"("from_tenant_id");

ALTER TABLE "public"."tenant_transfer_journals" ADD CONSTRAINT "tenant_transfer_journals_from_tenant_id_fkey" FOREIGN KEY ("from_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."tenant_transfer_journals" ADD CONSTRAINT "tenant_transfer_journals_to_tenant_id_fkey" FOREIGN KEY ("to_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
