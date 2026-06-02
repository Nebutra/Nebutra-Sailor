#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProgram } from "./program";
import { ExitCode } from "./utils/exit-codes";
import { maybeShowFirstRunBanner } from "./utils/first-run";
import { logger } from "./utils/logger";
import { maybeNotifyUpdate } from "./utils/update-notifier";

// TODO(error-handling): New commands MUST wrap their `.action(...)` body with
// `runCommand(...)` from "./utils/command-error" and throw `CommandError`
// (with a specific `ExitCode`) instead of calling `process.exit` directly.
// Existing commands migrate opportunistically — see command-error.ts for the
// migration guide.

// Read version from package.json at module load. Same relative path works for
// both `tsx src/index.ts` (dev) and `node dist/index.js` (prod) because src/
// and dist/ are siblings under packages/ops/cli/.
const PKG_JSON_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const VERSION = (JSON.parse(readFileSync(PKG_JSON_PATH, "utf8")) as { version: string }).version;

async function main() {
  // Show first-run telemetry opt-out banner (gated by TTY + env + marker)
  maybeShowFirstRunBanner();

  // Start update check in background (non-blocking)
  const notifyUpdate = await maybeNotifyUpdate(VERSION);

  // Auto-enable --yes mode when running in non-TTY (piped, CI/CD, Agent environments)
  const isInteractive = process.stdin.isTTY !== false && process.stdout.isTTY !== false;

  const program = buildProgram(VERSION, isInteractive);

  if (process.argv.length <= 2) {
    program.outputHelp();
    process.exit(ExitCode.SUCCESS);
  }

  await program.parseAsync(process.argv);

  // Show update notification (if available) after command completes
  await notifyUpdate();
}

main().catch((err) => logger.error(err instanceof Error ? err.message : String(err)));
