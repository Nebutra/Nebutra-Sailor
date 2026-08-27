-- Pebble support intake: diagnostic tickets and ordinary feedback.
--
-- Deliberately NOT tenant-scoped and therefore NOT under RLS: submissions come
-- from anonymous desktop clients, so there is no tenant to scope to. Access is
-- service-role only; nothing here is addressable by ticket id alone because the
-- object key carries a random component that only these rows record.
--
-- Contract: pebble/docs/reference/infra-index.md — 10-minute token lifetime,
-- 4 MiB cap, 30-day retention enforced by the hourly retention sweep.

-- CreateEnum
CREATE TYPE "PebbleDiagnosticStatus" AS ENUM ('PENDING_UPLOAD', 'STORED', 'DELETED');

-- CreateEnum
CREATE TYPE "PebbleFeedbackKind" AS ENUM ('FEEDBACK', 'CRASH');

-- CreateTable
CREATE TABLE "pebble_diagnostic_tickets" (
    "id" TEXT NOT NULL,
    "bundle_submission_id" VARCHAR(191) NOT NULL,
    "status" "PebbleDiagnosticStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "declared_bytes" INTEGER NOT NULL,
    "stored_bytes" INTEGER,
    "bucket" VARCHAR(191),
    "object_key" VARCHAR(255),
    "checksum_sha256" VARCHAR(64),
    "app_version" VARCHAR(64),
    "platform" VARCHAR(32),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "stored_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pebble_diagnostic_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pebble_feedback" (
    "id" TEXT NOT NULL,
    "submission_id" VARCHAR(191) NOT NULL,
    "kind" "PebbleFeedbackKind" NOT NULL DEFAULT 'FEEDBACK',
    "message" TEXT NOT NULL,
    "contact_email" VARCHAR(320),
    "app_version" VARCHAR(64),
    "platform" VARCHAR(32),
    "locale" VARCHAR(35),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pebble_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pebble_diagnostic_tickets_bundle_submission_id_key" ON "pebble_diagnostic_tickets"("bundle_submission_id");

-- CreateIndex: drives the hourly retention sweep.
CREATE INDEX "pebble_diagnostic_tickets_status_expires_at_idx" ON "pebble_diagnostic_tickets"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "pebble_feedback_submission_id_key" ON "pebble_feedback"("submission_id");

-- CreateIndex
CREATE INDEX "pebble_feedback_kind_created_at_idx" ON "pebble_feedback"("kind", "created_at" DESC);
