#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const pushRef = spawnSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{push}"], {
  encoding: "utf8",
});
const range =
  pushRef.status === 0 && pushRef.stdout.trim() ? "@{push}...HEAD" : "origin/main...HEAD";

const result = spawnSync("./node_modules/.bin/turbo", ["typecheck", `--filter=...[${range}]`], {
  stdio: "inherit",
  env: { ...process.env, npm_config_verify_deps_before_run: "false" },
});

process.exit(result.status ?? 1);
