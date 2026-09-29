-- CreateTable
CREATE TABLE "studio_presets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_presets_user_id_updated_at_idx" ON "studio_presets"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "studio_presets" ADD CONSTRAINT "studio_presets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

