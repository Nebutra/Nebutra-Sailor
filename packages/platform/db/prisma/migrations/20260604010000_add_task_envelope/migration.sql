-- Standard task envelope for origin-owned long-running work.
-- Additive only: creates task enum types, task table, and tenant-scoped indexes.

CREATE TYPE "public"."TaskStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE "public"."TaskPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH'
);

CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" VARCHAR(80) NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "public"."TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "idempotency_key" VARCHAR(120),
    "queue_name" VARCHAR(64) NOT NULL DEFAULT 'ai',
    "dispatcher_provider" VARCHAR(32),
    "provider_job_id" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_tenant_id_status_created_at_idx"
    ON "public"."tasks"("tenant_id", "status", "created_at" DESC);

CREATE INDEX "tasks_tenant_id_type_created_at_idx"
    ON "public"."tasks"("tenant_id", "type", "created_at" DESC);

CREATE INDEX "tasks_tenant_id_updated_at_idx"
    ON "public"."tasks"("tenant_id", "updated_at" DESC);

CREATE UNIQUE INDEX "tasks_tenant_id_idempotency_key_key"
    ON "public"."tasks"("tenant_id", "idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "public"."tasks"
    ADD CONSTRAINT "tasks_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
