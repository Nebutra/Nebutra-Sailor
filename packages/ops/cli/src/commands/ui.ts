import {
  type AgentComponentContract,
  type AgentComponentSummary,
  type AgentDocsMaturity,
  type AgentDocsStatus,
  type AgentManifest,
  type AgentValidationResult,
  loadAgentComponentContract,
  loadAgentManifest,
  searchAgentComponents,
  validateAgentComponent,
} from "@nebutra/ui/agent";
import type { Command } from "commander";
import { findMonorepoRoot } from "../utils/delegate";
import { notFoundError } from "../utils/errors";
import { ExitCode } from "../utils/exit-codes";

type OutputFormat = string | undefined;

interface ContractOptions {
  manifest?: string;
  format?: string;
  opts?: () => { format?: string; manifest?: string };
  optsWithGlobals?: () => { format?: string };
}

function resolveFormat(commandOrOptions: ContractOptions): OutputFormat {
  const local = commandOrOptions.opts ? commandOrOptions.opts() : commandOrOptions;
  const global = commandOrOptions.optsWithGlobals
    ? commandOrOptions.optsWithGlobals()
    : commandOrOptions;
  return local.format ?? global.format ?? readFormatArg();
}

function readFormatArg(): OutputFormat {
  const equalsArg = process.argv.find((arg) => arg.startsWith("--format="));
  if (equalsArg) return equalsArg.slice("--format=".length);
  const index = process.argv.indexOf("--format");
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function contractOptions(options: ContractOptions) {
  const local = options.opts ? options.opts() : options;
  return {
    root: findMonorepoRoot(),
    manifestPath: local.manifest,
  };
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatUiSearch(
  result: ReturnType<typeof searchAgentComponents>,
  format: OutputFormat = "json",
): string {
  if (format === "plain" || format === "table") {
    const lines = [`Nebutra UI components (${result.total})`, ""];
    for (const item of result.items) {
      lines.push(
        `${item.name.padEnd(22)} ${item.status.padEnd(12)} ${item.maturity.padEnd(10)} ${item.title}`,
      );
    }
    if (result.hasMore) lines.push("", `Next offset: ${result.nextOffset}`);
    return lines.join("\n");
  }

  return JSON.stringify(result, null, 2);
}

export function formatUiComponent(
  contract: AgentComponentContract,
  format: OutputFormat = "json",
): string {
  if (format === "plain" || format === "table") {
    return [
      `${contract.title} (${contract.name})`,
      `Status: ${contract.status}`,
      `Maturity: ${contract.maturity}`,
      `Source: ${contract.source}`,
      `Package import: ${contract.imports.package}`,
      `Registry: ${contract.imports.registry}`,
      `Docs: ${contract.docs.routes.join(", ") || "missing"}`,
      `Storybook: ${contract.docs.storybook ?? "missing"}`,
      `Tokens: ${contract.tokens.join(", ") || "none detected"}`,
    ].join("\n");
  }

  return JSON.stringify(contract, null, 2);
}

export function formatUiValidation(
  result:
    | AgentValidationResult
    | {
        valid: boolean;
        total: number;
        invalid: number;
        results: AgentValidationResult[];
      },
  format: OutputFormat = "json",
): string {
  if (format === "plain" || format === "table") {
    if ("results" in result) {
      const lines = [
        `Nebutra UI validation: ${result.valid ? "valid" : "invalid"}`,
        `Total: ${result.total}`,
        `Invalid: ${result.invalid}`,
      ];
      for (const item of result.results.filter((entry) => !entry.valid)) {
        lines.push(`- ${item.name}: ${item.errors.join("; ")}`);
      }
      return lines.join("\n");
    }

    return [
      `${result.name}: ${result.valid ? "valid" : "invalid"}`,
      ...result.errors.map((error) => `error: ${error}`),
      ...result.warnings.map((warning) => `warning: ${warning}`),
    ].join("\n");
  }

  return JSON.stringify(result, null, 2);
}

export function formatUiMigration(
  contract: AgentComponentContract,
  format: OutputFormat = "json",
): string {
  const payload = {
    component: contract.name,
    dryRun: true,
    codemods: contract.migration.codemods,
    hints: contract.migration.hints,
    requiredForBreakingChanges: contract.migration.requiredForBreakingChanges,
  };

  if (format === "plain" || format === "table") {
    return [
      `Migration hints for ${contract.name}`,
      `Codemods: ${payload.codemods.length === 0 ? "none registered" : payload.codemods.join(", ")}`,
      ...payload.hints.map((hint) => `- ${hint}`),
    ].join("\n");
  }

  return JSON.stringify(payload, null, 2);
}

function loadContractOrExit(name: string, options: ContractOptions): AgentComponentContract {
  try {
    return loadAgentComponentContract(name, contractOptions(options));
  } catch {
    notFoundError(
      `UI component contract not found: ${name}`,
      "Run `nebutra ui search <query> --format json` to discover available component ids.",
    );
  }
}

function loadManifestOrExit(options: ContractOptions): AgentManifest {
  try {
    return loadAgentManifest(contractOptions(options));
  } catch (error) {
    notFoundError(
      error instanceof Error ? error.message : "UI agent manifest not found",
      "Run `pnpm --filter @nebutra/design-docs build:registry` from the Nebutra monorepo.",
    );
  }
}

function validateAll(manifest: AgentManifest, options: ContractOptions) {
  const results = manifest.components.map((component: AgentComponentSummary) =>
    validateAgentComponent(loadAgentComponentContract(component.name, contractOptions(options))),
  );
  const invalid = results.filter((result) => !result.valid).length;
  return {
    valid: invalid === 0,
    total: results.length,
    invalid,
    results,
  };
}

export function registerUiCommand(program: Command): void {
  const ui = program
    .command("ui")
    .description("Inspect Nebutra UI agent contracts, production evidence, and migration hints");

  ui.command("search [query]")
    .description("Search the agent-readable @nebutra/ui component contract")
    .option("--limit <number>", "Maximum number of results", "20")
    .option("--offset <number>", "Pagination offset", "0")
    .option("--tag <tag>", "Filter by generated tag")
    .option("--status <status>", "Filter by status")
    .option("--maturity <maturity>", "Filter by maturity")
    .option("--manifest <path>", "Read a specific agent-manifest.json")
    .option("--format <type>", "Output format: json, table, plain")
    .action((query: string | undefined, options) => {
      const manifest = loadManifestOrExit(options);
      const result = searchAgentComponents(manifest, query ?? "", {
        limit: parseNumber(options.limit, 20),
        offset: parseNumber(options.offset, 0),
        tag: options.tag,
        status: options.status as AgentDocsStatus | undefined,
        maturity: options.maturity as AgentDocsMaturity | undefined,
      });
      console.log(formatUiSearch(result, resolveFormat(options)));
    });

  ui.command("component <name>")
    .description("Print one component contract with imports, evidence, and migration policy")
    .option("--manifest <path>", "Read a specific agent-manifest.json")
    .option("--format <type>", "Output format: json, table, plain")
    .action((name: string, options) => {
      const contract = loadContractOrExit(name, options);
      console.log(formatUiComponent(contract, resolveFormat(options)));
    });

  ui.command("validate [name]")
    .description("Validate production evidence for one component or the full UI contract")
    .option("--manifest <path>", "Read a specific agent-manifest.json")
    .option("--warn-only", "Report validation failures without a non-zero exit")
    .option("--format <type>", "Output format: json, table, plain")
    .action((name: string | undefined, options) => {
      const result = name
        ? validateAgentComponent(loadContractOrExit(name, options))
        : validateAll(loadManifestOrExit(options), options);
      console.log(formatUiValidation(result, resolveFormat(options)));
      if (!result.valid && !options.warnOnly) {
        process.exit(ExitCode.INCOMPATIBLE);
      }
    });

  ui.command("migrate <name>")
    .description("Print dry-run codemod and migration hints for a component")
    .option("--manifest <path>", "Read a specific agent-manifest.json")
    .option("--apply", "Reserved for future codemod execution")
    .option("--format <type>", "Output format: json, table, plain")
    .action((name: string, options) => {
      if (options.apply) {
        console.error(
          "Codemod execution is not implemented yet. Use `nebutra ui migrate <name>` for the dry-run plan.",
        );
        process.exit(ExitCode.INCOMPATIBLE);
      }
      const contract = loadContractOrExit(name, options);
      console.log(formatUiMigration(contract, resolveFormat(options)));
    });
}
