-- Direct-to-object-storage upload metadata.
-- Additive only: creates upload enum type, upload table, and tenant-scoped indexes.

CREATE TYPE "public"."UploadStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);

CREATE TABLE "public"."uploads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "public"."UploadStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(32) NOT NULL,
    "bucket" VARCHAR(160) NOT NULL,
    "object_key" VARCHAR(700) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "idempotency_key" VARCHAR(120),
    "upload_url_expires_at" TIMESTAMP(3) NOT NULL,
    "etag" VARCHAR(255),
    "checksum_sha256" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "uploads_tenant_id_status_created_at_idx"
    ON "public"."uploads"("tenant_id", "status", "created_at" DESC);

CREATE INDEX "uploads_tenant_id_updated_at_idx"
    ON "public"."uploads"("tenant_id", "updated_at" DESC);

CREATE UNIQUE INDEX "uploads_tenant_id_idempotency_key_key"
    ON "public"."uploads"("tenant_id", "idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "public"."uploads"
    ADD CONSTRAINT "uploads_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
