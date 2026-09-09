import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

/**
 * Two projects, because the console has two kinds of test.
 *
 * The `node` project is the suite that already existed: edge money, SSE
 * parsing, key hashing — all of it needs real streams, `node:crypto` and the
 * `server-only` shim, and none of it wants a DOM. It is left exactly as it was.
 *
 * The `dom` project renders client components. It is separate rather than a
 * per-file `// @vitest-environment jsdom` docblock because the DOM half needs
 * things the node half must not get: `globals: true` and the
 * `@testing-library/jest-dom` setup file, which `setupFiles` would otherwise
 * load into all 153 node tests. Vitest 4 removed `environmentMatchGlobs`, so
 * `projects` is the mechanism that expresses "different environment, different
 * setup" without touching the existing suite.
 */

const alias = {
  "@": path.resolve(__dirname, "./src"),
  "server-only": path.resolve(__dirname, "./src/test/server-only.shim.ts"),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/dom-setup.ts"],
          // `@nebutra/ui`'s built barrel reaches three.js and a `react-tweet`
          // CSS module. Node's ESM loader cannot read `.css`, so the package
          // has to go through Vite's transform rather than be externalised.
          server: { deps: { inline: [/@nebutra\/ui/, /react-tweet/] } },
        },
      },
    ],
  },
});
