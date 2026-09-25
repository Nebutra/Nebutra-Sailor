-- RFC 8628 device authorization (`nebutra login`).
--
-- `public.auth_device_codes`, snake_case — alongside auth_users / auth_sessions
-- / auth_accounts / auth_verifications, NOT the `auth`/`better_auth`-schema
-- BA-plugin tables (organization / member / passkey / invitation). This table
-- has to be reachable from TWO Better Auth instances that both mount the
-- `deviceAuthorization` plugin against it:
--
--   - the Node/Next auth-center route (Prisma adapter — model AuthDeviceCode
--     in schema.prisma)
--   - the production auth center, which is what actually serves
--     /api/auth/device/*: apps/auth/src/worker-edge.ts, a Cloudflare Workers
--     edge on Kysely + a raw `pg.Pool` at the default search_path. It can
--     only see `public` tables, addressed by literal name — it never goes
--     through Prisma, so a `better_auth`-schema table (reachable only via
--     Prisma's `@@schema`) would be invisible to it.
--
-- Both call sites pass the plugin's `schema: { deviceCode: { modelName:
-- "auth_device_codes", fields: {...} } }` option from one shared builder
-- (packages/iam/auth/src/providers/better-auth/device-authorization-config.ts)
-- so this table name and its columns are the single source both adapters
-- resolve against.
--
-- `user_id` is nullable: a row is created unclaimed (device polls before any
-- user has approved it) and is populated only once a signed-in user approves
-- the code at /device. No RLS — this table is keyed by device/user code and
-- read only by the auth center's own Better Auth instances, the same posture
-- as auth_sessions / auth_verifications.

CREATE TABLE "public"."auth_device_codes" (
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

    CONSTRAINT "auth_device_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_device_codes_device_code_key"
    ON "public"."auth_device_codes"("device_code");
CREATE UNIQUE INDEX "auth_device_codes_user_code_key"
    ON "public"."auth_device_codes"("user_code");
CREATE INDEX "auth_device_codes_user_id_idx"
    ON "public"."auth_device_codes"("user_id");
CREATE INDEX "auth_device_codes_expires_at_idx"
    ON "public"."auth_device_codes"("expires_at");

ALTER TABLE "public"."auth_device_codes"
    ADD CONSTRAINT "auth_device_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
