import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws on import outside a React Server Component, which
      // is exactly its job — but it makes the modules that (correctly) declare
      // it unimportable from a test. Stubbed rather than dropped from the source:
      // the guard is what keeps these modules, and the system Prisma client they
      // hold, out of a client bundle.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.{test,spec}.ts"] },
});
