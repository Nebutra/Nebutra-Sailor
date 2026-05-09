import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  // datasource.url is required by Prisma 7 for `migrate dev` and `migrate diff`.
  // Using `??""` keeps Prisma's runtime client path (which only reads the env)
  // unaffected when DATABASE_URL is absent (e.g. during `prisma generate` in CI).
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrate: {
    url: process.env.DATABASE_URL,
  },
});
