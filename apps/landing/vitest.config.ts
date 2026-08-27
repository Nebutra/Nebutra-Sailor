import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "scripts/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nebutra/billing": path.resolve(__dirname, "../../packages/commerce/billing/src/index.ts"),
      "@nebutra/icons": path.resolve(__dirname, "../../packages/design/icons/src/index.ts"),
      "@nebutra/license": path.resolve(__dirname, "../../packages/commerce/license/src/index.ts"),
      "@nebutra/logger": path.resolve(__dirname, "../../packages/platform/logger/src/index.ts"),
      "@nebutra/ui/components": path.resolve(
        __dirname,
        "../../packages/design/ui/src/components/index.ts",
      ),
      "@nebutra/ui/primitives": path.resolve(
        __dirname,
        "../../packages/design/ui/src/primitives/index.ts",
      ),
    },
  },
});
