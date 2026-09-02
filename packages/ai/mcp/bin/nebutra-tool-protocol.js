#!/usr/bin/env node
// Committed bin entry for `nebutra-tool-protocol`.
//
// pnpm links bins before any lifecycle script or build runs, so package.json#bin
// must point at a file that exists in a fresh checkout — dist/ does not. This
// file exists at link time and hands off to the tsup output once it is built.
// Guarded by tests/architecture/workspace-bin-stubs.test.ts.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const entry = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

if (!existsSync(entry)) {
  process.stderr.write(
    [
      `nebutra-tool-protocol: built entry not found at ${entry}`,
      "The package has not been built yet. Run `pnpm --filter @nebutra/mcp build` and retry.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// Keep argv identical to a direct `node dist/cli.js …` invocation.
process.argv[1] = entry;
await import(pathToFileURL(entry).href);
