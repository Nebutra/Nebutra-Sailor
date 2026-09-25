import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import {
  CAPABILITY_TABLE,
  findProjectRoot,
  readConfig,
  validateCapabilities,
} from "../utils/capabilities";
import { CommandError, runCommand } from "../utils/command-error";
import { ExitCode } from "../utils/exit-codes";
import { dryRunOutput, output, status } from "../utils/output";

interface SyncCommandOptions {
  dryRun?: boolean;
  json?: boolean;
  format?: string;
}

interface SyncResult {
  added: Record<string, string[]>;
  unchanged: string[];
  warnings: string[];
}

const ENV_EXAMPLE_FILE = ".env.example";
const ENV_LOCAL_FILE = ".env.local";

const ENV_LOCAL_HEADER = [
  "# Local secrets for this machine — never commit real values.",
  "# `nebutra sync` created this file; add your own keys below.",
  "",
].join("\n");

/**
 * Keys already declared as a real `KEY=value` assignment anywhere in the
 * file (comments do not count — a commented-out key is not "present").
 */
function existingAssignedKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (key) keys.add(key);
  }
  return keys;
}

interface EnvExamplePlan {
  content: string;
  added: string[];
  unchanged: string[];
}

/**
 * Compute (but do not write) the updated `.env.example` content: every env
 * key read by any provider of a declared capability, grouped under a
 * `# <capability> (<provider>)` comment, with keys already present anywhere
 * in the file left untouched.
 */
function planEnvExample(existingContent: string, capabilities: string[]): EnvExamplePlan {
  const existingKeys = existingAssignedKeys(existingContent);
  const added: string[] = [];
  const unchanged: string[] = [];
  const blocks: string[] = [];

  for (const capability of capabilities) {
    const spec = CAPABILITY_TABLE[capability];
    if (!spec) continue;

    for (const provider of spec.providers) {
      if (provider.envKeys.length === 0) continue;

      const missing: string[] = [];
      for (const key of provider.envKeys) {
        if (existingKeys.has(key)) {
          unchanged.push(key);
        } else {
          missing.push(key);
        }
      }

      if (missing.length === 0) continue;

      blocks.push(
        [`# ${capability} (${provider.id})`, ...missing.map((key) => `${key}=`)].join("\n"),
      );
      for (const key of missing) {
        existingKeys.add(key);
        added.push(key);
      }
    }
  }

  if (blocks.length === 0) {
    return { content: existingContent, added, unchanged };
  }

  const trimmedExisting = existingContent.replace(/\s+$/, "");
  const prefix = trimmedExisting.length > 0 ? `${trimmedExisting}\n\n` : "";
  const content = `${prefix}${blocks.join("\n\n")}\n`;

  return { content, added, unchanged };
}

export async function syncCommand(options: SyncCommandOptions): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());

  if (!projectRoot) {
    throw new CommandError({
      code: "manifest_not_found",
      message: "No nebutra.config.json found in this directory or any parent directory.",
      suggestion: "Run `npx create-sailor` to scaffold a Sailor project first.",
      exitCode: ExitCode.CONFIG_ERROR,
    });
  }

  const configPath = join(projectRoot, "nebutra.config.json");
  const config = readConfig(configPath);
  const declared = Array.isArray(config.capabilities) ? config.capabilities : [];

  const { capabilities, warnings } = validateCapabilities(declared);

  const envExamplePath = join(projectRoot, ENV_EXAMPLE_FILE);
  const envExampleExisted = existsSync(envExamplePath);
  const existingEnvExample = envExampleExisted ? readFileSync(envExamplePath, "utf-8") : "";

  const plan = planEnvExample(existingEnvExample, capabilities);

  const envLocalPath = join(projectRoot, ENV_LOCAL_FILE);
  const envLocalExisted = existsSync(envLocalPath);

  const added: Record<string, string[]> = {};
  if (plan.added.length > 0) {
    added[ENV_EXAMPLE_FILE] = plan.added;
  }
  if (!envLocalExisted) {
    added[ENV_LOCAL_FILE] = [];
  }

  const result: SyncResult = {
    added,
    unchanged: plan.unchanged,
    warnings,
  };

  const isJson = options.json === true || options.format === "json";

  if (options.dryRun) {
    dryRunOutput(
      {
        mode: "dry-run",
        command: "sync",
        projectRoot,
        ...result,
      },
      { format: isJson ? "json" : (options.format as "table" | "plain" | undefined) },
    );
    for (const warning of warnings) {
      status(warning, "warn");
    }
    process.exit(ExitCode.DRY_RUN_OK);
  }

  if (plan.added.length > 0 || !envExampleExisted) {
    writeFileSync(envExamplePath, plan.content);
  }

  if (!envLocalExisted) {
    writeFileSync(envLocalPath, ENV_LOCAL_HEADER);
  }

  if (isJson) {
    output(result, { format: "json" });
  } else {
    const lines: string[] = [];
    lines.push(pc.bold("nebutra sync"));
    lines.push(pc.dim(`project: ${projectRoot}`));
    lines.push("");

    const touchedFiles = Object.keys(added);
    if (touchedFiles.length === 0) {
      lines.push(pc.dim("Env files already match declared capabilities. Nothing to do."));
    } else {
      for (const file of touchedFiles) {
        const keys = added[file] ?? [];
        if (keys.length > 0) {
          lines.push(`${pc.green("+")} ${file}: added ${keys.join(", ")}`);
        } else {
          lines.push(`${pc.green("+")} ${file}: created`);
        }
      }
    }

    console.log(lines.join("\n"));
  }

  for (const warning of warnings) {
    status(warning, "warn");
  }

  status("Run `nebutra status` to check capability readiness.");
}

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description("Make .env.example / .env.local agree with the declared capabilities (idempotent)")
    .option("--dry-run", "Preview planned additions without writing files (exits with code 10)")
    .option("--json", "Emit machine-readable JSON")
    .action((options: SyncCommandOptions, command: Command) =>
      runCommand(async () => {
        const globalOptions = command.optsWithGlobals ? command.optsWithGlobals() : {};
        await syncCommand({
          dryRun: options.dryRun,
          json: options.json,
          format: (globalOptions as { format?: string }).format,
        });
      }),
    );
}
