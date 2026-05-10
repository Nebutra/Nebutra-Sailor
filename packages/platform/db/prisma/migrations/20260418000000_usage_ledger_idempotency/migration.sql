-- Migration: ensure UsageLedgerEntry table + idempotency unique constraint
--
-- Guards the (organization_id, idempotency_key) pair against duplicate billing
-- writes. See docs/architecture/2026-04-18-event-flow.md and
-- packages/repositories/src/usage-ledger.repository.ts — the repository's
-- `claim()` primitive relies on this constraint to make the first-write
-- semantic durable.
--
-- This migration is idempotent: it uses IF NOT EXISTS on the table and index
-- creation so that it is a no-op on environments where previous ad-hoc
-- db push / schema sync already materialised the table.

-- Enum types — create only if missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UsageType') THEN
    CREATE TYPE "public"."UsageType" AS ENUM (
      'API_CALL',
      'AI_TOKEN',
      'STORAGE',
      'COMPUTE',
      'BANDWIDTH',
      'CUSTOM'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UsageLedgerSource') THEN
    CREATE TYPE "public"."UsageLedgerSource" AS ENUM (
      'API',
      'WORKFLOW',
      'WEBHOOK',
      'SYSTEM',
      'BACKFILL'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "public"."usage_ledger_entries" (
  "id"              TEXT PRIMARY KEY,
  "organization_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "user_id"         TEXT,
  "idempotency_key" VARCHAR(191) NOT NULL,
  "event_id"        VARCHAR(191),
  "source"          "public"."UsageLedgerSource" NOT NULL DEFAULT 'API',
  "type"            "public"."UsageType" NOT NULL,
  "resource"        VARCHAR(100),
  "quantity"        BIGINT NOT NULL,
  "unit"            VARCHAR(32) NOT NULL DEFAULT 'unit',
  "unit_cost"       DECIMAL(10, 8),
  "total_cost"      DECIMAL(10, 6),
  "currency"        VARCHAR(3) NOT NULL DEFAULT 'USD',
  "occurred_at"     TIMESTAMP(3) NOT NULL,
  "recorded_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ingest_version"  VARCHAR(16) NOT NULL DEFAULT 'v1',
  "metadata"        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "usage_ledger_entries_subscription_id_fkey"
    FOREIGN KEY ("subscription_id")
    REFERENCES "public"."subscriptions" ("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- Canonical idempotency guard — do NOT weaken this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "usage_ledger_entries_organization_id_idempotency_key_key"
  ON "public"."usage_ledger_entries" ("organization_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "usage_ledger_entries_organization_id_occurred_at_idx"
  ON "public"."usage_ledger_entries" ("organization_id", "occurred_at");

CREATE INDEX IF NOT EXISTS "usage_ledger_entries_organization_id_type_occurred_at_idx"
  ON "public"."usage_ledger_entries" ("organization_id", "type", "occurred_at");

CREATE INDEX IF NOT EXISTS "usage_ledger_entries_event_id_idx"
  ON "public"."usage_ledger_entries" ("event_id");
