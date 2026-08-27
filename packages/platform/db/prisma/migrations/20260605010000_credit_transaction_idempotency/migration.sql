-- Migration: make credit ledger writes idempotent by source reference.
--
-- Credit balance updates are materialized from credit_transactions. The service
-- treats related_id as the durable replay key for purchases, refunds, bonuses,
-- and usage deductions. This unique index keeps concurrent replays from creating
-- a second ledger row; PostgreSQL still permits multiple NULL related_id rows.

CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_credit_balance_id_type_related_id_key"
  ON "public"."credit_transactions" ("credit_balance_id", "type", "related_id");
