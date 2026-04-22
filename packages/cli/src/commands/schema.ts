import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { EXIT_CODE_DESCRIPTIONS } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";
import { listFeatureDescriptors } from "../utils/registry.js";
import { type CommandMeta, nebultraCommand } from "./metadata.js";

const EXIT_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(EXIT_CODE_DESCRIPTIONS).map(([code, description]) => [code, description]),
);

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
  extensions?: Record<string, unknown>;
}

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

function optionType(defaultValue: string | boolean | undefined): string {
  return typeof defaultValue === "boolean" ? "boolean" : "string";
}

function buildAddExtensions(): Record<string, unknown> {
  const features = listFeatureDescriptors().map((feature) => ({
    name: feature.name,
    description: feature.description,
    envFile: feature.envFile ?? ".env.local",
    providers: (feature.providers ?? []).map((provider) => ({
      id: provider.id,
      description: provider.description,
      dependencies: provider.dependencies ?? [],
      devDependencies: provider.devDependencies ?? [],
      env: provider.env ?? [],
    })),
    files: (feature.files ?? []).map((file) => file.path),
  }));

  const providerValues = Array.from(
    new Set(features.flatMap((feature) => feature.providers.map((provider) => provider.id))),
  );

  return {
    localFeatures: features,
    valueDomains: {
      components: features.map((feature) => feature.name),
      provider: providerValues,
    },
  };
}

function augmentAddSchema(schema: CommandSchema): CommandSchema {
  const nextArguments = schema.arguments.map((argument) =>
    argument.name === "components"
      ? {
          ...argument,
          description: "Local feature names to install from the Nebutra registry",
        }
      : argument,
  );

  const hasProviderOption = schema.options.some((option) => option.flags.includes("--provider"));
  const nextOptions = hasProviderOption
    ? schema.options
    : [
        ...schema.options,
        {
          flags: "--provider <id>",
          description: "Specify a provider for a local feature install",
          required: false,
          type: "string",
        },
      ];

  const nextExamples = [
    {
      command: "nebutra add queue --provider upstash",
      description: "Install the local queue feature starter with the Upstash provider",
    },
    {
      command: "nebutra add search --provider meilisearch --dry-run",
      description: "Preview the local search feature install plan as JSON",
    },
    ...schema.examples.filter(
      (example) => example.command.includes("--21st") || example.command.includes("--v0"),
    ),
  ];

  return {
    ...schema,
    arguments: nextArguments,
    options: nextOptions,
    examples: nextExamples,
    extensions: buildAddExtensions(),
  };
}

function metaToSchema(meta: CommandMeta): CommandSchema {
  const schema: CommandSchema = {
    name: meta.name,
    description: meta.description,
    usage: meta.usage,
    arguments: meta.arguments || [],
    options: (meta.options || []).map((option) => ({
      flags: option.flags,
      description: option.description,
      default: option.default,
      required: false,
      type: optionType(option.default),
    })),
    examples: meta.examples || [],
  };

  if (meta.name === "add") {
    return augmentAddSchema(schema);
  }

  return schema;
}

function getCommandSchema(commandName: string): CommandSchema | null {
  const subcommands = nebultraCommand.subcommands || [];
  const command = subcommands.find((entry) => entry.name === commandName);

  if (!command) {
    return null;
  }

  return metaToSchema(command);
}

function getGlobalOptions() {
  return (nebultraCommand.options ?? []).map((option) => ({
    flags: option.flags,
    description: option.description,
    required: false,
    type: optionType(option.default),
  }));
}

function getFullSchema(version: string): FullSchema {
  const subcommands = nebultraCommand.subcommands || [];

  return {
    name: nebultraCommand.name,
    version,
    description: nebultraCommand.description,
    usage: nebultraCommand.usage || "nebutra [command] [options]",
    globalOptions: getGlobalOptions(),
    commands: subcommands.map(metaToSchema),
    exitCodes: EXIT_CODES,
    timestamp: new Date().toISOString(),
  };
}

function listCommandNames(): string[] {
  const subcommands = nebultraCommand.subcommands || [];
  return subcommands.map((command) => command.name);
}

function outputJSON(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function isExitSignal(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith("EXIT:");
}

export async function schemaCommand(
  commandArg: string | undefined,
  options: Record<string, unknown>,
): Promise<void> {
  const isQuiet = options.quiet === true;
  const version = "0.1.0";

  try {
    if (options.all === true) {
      outputJSON(getFullSchema(version));
      process.exit(0);
    }

    if (options.list === true) {
      outputJSON(listCommandNames());
      process.exit(0);
    }

    if (options.exitCodes === true || options["exit-codes"] === true) {
      outputJSON(EXIT_CODES);
      process.exit(0);
    }

    if (commandArg) {
      const schema = getCommandSchema(commandArg);

      if (!schema) {
        if (!isQuiet) {
          logger.error(`Unknown command '${commandArg}'`);
          logger.info(`Available commands: ${listCommandNames().join(", ")}`);
        }
        process.exit(2);
      }

      outputJSON(schema);
      process.exit(0);
    }

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
    if (isExitSignal(error)) {
      throw error;
    }
    if (!isQuiet) {
      logger.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

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
