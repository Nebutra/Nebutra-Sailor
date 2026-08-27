import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: process.env.DIRECT_URL,
  },
});
