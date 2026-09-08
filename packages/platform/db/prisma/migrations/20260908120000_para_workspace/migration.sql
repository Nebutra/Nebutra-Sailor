-- PARA: projects, workspaces (embedded document), assets. Tenant-scoped with RLS.

CREATE TYPE "public"."ParaAssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');
CREATE TYPE "public"."ParaAssetOrigin" AS ENUM ('UPLOAD', 'GENERATED');
CREATE TYPE "public"."ParaAssetScope" AS ENUM ('ACCOUNT', 'TEAM');

CREATE TABLE "public"."para_projects" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "para_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."para_workspaces" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "document" JSONB NOT NULL DEFAULT '{}',
  "document_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "para_workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."para_assets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "type" "public"."ParaAssetType" NOT NULL,
  "origin" "public"."ParaAssetOrigin" NOT NULL,
  "scope" "public"."ParaAssetScope" NOT NULL DEFAULT 'ACCOUNT',
  "url" VARCHAR(2048) NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "aspect" VARCHAR(8) NOT NULL DEFAULT '16:9',
  "job_id" VARCHAR(160),
  "workspace_id" TEXT,
  "project_id" TEXT,
  "favorite" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "para_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "para_projects_tenant_id_updated_at_idx" ON "public"."para_projects"("tenant_id", "updated_at" DESC);
CREATE INDEX "para_workspaces_tenant_id_project_id_updated_at_idx" ON "public"."para_workspaces"("tenant_id", "project_id", "updated_at" DESC);
CREATE INDEX "para_assets_tenant_id_origin_created_at_idx" ON "public"."para_assets"("tenant_id", "origin", "created_at" DESC);
CREATE INDEX "para_assets_tenant_id_workspace_id_idx" ON "public"."para_assets"("tenant_id", "workspace_id");

ALTER TABLE "public"."para_projects" ADD CONSTRAINT "para_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_workspaces" ADD CONSTRAINT "para_workspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_workspaces" ADD CONSTRAINT "para_workspaces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."para_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_assets" ADD CONSTRAINT "para_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS, same shape as 20260903000000_rls_full_tenant_coverage.
ALTER TABLE "para_projects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_projects_bypass" ON "para_projects" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_projects_tenant" ON "para_projects" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "para_workspaces" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_workspaces_bypass" ON "para_workspaces" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_workspaces_tenant" ON "para_workspaces" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "para_assets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_assets_bypass" ON "para_assets" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_assets_tenant" ON "para_assets" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());
