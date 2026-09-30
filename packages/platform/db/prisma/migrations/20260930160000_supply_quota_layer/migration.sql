-- CreateEnum
CREATE TYPE "SupplyQuotaUnit" AS ENUM ('USD', 'TOKENS', 'REQUESTS');

-- CreateEnum
CREATE TYPE "SupplyQuotaSourceOfTruth" AS ENUM ('HEADER', 'ENDPOINT', 'SELF_METERED');

-- CreateEnum
CREATE TYPE "SupplyQuotaState" AS ENUM ('NOMINAL', 'THROTTLED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "SupplyQuotaAlertLevel" AS ENUM ('NONE', 'WARN_80', 'WARN_95', 'EXHAUSTED');

-- AlterTable
ALTER TABLE "supply_sources" ADD COLUMN     "plan_config" JSONB;

-- CreateTable
CREATE TABLE "supply_quota_windows" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "unit" "SupplyQuotaUnit" NOT NULL DEFAULT 'REQUESTS',
    "limit_amount" DOUBLE PRECISION,
    "used_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resets_at" TIMESTAMP(3),
    "window_seconds" INTEGER,
    "source_of_truth" "SupplyQuotaSourceOfTruth" NOT NULL DEFAULT 'SELF_METERED',
    "state" "SupplyQuotaState" NOT NULL DEFAULT 'NOMINAL',
    "burn_rate_per_hour" DOUBLE PRECISION,
    "forecast_exhaust_at" TIMESTAMP(3),
    "last_alert_level" "SupplyQuotaAlertLevel" NOT NULL DEFAULT 'NONE',
    "last_alert_at" TIMESTAMP(3),
    "last_forecast_alert_at" TIMESTAMP(3),
    "last_sample_at" TIMESTAMP(3),
    "next_pull_at" TIMESTAMP(3),
    "pull_interval_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_quota_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_quota_samples" (
    "id" TEXT NOT NULL,
    "quota_window_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_amount" DOUBLE PRECISION NOT NULL,
    "limit_amount" DOUBLE PRECISION,
    "delta_amount" DOUBLE PRECISION,
    "source_of_truth" "SupplyQuotaSourceOfTruth" NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "supply_quota_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supply_quota_windows_state_idx" ON "supply_quota_windows"("state");

-- CreateIndex
CREATE INDEX "supply_quota_windows_next_pull_at_idx" ON "supply_quota_windows"("next_pull_at");

-- CreateIndex
CREATE UNIQUE INDEX "supply_quota_windows_source_id_name_key" ON "supply_quota_windows"("source_id", "name");

-- CreateIndex
CREATE INDEX "supply_quota_samples_quota_window_id_at_idx" ON "supply_quota_samples"("quota_window_id", "at");

-- AddForeignKey
ALTER TABLE "supply_quota_windows" ADD CONSTRAINT "supply_quota_windows_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "supply_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_quota_samples" ADD CONSTRAINT "supply_quota_samples_quota_window_id_fkey" FOREIGN KEY ("quota_window_id") REFERENCES "supply_quota_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

