/** Reproducible external library checkout for CI; never reset a developer checkout. */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`KCQ source preparation failed: ${command}`);
}
export function resolveChartSource(root) {
  const explicit = process.env.KCQ_SOURCE_DIR;
  if (explicit) return resolve(explicit);
  const pin = JSON.parse(readFileSync(resolve(root, "chart-source.json"), "utf8"));
  const target = resolve(root, "../../.nebutra/kcq-source", pin.commit);
  if (!existsSync(resolve(target, ".git"))) {
    mkdirSync(target, { recursive: true });
    run("git", ["init", target], root);
    run("git", ["remote", "add", "origin", pin.repository], target);
    run("git", ["fetch", "--depth=1", "origin", pin.commit], target);
    run("git", ["checkout", "--detach", "FETCH_HEAD"], target);
  }
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: target, encoding: "utf8" });
  if (head.stdout.trim() !== pin.commit)
    throw new Error("KCQ cached source revision differs from its pin.");
  if (!existsSync(resolve(target, "node_modules/.modules.yaml"))) {
    run("pnpm", ["install", "--frozen-lockfile"], target);
  }
  if (!existsSync(resolve(target, "packages/vue/dist/index.d.ts"))) {
    run("pnpm", ["build:packages"], target);
  }
  return target;
}
