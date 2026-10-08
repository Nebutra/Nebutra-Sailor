import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@nebutra/auth/browser": fileURLToPath(
        new URL("../../packages/iam/auth/src/browser.ts", import.meta.url),
      ),
    },
  },
  test: { include: ["apps/kcq/src/**/*.test.{ts,tsx}"] },
});
