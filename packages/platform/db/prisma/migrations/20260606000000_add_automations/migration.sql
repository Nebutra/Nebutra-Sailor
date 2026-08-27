-- Agent Automations: recurring AI-agent tasks (Automation) + append-only run log
-- (AutomationRun). Additive only. RLS policies live in
-- infra/data/database/policies/rls.sql (applied on deploy).

CREATE TYPE "public"."AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');
CREATE TYPE "public"."AutomationScheduleKind" AS ENUM ('CRON', 'RRULE');
CREATE TYPE "public"."AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'PARTIAL');
CREATE TYPE "public"."ReasoningEffort" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'XHIGH');

CREATE TABLE "public"."automations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "public"."AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "schedule_kind" "public"."AutomationScheduleKind" NOT NULL DEFAULT 'CRON',
    "schedule_expr" VARCHAR(256) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "model" VARCHAR(128) NOT NULL DEFAULT 'flagship',
    "reasoning_effort" "public"."ReasoningEffort" NOT NULL DEFAULT 'MEDIUM',
    "scope_ref" VARCHAR(120),
    "known_issues" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automations_tenant_id_name_key" ON "public"."automations"("tenant_id", "name");
CREATE INDEX "automations_tenant_id_status_next_run_at_idx" ON "public"."automations"("tenant_id", "status", "next_run_at");
CREATE INDEX "automations_tenant_id_created_at_idx" ON "public"."automations"("tenant_id", "created_at" DESC);

CREATE TABLE "public"."automation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "status" "public"."AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "idempotency_key" VARCHAR(191) NOT NULL,
    "thread_id" TEXT NOT NULL,
    "triggered_by" VARCHAR(20) NOT NULL DEFAULT 'scheduler',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "summary" TEXT,
    "changed_files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "blockers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "verifications" JSONB NOT NULL DEFAULT '[]',
    "git_branch" VARCHAR(200),
    "git_commit_hash" VARCHAR(40),
    "git_push_status" VARCHAR(20),
    "token_usage" JSONB NOT NULL DEFAULT '{}',
    "memory_snapshot" JSONB NOT NULL DEFAULT '{}',
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "automation_runs_tenant_id_idempotency_key_key" ON "public"."automation_runs"("tenant_id", "idempotency_key");
CREATE INDEX "automation_runs_tenant_id_automation_id_created_at_idx" ON "public"."automation_runs"("tenant_id", "automation_id", "created_at" DESC);
CREATE INDEX "automation_runs_tenant_id_status_created_at_idx" ON "public"."automation_runs"("tenant_id", "status", "created_at" DESC);

ALTER TABLE "public"."automations"
    ADD CONSTRAINT "automations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."automation_runs"
    ADD CONSTRAINT "automation_runs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."automation_runs"
    ADD CONSTRAINT "automation_runs_automation_id_fkey"
    FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
