-- PARA agent: project-scoped threads, durable runs, and the approvals that gate spending.
-- A run advances in a worker, never inside the request that asked for it, so the browser is a
-- viewer of this state rather than its owner. The turn trace stays in agent_rollout_lines.

CREATE TYPE "public"."ParaAutonomy" AS ENUM ('ASK', 'ACT');
CREATE TYPE "public"."ParaRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED');
CREATE TYPE "public"."ParaApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

CREATE TABLE "public"."para_threads" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "autonomy" "public"."ParaAutonomy" NOT NULL DEFAULT 'ASK',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "para_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."para_runs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "context_node_ids" JSONB NOT NULL DEFAULT '[]',
  "status" "public"."ParaRunStatus" NOT NULL DEFAULT 'QUEUED',
  "error" JSONB,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "para_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."para_approvals" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "tool_name" VARCHAR(120) NOT NULL,
  "args" JSONB NOT NULL DEFAULT '{}',
  "estimated_cost" INTEGER NOT NULL DEFAULT 0,
  "status" "public"."ParaApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decided_by" TEXT,
  "decided_at" TIMESTAMP(3),
  "result_job_id" VARCHAR(160),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "para_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "para_threads_tenant_id_project_id_updated_at_idx" ON "public"."para_threads"("tenant_id", "project_id", "updated_at" DESC);
CREATE INDEX "para_runs_tenant_id_thread_id_created_at_idx" ON "public"."para_runs"("tenant_id", "thread_id", "created_at" DESC);
CREATE INDEX "para_runs_tenant_id_status_idx" ON "public"."para_runs"("tenant_id", "status");
CREATE INDEX "para_approvals_tenant_id_run_id_created_at_idx" ON "public"."para_approvals"("tenant_id", "run_id", "created_at" DESC);
CREATE INDEX "para_approvals_tenant_id_status_idx" ON "public"."para_approvals"("tenant_id", "status");

ALTER TABLE "public"."para_threads" ADD CONSTRAINT "para_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_threads" ADD CONSTRAINT "para_threads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."para_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_runs" ADD CONSTRAINT "para_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_runs" ADD CONSTRAINT "para_runs_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."para_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_approvals" ADD CONSTRAINT "para_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."para_approvals" ADD CONSTRAINT "para_approvals_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."para_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS, same shape as 20260903000000_rls_full_tenant_coverage.
ALTER TABLE "para_threads" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_threads_bypass" ON "para_threads" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_threads_tenant" ON "para_threads" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "para_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_runs_bypass" ON "para_runs" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_runs_tenant" ON "para_runs" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());

ALTER TABLE "para_approvals" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "para_approvals_bypass" ON "para_approvals" AS PERMISSIVE FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "para_approvals_tenant" ON "para_approvals" AS PERMISSIVE FOR ALL USING ("tenant_id" = current_org_id()) WITH CHECK ("tenant_id" = current_org_id());
