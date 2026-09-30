-- CreateEnum
CREATE TYPE "SupplySourceKind" AS ENUM ('OPENAI_COMPATIBLE', 'NEWAPI_CHANNEL', 'CLIPROXYAPI', 'FAL_AI');

-- CreateEnum
CREATE TYPE "SupplyProtocol" AS ENUM ('OPENAI_COMPATIBLE', 'NEWAPI_ADMIN', 'CLIPROXY_MANAGEMENT', 'FAL_REST', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SupplyModality" AS ENUM ('TEXT', 'IMAGE', 'EMBEDDING', 'AUDIO', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplyModelState" AS ENUM ('PENDING', 'AVAILABLE', 'DEGRADED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupplyProbeKind" AS ENUM ('DISCOVERY', 'ACTIVE_PROBE', 'PASSIVE_SIGNAL', 'STATE_TRANSITION', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "SupplyProbeOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'ERROR');

-- CreateTable
CREATE TABLE "supply_sources" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "kind" "SupplySourceKind" NOT NULL,
    "protocol" "SupplyProtocol" NOT NULL DEFAULT 'UNKNOWN',
    "label" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "credential_ref" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_discovered_at" TIMESTAMP(3),
    "last_discovery_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_source_models" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "upstream_model" VARCHAR(160) NOT NULL,
    "modality" "SupplyModality" NOT NULL DEFAULT 'TEXT',
    "capabilities" JSONB,
    "upstream_price" JSONB,
    "public_model" TEXT,
    "state" "SupplyModelState" NOT NULL DEFAULT 'PENDING',
    "state_reason" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "consecutive_successes" INTEGER NOT NULL DEFAULT 0,
    "last_probe_at" TIMESTAMP(3),
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "next_probe_at" TIMESTAMP(3),
    "backoff_seconds" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vanished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_source_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_probe_events" (
    "id" TEXT NOT NULL,
    "source_model_id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "SupplyProbeKind" NOT NULL,
    "outcome" "SupplyProbeOutcome" NOT NULL,
    "reason" TEXT,
    "from_state" "SupplyModelState",
    "to_state" "SupplyModelState",
    "latency_ms" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "supply_probe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supply_sources_key_key" ON "supply_sources"("key");

-- CreateIndex
CREATE INDEX "supply_source_models_public_model_state_idx" ON "supply_source_models"("public_model", "state");

-- CreateIndex
CREATE INDEX "supply_source_models_state_next_probe_at_idx" ON "supply_source_models"("state", "next_probe_at");

-- CreateIndex
CREATE UNIQUE INDEX "supply_source_models_source_id_upstream_model_key" ON "supply_source_models"("source_id", "upstream_model");

-- CreateIndex
CREATE INDEX "supply_probe_events_source_model_id_at_idx" ON "supply_probe_events"("source_model_id", "at");

-- AddForeignKey
ALTER TABLE "supply_source_models" ADD CONSTRAINT "supply_source_models_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "supply_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_probe_events" ADD CONSTRAINT "supply_probe_events_source_model_id_fkey" FOREIGN KEY ("source_model_id") REFERENCES "supply_source_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

