#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const truthy = new Set(["1", "true", "yes"]);

export function shouldSkipHookInstall(env = process.env) {
  if (truthy.has(String(env.NEBUTRA_INSTALL_GIT_HOOKS ?? "").toLowerCase())) {
    return false;
  }

  return (
    truthy.has(String(env.CI ?? "").toLowerCase()) ||
    truthy.has(String(env.NEBUTRA_SKIP_GIT_HOOKS ?? "").toLowerCase()) ||
    env.HUSKY === "0"
  );
}

export function hasUsableGitWorktree(cwd = process.cwd()) {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  return result.status === 0 && result.stdout.trim() === "true";
}

export function installGitHooks({
  cwd = process.cwd(),
  env = process.env,
  log = console.log,
  warn = console.warn,
} = {}) {
  if (shouldSkipHookInstall(env)) {
    log("Skipping git hook install for CI or non-interactive install.");
    return 0;
  }

  if (!hasUsableGitWorktree(cwd)) {
    warn("Skipping git hook install because no usable Git worktree was found.");
    return 0;
  }

  const result = spawnSync("lefthook", ["install"], {
    cwd,
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = installGitHooks();
}
