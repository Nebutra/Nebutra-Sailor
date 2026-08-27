import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeDatabaseUrl = process.env.DATABASE_URL ?? "";
const migrationDatabaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  // datasource.url is required by Prisma 7 for `migrate dev` and `migrate diff`.
  // Using `??""` keeps Prisma's runtime client path (which only reads the env)
  // unaffected when DATABASE_URL is absent (e.g. during `prisma generate` in CI).
  datasource: {
    url: runtimeDatabaseUrl,
  },
  migrate: {
    // Supabase/Neon production deployments use a pooled DATABASE_URL for app
    // traffic and a direct URL for DDL. Fall back for local Docker Postgres.
    url: migrationDatabaseUrl,
  },
});
