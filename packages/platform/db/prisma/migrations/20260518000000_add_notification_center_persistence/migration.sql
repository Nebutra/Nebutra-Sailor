-- Add durable notification center storage for the direct notification provider.
-- Identifiers intentionally remain provider-agnostic strings so templates can
-- use Clerk, Better Auth, Auth.js, or service-token users without DB coupling.

CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT '',
    "type" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_tenant_id_read_created_at_idx"
    ON "public"."notifications"("user_id", "tenant_id", "read", "created_at" DESC);
CREATE INDEX "notifications_tenant_id_created_at_idx"
    ON "public"."notifications"("tenant_id", "created_at" DESC);

CREATE TABLE "public"."notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT '',
    "channel" VARCHAR(20) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabled_categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'immediate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_preferences_channel_check"
      CHECK ("channel" IN ('in_app', 'email', 'push', 'sms', 'chat')),
    CONSTRAINT "notification_preferences_frequency_check"
      CHECK ("frequency" IN ('immediate', 'daily', 'weekly', 'never'))
);

CREATE UNIQUE INDEX "notification_preferences_user_id_tenant_id_channel_key"
    ON "public"."notification_preferences"("user_id", "tenant_id", "channel");
CREATE INDEX "notification_preferences_tenant_id_channel_idx"
    ON "public"."notification_preferences"("tenant_id", "channel");
