-- CreateTable
CREATE TABLE "user_identity_links" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'better-auth',
    "subject" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identity_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_links_provider_subject_key" ON "user_identity_links"("provider", "subject");

-- CreateIndex
CREATE INDEX "user_identity_links_user_id_idx" ON "user_identity_links"("user_id");

-- AddForeignKey
ALTER TABLE "user_identity_links" ADD CONSTRAINT "user_identity_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
