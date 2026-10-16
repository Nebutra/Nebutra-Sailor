#!/usr/bin/env node
// Committed bin entry for `nebutra`.
//
// pnpm links bins before any lifecycle script or build runs, so package.json#bin
// must point at a file that exists in a fresh checkout — dist/ does not. This
// file exists at link time and hands off to the tsup output once it is built.
// Guarded by tests/architecture/workspace-bin-stubs.test.ts.
//
// Inside a Sailor workspace (a freshly scaffolded project, or this monorepo)
// an unbuilt CLI builds itself once, so `pnpm nebutra status` answers right
// after `create-sailor` instead of asking for a build step. The build writes
// to stderr only: `--json` callers parse stdout. Anywhere else (a copied bin
// with no workspace around it) it exits 1 with the build hint.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const binDir = dirname(fileURLToPath(import.meta.url));
const entry = resolve(binDir, "../dist/index.js");

/** The nearest directory above the package that holds pnpm-workspace.yaml. */
function findWorkspaceRoot(from) {
  let dir = from;
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

if (!existsSync(entry)) {
  const workspaceRoot = findWorkspaceRoot(resolve(binDir, "../.."));
  if (workspaceRoot && existsSync(resolve(workspaceRoot, "node_modules"))) {
    process.stderr.write(
      "nebutra: building the CLI and its workspace dependencies once (first run, ~1-2 min)…\n",
    );
    spawnSync(
      "pnpm",
      ["--config.verify-deps-before-run=false", "--filter", "nebutra...", "run", "build"],
      {
        cwd: workspaceRoot,
        stdio: ["ignore", process.stderr, process.stderr],
        shell: process.platform === "win32",
      },
    );
  }
}

if (!existsSync(entry)) {
  process.stderr.write(
    [
      `nebutra: built entry not found at ${entry}`,
      "The package has not been built yet. Run `pnpm --filter nebutra build` and retry.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// dist/index.js only runs main() when process.argv[1] resolves to its own path
// (isEntrypoint), so make argv identical to a direct `node dist/index.js …`.
process.argv[1] = entry;
await import(pathToFileURL(entry).href);
