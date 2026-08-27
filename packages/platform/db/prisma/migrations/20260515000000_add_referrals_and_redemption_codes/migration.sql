-- Add Referral + RedemptionCode + CodeRedemption tables.
--
-- TEMPLATE migration: tables ship empty and no UI exposes them yet. They
-- exist so the product team can activate referrals / promo codes without
-- a schema change later. Activation path:
--   1. Build /api/referrals and /api/redemption-codes routes
--   2. Wire to billing or growth surfaces
--   3. Optionally seed campaigns via @nebutra/db scripts

-- CreateTable: referrals
CREATE TABLE "public"."referrals" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "referrer_user_id" TEXT NOT NULL,
    "referred_email" VARCHAR(254),
    "referred_user_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reward_credits" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_code_key" ON "public"."referrals"("code");
CREATE INDEX "referrals_referrer_user_id_status_created_at_idx"
    ON "public"."referrals"("referrer_user_id", "status", "created_at" DESC);
CREATE INDEX "referrals_referred_user_id_idx"
    ON "public"."referrals"("referred_user_id");

-- CreateTable: redemption_codes
CREATE TABLE "public"."redemption_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "reward_amount" INTEGER NOT NULL DEFAULT 0,
    "reward_payload" JSONB NOT NULL DEFAULT '{}',
    "max_redemptions" INTEGER NOT NULL DEFAULT 1,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "campaign_name" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redemption_codes_code_key" ON "public"."redemption_codes"("code");
CREATE INDEX "redemption_codes_campaign_name_created_at_idx"
    ON "public"."redemption_codes"("campaign_name", "created_at" DESC);

-- CreateTable: code_redemptions
CREATE TABLE "public"."code_redemptions" (
    "id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "code_redemptions_code_id_user_id_key"
    ON "public"."code_redemptions"("code_id", "user_id");
CREATE INDEX "code_redemptions_user_id_redeemed_at_idx"
    ON "public"."code_redemptions"("user_id", "redeemed_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."code_redemptions"
    ADD CONSTRAINT "code_redemptions_code_id_fkey"
    FOREIGN KEY ("code_id") REFERENCES "public"."redemption_codes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
