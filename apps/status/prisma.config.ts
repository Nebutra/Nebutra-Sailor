import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Nebutra Status owns its database. A self-hosted install does not run the
 * Nebutra platform, so it cannot share packages/platform/db — see
 * docs/proposals/2026-10-16-status-product.md §0.
 */
export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.STATUS_DATABASE_URL ?? "",
    ...(process.env.STATUS_SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.STATUS_SHADOW_DATABASE_URL }
      : {}),
  },
});
