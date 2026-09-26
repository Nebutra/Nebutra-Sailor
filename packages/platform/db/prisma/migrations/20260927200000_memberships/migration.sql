-- CreateEnum
CREATE TYPE "CreditLotSource" AS ENUM ('SUBSCRIPTION', 'PURCHASE', 'PROMO');

-- CreateTable
CREATE TABLE "credit_lots" (
    "id" TEXT NOT NULL,
    "credit_balance_id" TEXT NOT NULL,
    "source" "CreditLotSource" NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "remaining" DECIMAL(10,4) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "related_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product" VARCHAR(32) NOT NULL,
    "tier" VARCHAR(32) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "monthly_credits" INTEGER NOT NULL DEFAULT 0,
    "next_grant_at" TIMESTAMP(3),
    "applied_orders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_lots_credit_balance_id_expires_at_idx" ON "credit_lots"("credit_balance_id", "expires_at");

-- CreateIndex
CREATE INDEX "credit_lots_expires_at_idx" ON "credit_lots"("expires_at");

-- CreateIndex
CREATE INDEX "memberships_next_grant_at_idx" ON "memberships"("next_grant_at");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenant_id_product_key" ON "memberships"("tenant_id", "product");

-- AddForeignKey
ALTER TABLE "credit_lots" ADD CONSTRAINT "credit_lots_credit_balance_id_fkey" FOREIGN KEY ("credit_balance_id") REFERENCES "credit_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

