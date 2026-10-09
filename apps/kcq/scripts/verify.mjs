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
  "packages/vue/src/components/TopToolbar.slots.test.ts",
  "packages/core/src/data/provider/impl/sources/index.ts",
  "scripts/core-source-aliases.mjs",
  "scripts/indicator-entrypoints-plugin.mjs",
]) {
  if (!existsSync(resolve(source, path)))
    throw new Error(`KCQ candidate lacks required product contract: ${path}`);
}
process.env.KCQ_SOURCE_DIR = source;
run(["install", "--frozen-lockfile"], source);
run(
  [
    "--dir",
    "packages/core",
    "exec",
    "vitest",
    "run",
    "src/foundation/persistence/__tests__",
    "src/data/provider/__tests__/router.test.ts",
  ],
  source,
);
run(
  ["--dir", "packages/vue", "exec", "vitest", "run", "src/components/TopToolbar.slots.test.ts"],
  source,
);
run(["build:packages"], source);
run(["turbo", "run", "build", "--filter=@nebutra/ui", "--filter=@nebutra/icons"]);
run(["exec", "vitest", "run", "--config", "apps/kcq/vitest.config.ts"]);
run(["--filter", "@nebutra/kcq", "typecheck"]);
run(["--filter", "@nebutra/kcq", "build"]);
if (!existsSync(resolve(app, "dist/index.html"))) throw new Error("KCQ product build is missing.");
if (!existsSync(resolve(app, "dist/home.html")))
  throw new Error("KCQ public pages were not prerendered.");
