-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "title_i18n" JSONB;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "site_url" TEXT;

