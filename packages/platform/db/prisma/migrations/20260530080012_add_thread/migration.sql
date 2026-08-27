-- Adds the Thread model: clean-slate conversation thread for the new Projects
-- sidebar group. Intentionally NOT coupled to the legacy ChatSession model.
-- Additive only — creates one new table, touches nothing existing.

-- CreateTable
CREATE TABLE "public"."threads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'Untitled',
    "summary" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "threads_organization_id_last_activity_at_idx"
    ON "public"."threads"("organization_id", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "threads_user_id_last_activity_at_idx"
    ON "public"."threads"("user_id", "last_activity_at" DESC);

-- AddForeignKey
ALTER TABLE "public"."threads"
    ADD CONSTRAINT "threads_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."threads"
    ADD CONSTRAINT "threads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
