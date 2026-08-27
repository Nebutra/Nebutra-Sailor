-- Add FeedbackReport table for in-app issue / feature feedback.
--
-- Design notes:
--   - Soft-typed `area` and `mode` so adding new product surfaces doesn't
--     require a schema migration.
--   - No foreign keys to Organization / AuthUser — feedback should survive
--     org/user deletion for trail purposes. The fields are still indexed
--     for the common admin query "show me unresolved feedback for org X".
--   - `resolved` defaults to false; admins flip it manually via a future
--     admin tool. Indices target (resolved DESC, created_at DESC) which is
--     the natural triage ordering.

-- CreateTable
CREATE TABLE "public"."feedback_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "area" VARCHAR(40) NOT NULL,
    "mode" VARCHAR(20),
    "description" TEXT NOT NULL,
    "contact_email" VARCHAR(254),
    "session_id" TEXT,
    "user_agent" VARCHAR(500),
    "page_url" VARCHAR(500),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_reports_organization_id_created_at_idx"
    ON "public"."feedback_reports"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_reports_resolved_created_at_idx"
    ON "public"."feedback_reports"("resolved", "created_at" DESC);
