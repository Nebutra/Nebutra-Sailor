#!/usr/bin/env node
// =============================================================================
// design-sync CLI
// =============================================================================
// Commands:
//   design-sync detect        Print the resolved provider + env diagnostics
//   design-sync healthcheck   Run the provider's healthcheck()
//   design-sync pull          Pull design-tool → repo (DTCG JSON)
//   design-sync push          Push repo → design-tool (defaults to dry-run)
//
// Flags:
//   --dry-run        Force dry-run on push
//   --themes a,b     Restrict to specific token sets / themes
//   --provider X     Override DESIGN_SYNC_PROVIDER for this invocation
//   --json           Emit machine-readable JSON instead of human text
// =============================================================================

import { describeEnv } from "../detect";
import { createDesignSync } from "../factory";
import type { DesignSyncProviderType } from "../types";

interface ParsedArgs {
  command: string;
  dryRun: boolean;
  json: boolean;
  themes: string[];
  provider: DesignSyncProviderType | undefined;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [, , command = "help", ...rest] = argv;
  let dryRun = false;
  let json = false;
  const themes: string[] = [];
  let provider: DesignSyncProviderType | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--json") json = true;
    else if (arg === "--themes") {
      const next = rest[i + 1];
      if (next) {
        for (const t of next.split(",")) {
          const trimmed = t.trim();
          if (trimmed) themes.push(trimmed);
        }
        i++;
      }
    } else if (arg === "--provider") {
      const next = rest[i + 1];
      if (next) {
        provider = next.trim() as DesignSyncProviderType;
        i++;
      }
    }
  }

  return { command, dryRun, json, themes, provider };
}

function emit(payload: unknown, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  if (typeof payload === "string") {
    process.stdout.write(`${payload}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function emitError(message: string, json: boolean): void {
  if (json) {
    process.stderr.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  } else {
    process.stderr.write(`error: ${message}\n`);
  }
}

const HELP_TEXT = `design-sync — provider-agnostic design-tool sync

Usage:
  design-sync <command> [options]

Commands:
  detect            Print the resolved provider + env diagnostics
  healthcheck       Run the provider's healthcheck()
  pull              Pull design-tool → repo (DTCG JSON)
  push              Push repo → design-tool (defaults to dry-run on figma/penpot)
  help              Show this message

Options:
  --provider <X>    Override provider (figma|penpot|git-only|memory)
  --themes a,b      Restrict to specific token sets
  --dry-run         Force dry-run on push
  --json            Emit machine-readable JSON
`;

export async function run(argv: string[] = process.argv): Promise<number> {
  const args = parseArgs(argv);

  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  if (args.command === "detect") {
    const env = describeEnv();
    emit(env, args.json);
    return 0;
  }

  try {
    const provider = await createDesignSync(
      args.provider ? ({ provider: args.provider } as never) : undefined,
    );

    if (args.command === "healthcheck") {
      const status = await provider.healthcheck();
      emit(status, args.json);
      return status.ok ? 0 : 1;
    }

    if (args.command === "pull") {
      const themes = args.themes.length > 0 ? { themes: args.themes } : {};
      const result = await provider.pull(themes);
      emit(
        args.json
          ? result
          : `${result.summary} (provider=${result.provider}, sets=${result.sets.length})`,
        args.json,
      );
      return 0;
    }

    if (args.command === "push") {
      const opts: { themes?: string[]; dryRun?: boolean } = {};
      if (args.themes.length > 0) opts.themes = args.themes;
      if (args.dryRun) opts.dryRun = true;
      const result = await provider.push(opts);
      emit(
        args.json
          ? result
          : `${result.summary} (provider=${result.provider}, dryRun=${result.dryRun})`,
        args.json,
      );
      return 0;
    }

    emitError(`unknown command: ${args.command}\n\n${HELP_TEXT}`, args.json);
    return 2;
  } catch (error) {
    emitError((error as Error).message, args.json);
    return 1;
  }
}

// Run when invoked directly (not when imported in tests).
//
// We treat any of the following as "invoked as CLI":
//   - argv[1] basename matches `design-sync` (the bin entry)
//   - argv[1] basename matches the source/dist filename (`index.ts`, `index.js`)
//   - argv[1] is missing (e.g. `node --eval` style runners)
//   - DESIGN_SYNC_CLI env flag is set (escape hatch for unusual runners)
const invokedFromCli = (() => {
  if (typeof process === "undefined") return false;
  if (process.env?.DESIGN_SYNC_CLI === "1") return true;

  const entry = Array.isArray(process.argv) ? process.argv[1] : undefined;
  if (!entry) return false;

  const base = entry.split("/").pop() ?? entry;
  return /^(design-sync|index\.(c|m)?[jt]sx?)$/u.test(base);
})();

if (invokedFromCli) {
  run().then(
    (code) => {
      process.exit(code);
    },
    (error) => {
      process.stderr.write(`fatal: ${(error as Error).message}\n`);
      process.exit(1);
    },
  );
}
