import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { type CommandMeta, nebultraCommand } from "./metadata.js";

/**
 * Exit codes used throughout the CLI
 */
const EXIT_CODES: Record<number, string> = {
  0: "Success",
  1: "General error (command failed)",
  2: "Misuse of shell command (invalid arguments/options)",
  64: "EX_USAGE — command line usage error",
  65: "EX_DATAERR — data format error",
  66: "EX_NOINPUT — cannot open input",
  67: "EX_NOUSER — addressee unknown",
  68: "EX_NOHOST — host name unknown",
  69: "EX_UNAVAILABLE — service unavailable",
  70: "EX_SOFTWARE — internal software error",
  71: "EX_OSERR — operating system error",
  72: "EX_OSFILE — critical OS file missing",
  73: "EX_CANTCREAT — cannot create output file",
  74: "EX_IOERR — input/output error",
  75: "EX_TEMPFAIL — temporary failure (retry later)",
  76: "EX_PROTOCOL — remote protocol error",
  77: "EX_NOPERM — permission denied",
  78: "EX_CONFIG — configuration error",
};

/**
 * Schema representation of a single command
 */
interface CommandSchema {
  name: string;
  description: string;
  usage?: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
    variadic?: boolean;
  }>;
  options: Array<{
    flags: string;
    description: string;
    default?: string | boolean;
    required?: boolean;
    type?: string;
  }>;
  examples: Array<{
    command: string;
    description: string;
  }>;
}

/**
 * Full schema output structure
 */
interface FullSchema {
  name: string;
  version: string;
  description: string;
  usage: string;
  globalOptions: Array<{
    flags: string;
    description: string;
    required?: boolean;
    type?: string;
  }>;
  commands: CommandSchema[];
  exitCodes: Record<string, string>;
  timestamp: string;
}

/**
 * Convert CommandMeta to CommandSchema
 */
function metaToSchema(meta: CommandMeta): CommandSchema {
  return {
    name: meta.name,
    description: meta.description,
    usage: meta.usage,
    arguments: meta.arguments || [],
    options: (meta.options || []).map((opt) => ({
      flags: opt.flags,
      description: opt.description,
      default: opt.default,
      required: false,
      type: typeof opt.default === "boolean" ? "boolean" : "string",
    })),
    examples: meta.examples || [],
  };
}

/**
 * Get schema for a specific command (by name)
 */
function getCommandSchema(commandName: string): CommandSchema | null {
  const subcommands = nebultraCommand.subcommands || [];
  const command = subcommands.find((cmd) => cmd.name === commandName);

  if (!command) {
    return null;
  }

  return metaToSchema(command);
}

/**
 * Get full schema for all commands
 */
function getFullSchema(version: string): FullSchema {
  const subcommands = nebultraCommand.subcommands || [];

  const globalOptions = [
    {
      flags: "--verbose",
      description: "Enable verbose output",
      required: false,
      type: "boolean",
    },
    {
      flags: "--quiet",
      description: "Suppress non-essential output",
      required: false,
      type: "boolean",
    },
    {
      flags: "--help",
      description: "Show help message",
      required: false,
      type: "boolean",
    },
    {
      flags: "--version",
      description: "Show version number",
      required: false,
      type: "boolean",
    },
  ];

  return {
    name: nebultraCommand.name,
    version,
    description: nebultraCommand.description,
    usage: nebultraCommand.usage || "nebutra [command] [options]",
    globalOptions,
    commands: subcommands.map(metaToSchema),
    exitCodes: EXIT_CODES,
    timestamp: new Date().toISOString(),
  };
}

/**
 * List command names only
 */
function listCommandNames(): string[] {
  const subcommands = nebultraCommand.subcommands || [];
  return subcommands.map((cmd) => cmd.name);
}

/**
 * Output JSON to stdout
 */
function outputJSON(_data: unknown): void {}

/**
 * Handle schema command with various options
 */
export async function schemaCommand(
  commandArg: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  // Suppress intro message for JSON output (Agent-friendly)
  const isQuiet = options.quiet === true;
  const version = "0.1.0"; // Should match main CLI version

  try {
    // --all: show full schema
    if (options.all === true) {
      const schema = getFullSchema(version);
      outputJSON(schema);
      process.exit(0);
    }

    // --list: show command names only
    if (options.list === true) {
      const names = listCommandNames();
      outputJSON(names);
      process.exit(0);
    }

    // --exit-codes: show exit code reference
    if (options["exit-codes"] === true) {
      outputJSON(EXIT_CODES);
      process.exit(0);
    }

    // Specific command: nebutra schema init
    if (commandArg) {
      const schema = getCommandSchema(commandArg);

      if (!schema) {
        if (!isQuiet) {
          console.error(pc.red(`Error: Unknown command '${commandArg}'`));
          console.error(pc.dim("Available commands: " + listCommandNames().join(", ")));
        }
        process.exit(2);
      }

      outputJSON(schema);
      process.exit(0);
    }

    // No arguments, no options: show help
    if (!isQuiet) {
      p.intro(pc.bgCyan(pc.black(" nebutra schema ")));
      p.log.info(
        pc.cyan("Agent-friendly introspection of CLI commands, arguments, and value domains."),
      );
      p.log.message("");
      p.log.info(pc.bold("Usage:"));
      p.log.message(pc.dim("  nebutra schema --all                Show full command tree as JSON"));
      p.log.message(
        pc.dim("  nebutra schema <command>            Show schema for a specific command"),
      );
      p.log.message(pc.dim("  nebutra schema --list               List available command names"));
      p.log.message(pc.dim("  nebutra schema --exit-codes         Show exit codes reference"));
      p.log.message("");
      p.log.info(pc.bold("Example:"));
      p.log.message(pc.dim("  nebutra schema add"));
      p.log.message(pc.dim("  nebutra schema --all | jq '.commands[0]'"));
      p.outro(pc.cyan("All output is JSON for easy parsing by agents and automation tools."));
    }

    process.exit(0);
  } catch (error) {
    if (!isQuiet) {
      console.error(pc.red("Error:"), error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

/**
 * Register schema command with commander
 */
export function registerSchemaCommand(program: Command): void {
  program
    .command("schema [command]")
    .description("Show command schema and argument documentation (Agent-friendly JSON output)")
    .option("--all", "Show full schema for all commands")
    .option("--list", "List all available command names")
    .option("--exit-codes", "Show exit codes reference")
    .action(async (command: string | undefined, options) => {
      await schemaCommand(command, options);
    });
}
