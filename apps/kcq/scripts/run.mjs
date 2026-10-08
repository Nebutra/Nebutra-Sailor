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
try {
  const result = spawnSync("pnpm", args, {
    cwd: upstream,
    stdio: "inherit",
    env: { ...process.env, KCQ_SOURCE_DIR: upstream },
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (typeConfig) rmSync(typeConfig);
}
