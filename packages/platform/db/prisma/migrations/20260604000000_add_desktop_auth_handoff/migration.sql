-- Durable Nebutra desktop auth handoff.
-- The browser receives a short-lived, one-time handoff token after web auth.
-- The native desktop client exchanges that token for a revocable bearer
-- session token scoped to the desktop app scheme.

CREATE TABLE "public"."desktop_auth_handoffs" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheme" VARCHAR(40) NOT NULL,
    "state" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_auth_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "desktop_auth_handoffs_token_hash_key"
    ON "public"."desktop_auth_handoffs"("token_hash");
CREATE INDEX "desktop_auth_handoffs_user_id_created_at_idx"
    ON "public"."desktop_auth_handoffs"("user_id", "created_at" DESC);
CREATE INDEX "desktop_auth_handoffs_scheme_state_idx"
    ON "public"."desktop_auth_handoffs"("scheme", "state");
CREATE INDEX "desktop_auth_handoffs_expires_at_idx"
    ON "public"."desktop_auth_handoffs"("expires_at");

ALTER TABLE "public"."desktop_auth_handoffs"
    ADD CONSTRAINT "desktop_auth_handoffs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public"."desktop_auth_sessions" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheme" VARCHAR(40) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "desktop_auth_sessions_token_hash_key"
    ON "public"."desktop_auth_sessions"("token_hash");
CREATE UNIQUE INDEX "desktop_auth_sessions_handoff_id_key"
    ON "public"."desktop_auth_sessions"("handoff_id");
CREATE INDEX "desktop_auth_sessions_user_id_revoked_at_expires_at_idx"
    ON "public"."desktop_auth_sessions"("user_id", "revoked_at", "expires_at");
CREATE INDEX "desktop_auth_sessions_scheme_created_at_idx"
    ON "public"."desktop_auth_sessions"("scheme", "created_at" DESC);
CREATE INDEX "desktop_auth_sessions_expires_at_idx"
    ON "public"."desktop_auth_sessions"("expires_at");

ALTER TABLE "public"."desktop_auth_sessions"
    ADD CONSTRAINT "desktop_auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."desktop_auth_sessions"
    ADD CONSTRAINT "desktop_auth_sessions_handoff_id_fkey"
    FOREIGN KEY ("handoff_id") REFERENCES "public"."desktop_auth_handoffs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
