-- Payment orders: one row per attempt to pay for one offer, any provider.
--
-- Until now a wallet notification credited the organization straight from the
-- metadata it carried, and nothing recorded the money itself: no row to
-- reconcile a lost notification against, to refund from, or to check the paid
-- amount with. The order is written before the provider is called, so its id
-- doubles as the provider's merchant order number (out_trade_no).
--
-- Additive only: a new enum and a new table, nothing existing is touched.

CREATE TYPE "public"."PaymentOrderStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'EXPIRED');

CREATE TABLE "public"."payment_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "offer_id" VARCHAR(64) NOT NULL,
    "fulfillment" JSONB NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "provider_ref" TEXT,
    "status" "public"."PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paid_minor" INTEGER,
    "paid_at" TIMESTAMP(3),
    "fulfilled_at" TIMESTAMP(3),
    "refunded_minor" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_orders_tenant_id_created_at_idx" ON "public"."payment_orders"("tenant_id", "created_at");
CREATE INDEX "payment_orders_status_created_at_idx" ON "public"."payment_orders"("status", "created_at");

-- Same posture as "payments" (20260903000000_rls_full_tenant_coverage):
-- tenants see their own orders; the system role (webhooks, reconcile) sees all.
ALTER TABLE "payment_orders" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_orders_bypass" ON "payment_orders";
CREATE POLICY "payment_orders_bypass" ON "payment_orders"
  AS PERMISSIVE FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "payment_orders_tenant" ON "payment_orders";
CREATE POLICY "payment_orders_tenant" ON "payment_orders"
  AS PERMISSIVE FOR ALL
  USING ("tenant_id" = current_org_id())
  WITH CHECK ("tenant_id" = current_org_id());
