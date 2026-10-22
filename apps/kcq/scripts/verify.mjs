/** Shared compatibility gate for CI, candidates and releases. No cloud credentials required. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChartSource } from "./chart-source.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const app = resolve(root, "apps/kcq");
function run(args, cwd = root) {
  const result = spawnSync("pnpm", args, { cwd, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`KCQ validation failed: pnpm ${args.join(" ")}`);
}
const source = process.env.KCQ_SOURCE_DIR
  ? resolve(process.env.KCQ_SOURCE_DIR)
  : resolveChartSource(app);
for (const path of [
  "packages/core/src/foundation/persistence/persistence-scope.ts",
  "packages/vue/src/components/toolbar/TopToolbar.slots.test.ts",
  "packages/vue/scripts/script-editor-page-plugin.mjs",
  "packages/core/src/data/provider/impl/sources/index.ts",
  "scripts/core-source-aliases.mjs",
  "scripts/package-source-aliases.mjs",
  "scripts/indicator-entrypoints-plugin.mjs",
]) {
  if (!existsSync(resolve(source, path)))
    throw new Error(`KCQ candidate lacks required product contract: ${path}`);
}
process.env.KCQ_SOURCE_DIR = source;
run(["install", "--frozen-lockfile"], source);
// Contract tests import sibling packages through their dist exports (e.g.
// @363045841yyt/klinechart-plot-contracts), so a fresh checkout builds first.
run(["build:packages"], source);
run(
  [
    "--dir",
    "packages/core",
    "exec",
    "vitest",
    "run",
    "src/foundation/persistence/__tests__",
    "src/data/provider/__tests__/router.test.ts",
    "src/data/provider/protocol/__tests__/provider.test.ts",
    "src/engine/data/__tests__",
    "src/engine/data/marketRuntime/__tests__",
    "src/engine/layout/__tests__",
    "src/data/__tests__/barsLive.test.ts",
  ],
  source,
);
run(
  [
    "--dir",
    "packages/vue",
    "exec",
    "vitest",
    "run",
    "src/components/toolbar/TopToolbar.slots.test.ts",
    "src/features/agent/__tests__/browser-agent-bridge-managed.test.ts",
  ],
  source,
);
// Build every workspace package KCQ depends on (dist exports such as @nebutra/billing/links),
// not a hand-kept list that silently goes stale when a dependency is added.
run(["turbo", "run", "build", "--filter=@nebutra/kcq^..."]);
run(["--filter", "@nebutra/analytics", "test"]);
run(["exec", "vitest", "run", "--config", "apps/kcq/vitest.config.ts"]);
run(["--filter", "@nebutra/kcq", "typecheck"]);
run(["--filter", "@nebutra/kcq", "build"]);
if (!existsSync(resolve(app, "dist/index.html"))) throw new Error("KCQ product build is missing.");
if (!existsSync(resolve(app, "dist/home.html")))
  throw new Error("KCQ public pages were not prerendered.");
