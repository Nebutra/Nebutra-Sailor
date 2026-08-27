-- CreateEnum
CREATE TYPE "PlatformStaffRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_OPERATOR', 'PLATFORM_SUPPORT', 'PLATFORM_READONLY');

-- CreateTable
CREATE TABLE "platform_staff" (
    "user_id" TEXT NOT NULL,
    "role" "PlatformStaffRole" NOT NULL,
    "granted_by_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "platform_staff_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "platform_staff_role_revoked_at_idx" ON "platform_staff"("role", "revoked_at");

-- AddForeignKey
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
