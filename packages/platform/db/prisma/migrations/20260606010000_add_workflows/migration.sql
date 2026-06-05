-- Agent Workflows: tenant-authored multi-agent orchestration scripts
-- (WorkflowDefinition) + append-only run log (WorkflowRun). Additive only.
-- RLS policies live in infra/data/database/policies/rls.sql (applied on deploy).

CREATE TYPE "public"."WorkflowStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "public"."WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "public"."workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "script_source" TEXT NOT NULL,
    "status" "public"."WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
    "default_model" VARCHAR(128) NOT NULL DEFAULT 'flagship',
    "max_concurrency" INTEGER NOT NULL DEFAULT 16,
    "max_agents_per_run" INTEGER NOT NULL DEFAULT 1000,
    "max_retries" INTEGER NOT NULL DEFAULT 2,
    "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_tenant_id_name_key" ON "public"."workflow_definitions"("tenant_id", "name");
CREATE INDEX "workflow_definitions_tenant_id_status_created_at_idx" ON "public"."workflow_definitions"("tenant_id", "status", "created_at" DESC);

CREATE TABLE "public"."workflow_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "status" "public"."WorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" VARCHAR(191) NOT NULL,
    "thread_id" TEXT NOT NULL,
    "triggered_by" VARCHAR(20) NOT NULL DEFAULT 'api',
    "args" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "events" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "token_usage" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_runs_tenant_id_idempotency_key_key" ON "public"."workflow_runs"("tenant_id", "idempotency_key");
CREATE INDEX "workflow_runs_tenant_id_workflow_id_created_at_idx" ON "public"."workflow_runs"("tenant_id", "workflow_id", "created_at" DESC);
CREATE INDEX "workflow_runs_tenant_id_status_created_at_idx" ON "public"."workflow_runs"("tenant_id", "status", "created_at" DESC);

ALTER TABLE "public"."workflow_definitions"
    ADD CONSTRAINT "workflow_definitions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
