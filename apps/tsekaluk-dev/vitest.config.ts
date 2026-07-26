import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nebutra/i18n/locales": path.resolve(
        __dirname,
        "../../packages/platform/i18n/src/locales.ts",
      ),
    },
  },
});
