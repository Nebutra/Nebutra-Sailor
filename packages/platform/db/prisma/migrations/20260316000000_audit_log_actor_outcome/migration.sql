-- Migration: Add actorType, outcome, reason columns to audit_logs
-- These fields align the Prisma model with the @nebutra/audit package's AuditEvent interface,
-- enabling proper audit trail storage (who did it, with what role, and did it succeed).

ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "actor_type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "outcome"    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "reason"     VARCHAR(255);

-- Index for filtering failed operations (security monitoring)
CREATE INDEX IF NOT EXISTS "audit_logs_outcome_idx" ON "audit_logs" ("outcome");

-- Backfill: existing rows were implicitly successful user actions
UPDATE "audit_logs"
SET
  "actor_type" = 'user',
  "outcome"    = 'success'
WHERE "actor_type" IS NULL;
