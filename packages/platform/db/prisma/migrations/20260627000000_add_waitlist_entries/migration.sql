-- Add durable public waitlist entries for the PLG referral loop.
--
-- This table is global/pre-auth, not tenant-scoped application data. Position
-- uses SERIAL semantics so concurrent public signups do not race on count + 1.

CREATE TABLE "public"."waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "position" SERIAL NOT NULL,
    "referral_code" VARCHAR(40) NOT NULL,
    "referred_by" VARCHAR(40),
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admitted_at" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key"
    ON "public"."waitlist_entries"("email");
CREATE UNIQUE INDEX "waitlist_entries_position_key"
    ON "public"."waitlist_entries"("position");
CREATE UNIQUE INDEX "waitlist_entries_referral_code_key"
    ON "public"."waitlist_entries"("referral_code");
CREATE INDEX "waitlist_entries_status_created_at_idx"
    ON "public"."waitlist_entries"("status", "created_at" DESC);
CREATE INDEX "waitlist_entries_referred_by_idx"
    ON "public"."waitlist_entries"("referred_by");
CREATE INDEX "waitlist_entries_referral_count_created_at_idx"
    ON "public"."waitlist_entries"("referral_count", "created_at" DESC);
