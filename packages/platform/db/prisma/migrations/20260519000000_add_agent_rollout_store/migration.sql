-- Durable, tenant-scoped rollout store for @nebutra/agent-runtime.
-- Append-only event-sourced turn log; one row per RolloutLine. Unlike the
-- best-effort audit log, this is a fail-loud system-of-record: the
-- (tenant_id, thread_id, seq) unique constraint enforces per-thread ordering
-- and rejects duplicate/lost sequence numbers instead of swallowing them.
-- Additive only — creates one new table, touches nothing existing.

CREATE TABLE "public"."agent_rollout_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_rollout_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_rollout_lines_tenant_id_thread_id_seq_key"
    ON "public"."agent_rollout_lines" ("tenant_id", "thread_id", "seq");

CREATE INDEX "agent_rollout_lines_tenant_id_thread_id_seq_idx"
    ON "public"."agent_rollout_lines" ("tenant_id", "thread_id", "seq");
