-- Add the tenant-scoped Atelier canvas scene store used by Startup OS and
-- future agentic workspaces. This migration is intentionally additive and
-- fail-loud: Prisma owns replay via _prisma_migrations, so SQL-level
-- IF NOT EXISTS would mask template/database drift.

CREATE TABLE "public"."atelier_canvas" (
  "pk" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scene" JSONB NOT NULL DEFAULT '{"elements":[],"files":[]}'::jsonb,
  "thumbnail" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "atelier_canvas_pkey" PRIMARY KEY ("pk")
);

CREATE UNIQUE INDEX "atelier_canvas_organization_id_id_key"
  ON "public"."atelier_canvas" ("organization_id", "id");

CREATE INDEX "atelier_canvas_organization_id_updated_at_idx"
  ON "public"."atelier_canvas" ("organization_id", "updated_at");

ALTER TABLE "public"."atelier_canvas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atelier_canvas_bypass" ON "public"."atelier_canvas"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

CREATE POLICY "atelier_canvas_tenant" ON "public"."atelier_canvas"
  AS PERMISSIVE FOR ALL
  USING ("organization_id" = current_org_id())
  WITH CHECK ("organization_id" = current_org_id());
