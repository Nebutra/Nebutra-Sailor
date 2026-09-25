import { join } from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import {
  CAPABILITY_TABLE,
  type CapabilityReport,
  type CapabilityState,
  evaluateCapability,
  findProjectRoot,
  loadEnv,
  readConfig,
} from "../utils/capabilities";
import { CommandError, runCommand } from "../utils/command-error";
import { ExitCode } from "../utils/exit-codes";
import { output } from "../utils/output";

interface StatusCommandOptions {
  json?: boolean;
  format?: string;
}

function stateColor(state: CapabilityState, text: string): string {
  switch (state) {
    case "live":
      return pc.green(text);
    case "local-fallback":
      return pc.yellow(text);
    case "missing-key":
      return pc.red(text);
    default:
      return text;
  }
}

export async function statusCommand(options: StatusCommandOptions): Promise<void> {
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

  const capabilities = Array.isArray(config.capabilities) ? config.capabilities : [];
  const env = loadEnv(projectRoot);
  const locale = env.NEBUTRA_LOCALE || "global";
  const stack = typeof config.stack === "string" ? config.stack : "unknown";

  const reports: CapabilityReport[] = capabilities.map((name) => {
    const spec = CAPABILITY_TABLE[name];
    if (!spec) {
      return {
        name,
        state: "missing-key",
        provider: [],
        missing: [],
        next: "unknown capability — no readiness rule registered in `nebutra status`",
      };
    }
    return evaluateCapability(name, spec, env);
  });

  const isJson = options.json === true || options.format === "json";

  if (isJson) {
    output(
      {
        stack,
        locale,
        capabilities: reports,
      },
      { format: "json" },
    );
    return;
  }

  const lines: string[] = [];
  lines.push(pc.bold(`nebutra status`));
  lines.push(pc.dim(`stack: ${stack}   locale: ${locale}   project: ${projectRoot}`));
  lines.push("");

  const nameWidth = Math.max(10, ...reports.map((r) => r.name.length));
  const stateWidth = Math.max(14, ...reports.map((r) => r.state.length));

  for (const report of reports) {
    const namePart = report.name.padEnd(nameWidth);
    const statePart = stateColor(report.state, report.state.padEnd(stateWidth));
    const providerPart = report.provider.length > 0 ? report.provider.join(", ") : "-";
    lines.push(`${namePart}  ${statePart}  ${pc.dim(providerPart)}`);
    if (report.state !== "live") {
      lines.push(`${" ".repeat(nameWidth)}  ${pc.dim(`→ ${report.next}`)}`);
    }
  }

  console.log(lines.join("\n"));
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show capability readiness — live, local-fallback, or missing-key, per env")
    .option("--json", "Emit machine-readable JSON")
    .action((options: StatusCommandOptions, command: Command) =>
      runCommand(async () => {
        const globalOptions = command.optsWithGlobals ? command.optsWithGlobals() : {};
        await statusCommand({
          json: options.json,
          format: (globalOptions as { format?: string }).format,
        });
      }),
    );
}
