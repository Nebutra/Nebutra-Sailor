-- One balance per organization per product (ADR 2026-09-27 product wallets).
-- nebutra:destructive the (tenant_id) unique index gives way to (tenant_id, product); no row is dropped

-- AlterTable
ALTER TABLE "credit_balances" ADD COLUMN "product" VARCHAR(32);

-- Existing balances belong to the product that last wrote to them. Kuanlan tags
-- its ledger rows `app`, Router and Forge tag them `product`; an untagged
-- balance was only ever reachable through Router's console or the API gateway.
UPDATE "credit_balances" AS b
SET "product" = COALESCE(
  (
    SELECT COALESCE(t."metadata" ->> 'app', t."metadata" ->> 'product')
    FROM "credit_transactions" AS t
    WHERE t."credit_balance_id" = b."id"
      AND (t."metadata" ? 'app' OR t."metadata" ? 'product')
    ORDER BY t."created_at" DESC
    LIMIT 1
  ),
  'router'
);

ALTER TABLE "credit_balances" ALTER COLUMN "product" SET NOT NULL;

-- DropIndex
DROP INDEX "credit_balances_tenant_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_tenant_id_product_key" ON "credit_balances"("tenant_id", "product");
