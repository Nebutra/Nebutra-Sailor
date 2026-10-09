/** Build with the canonical chart toolchain; paths stay deployment-configurable. */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChartSource } from "./chart-source.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolveChartSource(root);
if (
  !source ||
  !existsSync(resolve(source, "packages/core/src/foundation/persistence/persistence-scope.ts"))
) {
  throw new Error(
    "Set KCQ_SOURCE_DIR to the canonical KCQ checkout with the persistence-scope API.",
  );
}
const upstream = resolve(source);
const mode = process.argv[2];
const config = resolve(root, "vite.config.mjs");
let args;
let typeConfig;
if (mode === "typecheck") {
  typeConfig = resolve(root, ".kcq-typecheck.json");
  writeFileSync(
    typeConfig,
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          jsx: "react-jsx",
          skipLibCheck: true,
          noEmit: true,
          lib: ["DOM", "ESNext"],
          types: [],
          allowImportingTsExtensions: true,
          paths: {
            "@363045841yyt/klinechart": [resolve(upstream, "packages/vue/dist/index.d.ts")],
            "@363045841yyt/klinechart-core": [resolve(upstream, "packages/core/dist/index.d.ts")],
            "@363045841yyt/klinechart-core/config": [
              resolve(upstream, "packages/core/dist/foundation/config/chartSettings.d.ts"),
            ],
            "@363045841yyt/klinechart-core/market-data": [
              resolve(upstream, "packages/core/dist/data/provider/index.d.ts"),
            ],
            "@363045841yyt/klinechart-core/market-data/sources": [
              resolve(upstream, "packages/core/dist/data/provider/impl/sources/index.d.ts"),
            ],
            "@363045841yyt/klinechart-core/persistence-scope": [
              resolve(upstream, "packages/core/dist/foundation/persistence/persistence-scope.d.ts"),
            ],
            "@363045841yyt/klinechart-agent-runtime/browser": [
              resolve(upstream, "packages/agent-runtime/dist/browser.d.ts"),
            ],
            "@nebutra/auth/browser": [resolve(root, "../../packages/iam/auth/src/browser.ts")],
          },
        },
        include: [
          resolve(root, "src/**/*.ts"),
          resolve(root, "src/**/*.tsx"),
          resolve(root, "src/**/*.vue"),
        ],
      },
      null,
      2,
    ),
  );
  args = ["exec", "vue-tsc", "--noEmit", "-p", typeConfig];
} else {
  args = ["exec", "vite", ...(mode === "build" ? ["build"] : []), "--config", config];
}
const prerenderDir = resolve(root, ".kcq-prerender");
function pnpm(stepArgs) {
  const result = spawnSync("pnpm", stepArgs, {
    cwd: upstream,
    stdio: "inherit",
    env: { ...process.env, KCQ_SOURCE_DIR: upstream },
  });
  return result.status ?? 1;
}
try {
  let status = pnpm(args);
  if (mode === "build" && status === 0) {
    // Public pages become static HTML; the app stays a SPA (scripts/prerender.mjs).
    status = pnpm([
      "exec",
      "vite",
      "build",
      "--config",
      config,
      "--ssr",
      resolve(root, "src/public/entry-server.ts"),
      "--outDir",
      prerenderDir,
    ]);
    if (status === 0) {
      const result = spawnSync(
        process.execPath,
        [resolve(root, "scripts/prerender.mjs"), prerenderDir, resolve(root, "dist")],
        { stdio: "inherit" },
      );
      status = result.status ?? 1;
    }
  }
  process.exitCode = status;
} finally {
  if (typeConfig) rmSync(typeConfig);
  rmSync(prerenderDir, { recursive: true, force: true });
}
