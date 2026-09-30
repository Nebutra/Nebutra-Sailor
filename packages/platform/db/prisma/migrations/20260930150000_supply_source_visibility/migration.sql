-- CreateEnum
CREATE TYPE "SupplyVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- AlterTable
ALTER TABLE "supply_sources" ADD COLUMN     "visibility" "SupplyVisibility" NOT NULL DEFAULT 'PUBLIC';
