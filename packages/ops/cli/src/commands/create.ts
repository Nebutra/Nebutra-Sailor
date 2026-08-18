import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve create-sailor binary:
 * 1. Sibling package in monorepo (development / workspace)
 * 2. Fallback to PATH (`create-sailor`)
 */
function resolveCreateSailorBinary(): string {
  const siblingPath = resolve(__dirname, "../../../create-sailor/dist/index.js");
  if (existsSync(siblingPath)) return siblingPath;
  return "create-sailor";
}

/**
 * Forward argv after `create` so flags like `--region=cn` reach create-sailor.
 * Commander does not put unknown options into `cmd.args` reliably.
 */
function passthroughArgs(dir: string | undefined): string[] {
  const raw = process.argv.slice(2);
  const createIdx = raw.findIndex((a) => a === "create");
  if (createIdx < 0) return dir ? [dir] : [];
  return raw.slice(createIdx + 1);
}

export function registerCreateCommand(program: Command) {
  program
    .command("create [dir]")
    .description("Scaffold a new Sailor project (delegates to create-sailor)")
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (dir: string | undefined) => {
      // Thin wrapper: no second banner/outro — create-sailor owns the UX.
      const createSailorBin = resolveCreateSailorBinary();
      const args = passthroughArgs(dir);
      const useNode = createSailorBin.endsWith(".js");

      const child = useNode
        ? spawn(process.execPath, [createSailorBin, ...args], {
            stdio: "inherit",
            env: { ...process.env },
          })
        : spawn(createSailorBin, args, {
            stdio: "inherit",
            env: { ...process.env },
            shell: true,
          });

      child.on("close", (code) => {
        process.exit(code ?? 0);
      });

      child.on("error", (err: NodeJS.ErrnoException) => {
        logger.error(`Failed to launch create-sailor: ${err.message}`);
        if (err.code === "ENOENT") {
          process.stderr.write(
            `\n${pc.yellow("Tip:")} install the scaffolder:\n` +
              `  ${pc.cyan("npm i -g create-sailor")}\n` +
              `  ${pc.cyan("npx create-sailor@latest")}\n\n`,
          );
          process.exit(ExitCode.NOT_FOUND);
        }
        process.exit(ExitCode.ERROR);
      });
    });
}
