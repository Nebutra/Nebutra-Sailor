-- Router reservations (Batch A defect fix).
--
-- The admit path already decremented `credit_balances.balance` before the
-- upstream call. Nothing recorded that the decrement was a *hold*, so a process
-- death between admit and settle left the customer's money gone with no ledger
-- row and no way to sweep it. This table makes the hold a record: written in the
-- same transaction as the decrement, deleted in the same transaction as the
-- settle / release / expiry refund. Primary key is the edge's request id, so a
-- retried admit collides rather than holding twice.

CREATE TABLE "public"."router_reservations" (
  "id"         TEXT NOT NULL,
  "tenant_id"  TEXT NOT NULL,
  "api_key_id" TEXT,
  "amount"     DECIMAL(12,6) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "router_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "router_reservations_expires_at_idx"
  ON "public"."router_reservations"("expires_at");

CREATE INDEX "router_reservations_tenant_id_expires_at_idx"
  ON "public"."router_reservations"("tenant_id", "expires_at");

ALTER TABLE "public"."router_reservations"
  ADD CONSTRAINT "router_reservations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
