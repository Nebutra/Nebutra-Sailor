-- Add ChatSession table for persistent AI chat history.
--
-- Design notes:
--   - Messages stored as JSONB to preserve the @ai-sdk/react UIMessage[] shape
--     verbatim. We don't query message content; we fetch whole sessions.
--   - Strict (org, user) scoping — sessions are private to each member, even
--     within the same org. Hard-delete via cascade from either parent.
--   - `mode` is a soft-typed string (chat | data | workflow | search) so adding
--     new modes doesn't require a migration.
--   - Indices target the dashboard's primary access pattern: list a user's
--     recent sessions in an org, newest first.

-- CreateTable
CREATE TABLE "public"."chat_sessions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'New chat',
    "mode" VARCHAR(20) NOT NULL DEFAULT 'chat',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_sessions_organization_id_last_message_at_idx"
    ON "public"."chat_sessions"("organization_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_last_message_at_idx"
    ON "public"."chat_sessions"("user_id", "last_message_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_sessions"
    ADD CONSTRAINT "chat_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
