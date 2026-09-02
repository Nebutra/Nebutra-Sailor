#!/usr/bin/env node
// Committed bin entry for `nebutra`.
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
