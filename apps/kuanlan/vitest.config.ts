import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // resources.test.ts calls vi.resetModules() between cases, so every case
    // re-imports ./resources.server — and with it the S3 client and Prisma
    // module graphs. The cost lands entirely on the first case of the file:
    // measured locally, 819ms for the first and 4-9ms for each of the six
    // after it.
    //
    // A cold GitHub runner pushes that first import past vitest's 5s default,
    // which failed "fails closed when S3 credentials are missing" with
    // "Test timed out in 5000ms" and blocked #592 — a PR that touches none of
    // this. The test is not slow; loading an AWS SDK is.
    //
    // Third instance of this shape after gateway-core (#580) and the pglite
    // suites (#593). There is no root vitest config to set a sane default in —
    // 51 packages each carry their own — so it is fixed here, again. A shared
    // preset would be the real answer.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only.shim.ts"),
      // Subpath first: the bare alias below is a prefix match and would turn
      // `@nebutra/auth/server` into `index.ts/server`.
      "@nebutra/auth/server": path.resolve(__dirname, "../../packages/iam/auth/src/server.ts"),
      "@nebutra/auth": path.resolve(__dirname, "../../packages/iam/auth/src/index.ts"),
    },
  },
});
