import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Database tests each start a PGlite server; keep them from contending.
    fileParallelism: false,
  },
});
