import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Use forks pool with bounded concurrency — the inline @nebutra/* + React
    // tree per worker holds a lot of memory; default thread-pool fanout OOMs
    // GitHub Actions runners (~7 GB) on this app's test count.
    pool: "forks",
    // Vitest 4 unified pool options under top-level `maxWorkers` (replacing
    // v3's `poolOptions.forks.maxForks`). The matching `minWorkers` is gone in
    // v4's InlineConfig; vitest now picks the floor automatically based on
    // available CPUs. See https://vitest.dev/guide/migration#pool-rework
    maxWorkers: process.env.CI ? 2 : undefined,
    // Inline UI library + transitive deps that ship raw CSS / CSS-modules so
    // Vite's CSS pipeline handles them instead of Node's native loader, which
    // chokes on "Unknown file extension .css" when these are externalized
    // from node_modules. The dist barrel of @nebutra/ui pulls in react-tweet,
    // which imports *.module.css unconditionally.
    server: {
      deps: {
        inline: [/^@nebutra\//, /react-tweet/],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/**/*.{test,spec}.{ts,tsx}"],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only.shim.ts"),
      "react-tweet": path.resolve(__dirname, "./src/test/react-tweet.shim.ts"),
    },
  },
});
