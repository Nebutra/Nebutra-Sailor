/**
 * Commander program definition.
 * Exported as `buildProgram()` so index.ts can call `.parse()` and
 * pull out `opts` + `args` without any I/O being performed here.
 */

import { Command } from "commander";
import { VERSION } from "../version";
import type { CliOptions } from "./types";

const PKG_NAME = "create-sailor";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name(PKG_NAME)
    .description("Nebutra-Sailor — AI-Native SaaS template")
    .version(VERSION, "-v, --version")
    .helpOption(false) // we render our own help
    .argument(
      "[name]",
      "project name or path (default: my-app; use . for current directory)",
      undefined,
    )
    .option("-p, --pm <id>", "npm | pnpm | yarn | bun")
    .option("--no-install", "skip package install")
    .option("--no-git", "skip git init")
    .option("-y, --yes", "non-interactive (use ./my-app when no name is given)")
    .option("--dry-run", "preview actions without writing files")
    .option("--json", "machine-readable output")
    .option("--no-color", "disable color output")
    .option("-h, --help", "show help");

  return program;
}

export type { CliOptions };
