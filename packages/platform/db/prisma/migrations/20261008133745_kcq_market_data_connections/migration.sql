-- CreateTable
CREATE TABLE "market_data_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "masked_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_data_connections_tenant_id_idx" ON "market_data_connections"("tenant_id");

-- AddForeignKey
ALTER TABLE "market_data_connections" ADD CONSTRAINT "market_data_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
