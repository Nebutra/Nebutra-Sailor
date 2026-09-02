#!/usr/bin/env node
// Committed bin entry for `create-sailor`.
//
// pnpm links bins before any lifecycle script or build runs, so package.json#bin
// must point at a file that exists in a fresh checkout — dist/ does not. This
// file exists at link time and hands off to the tsup output once it is built.
// Guarded by tests/architecture/workspace-bin-stubs.test.ts.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const entry = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/index.js");

if (!existsSync(entry)) {
  process.stderr.write(
    [
      `create-sailor: built entry not found at ${entry}`,
      "The package has not been built yet. Run `pnpm --filter create-sailor build` and retry.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// Keep argv identical to a direct `node dist/index.js …` so commander and any
// main-module check in the built entry see exactly what they saw before.
process.argv[1] = entry;
await import(pathToFileURL(entry).href);
