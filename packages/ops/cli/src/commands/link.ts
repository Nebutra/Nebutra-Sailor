import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";

interface LinkOptions {
  yes?: boolean;
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

function readConfig(configPath: string): Record<string, any> {
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(configPath: string, config: Record<string, any>) {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

async function handleLink(projectId: string | undefined, options: LinkOptions) {
  const isJson = options.format === "json";
  const projectRoot = findProjectRoot(process.cwd());

  if (!projectRoot) {
    if (isJson) {
      console.log(
        JSON.stringify(
          { command: "link", success: false, error: "No package.json found upstream" },
          null,
          2,
        ),
      );
    } else {
      logger.error("No package.json found in current or parent directories.");
    }
    process.exit(ExitCode.NOT_FOUND);
  }

  let id = projectId;
  if (!id) {
    if (options.yes) {
      if (isJson) {
        console.log(
          JSON.stringify(
            { command: "link", success: false, error: "project-id required in --yes mode" },
            null,
            2,
          ),
        );
      } else {
        logger.error("project-id is required when running with --yes / non-interactive.");
      }
      process.exit(ExitCode.INVALID_ARGS);
    }
    const answer = await p.text({
      message: "Project ID to link to:",
      placeholder: "proj_abc123",
      validate: (v) => (v && v.trim().length > 0 ? undefined : "Project ID cannot be empty"),
    });
    if (p.isCancel(answer)) {
      logger.warn("Cancelled");
      process.exit(ExitCode.CANCELLED);
    }
    id = String(answer).trim();
  }

  const configPath = join(projectRoot, "nebutra.config.json");
  const config = readConfig(configPath);
  const next = { ...config, projectId: id };
  writeConfig(configPath, next);

  if (isJson) {
    console.log(
      JSON.stringify({ command: "link", success: true, projectId: id, configPath }, null, 2),
    );
  } else {
    logger.success(`Linked to project: ${id}`);
  }
}

export function registerLinkCommand(program: Command) {
  program
    .command("link [project-id]")
    .description("Link the current project to a Nebutra project id")
    .option("--format <type>", "Output format: json or plain")
    .action(async (projectId: string | undefined, options, cmd) => {
      const globalOptions = cmd?.optsWithGlobals?.() || options;
      await handleLink(projectId, {
        yes: globalOptions.yes || false,
        format: options.format || globalOptions.format,
      });
    });
}
