import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface UnlinkOptions {
  force?: boolean;
  format?: string;
}

function findProjectRoot(start: string): string | null {
  let current = start;
  const { root } = parse(current);
  while (true) {
    if (existsSync(join(current, "package.json"))) return current;
    if (current === root) return null;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

async function handleUnlink(options: UnlinkOptions) {
  const isJson = options.format === "json";
  const projectRoot = findProjectRoot(process.cwd()) ?? process.cwd();
  const configPath = join(projectRoot, "nebutra.config.json");

  if (!existsSync(configPath)) {
    if (isJson) {
      console.log(
        JSON.stringify({ command: "unlink", success: true, alreadyUnlinked: true }, null, 2),
      );
    } else {
      logger.info("Already unlinked");
    }
    process.exit(ExitCode.SUCCESS);
  }

  if (options.force) {
    try {
      unlinkSync(configPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isJson) {
        console.log(JSON.stringify({ command: "unlink", success: false, error: msg }, null, 2));
      } else {
        logger.error(`Failed to delete config: ${msg}`);
      }
      process.exit(ExitCode.PERMISSION_DENIED);
    }
    if (isJson) {
      console.log(
        JSON.stringify(
          { command: "unlink", success: true, deletedConfig: true, configPath },
          null,
          2,
        ),
      );
    } else {
      logger.success("Removed nebutra.config.json");
    }
    return;
  }

  let config: Record<string, any> = {};
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    config = {};
  }

  if (!("projectId" in config)) {
    if (isJson) {
      console.log(
        JSON.stringify({ command: "unlink", success: true, alreadyUnlinked: true }, null, 2),
      );
    } else {
      logger.info("Already unlinked");
    }
    process.exit(ExitCode.SUCCESS);
  }

  const { projectId: _removed, ...rest } = config;
  writeFileSync(configPath, JSON.stringify(rest, null, 2) + "\n");

  if (isJson) {
    console.log(JSON.stringify({ command: "unlink", success: true, configPath }, null, 2));
  } else {
    logger.success("Unlinked from project");
  }
}

export function registerUnlinkCommand(program: Command) {
  program
    .command("unlink")
    .description("Remove the project link from nebutra.config.json")
    .option("--force", "Delete the entire nebutra.config.json")
    .option("--format <type>", "Output format: json or plain")
    .action(async (options, cmd) => {
      const globalOptions = cmd?.optsWithGlobals?.() || options;
      await handleUnlink({
        force: options.force || false,
        format: options.format || globalOptions.format,
      });
    });
}
