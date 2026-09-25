-- RFC 8628 device authorization (`nebutra login`).
--
-- Backs Better Auth's `deviceAuthorization` plugin, mounted only on the auth
-- center (apps/auth) — see packages/iam/auth/src/providers/better-auth.ts and
-- apps/auth/src/lib/auth.ts. Model/field names mirror the plugin's own
-- defaults verbatim so its Prisma adapter resolves rows without a `schema`
-- override; only the DB-facing names are snake_case, matching every other
-- `auth`-schema table added in 20260510000000_add_ba_orgs_passkeys.
--
-- `user_id` is nullable: a row is created unclaimed (device polls before any
-- user has approved it) and is populated only once a signed-in user approves
-- the code at /device. No RLS — this table is keyed by device/user code and
-- read only by the auth center itself, the same posture as `passkey` /
-- `organization` / `member` in this schema.

-- CreateTable
CREATE TABLE "better_auth"."deviceCode" (
    "id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_polled_at" TIMESTAMP(3),
    "polling_interval" INTEGER,
    "client_id" TEXT,
    "scope" TEXT,

    CONSTRAINT "deviceCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deviceCode_device_code_key" ON "better_auth"."deviceCode"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "deviceCode_user_code_key" ON "better_auth"."deviceCode"("user_code");

-- CreateIndex
CREATE INDEX "deviceCode_user_id_idx" ON "better_auth"."deviceCode"("user_id");

-- CreateIndex
CREATE INDEX "deviceCode_expires_at_idx" ON "better_auth"."deviceCode"("expires_at");

-- AddForeignKey
ALTER TABLE "better_auth"."deviceCode" ADD CONSTRAINT "deviceCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
