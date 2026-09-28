import * as p from "@clack/prompts";
import type { Command, OptionValues } from "commander";
import { dockerCompose } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { debug, output, status } from "../utils/output";

interface InfraCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain";
  lite?: boolean;
  profile?: string;
}

/**
 * `nebutra infra up` — Start the infrastructure stack
 * Supports --lite for PostgreSQL + Redis only
 * Supports --profile for docker-compose profiles
 */
async function handleUp(options: InfraCommandOptions): Promise<void> {
  const file = options.lite ? "docker-compose.lite.yml" : undefined;
  const label = options.lite ? "Starting lite stack (PostgreSQL + Redis)" : "Starting full stack";

  status(label + "...", "info");

  const result = await dockerCompose("up -d", {
    file,
    profile: options.profile,
    dryRun: options.dryRun,
  });

  if (result.exitCode === 0) {
    status("Infrastructure stack started successfully", "success");
  } else {
    status(explainDockerFailure(result) ?? "Failed to start infrastructure stack", "error");
    debug("Docker compose output", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra infra down` — Stop the infrastructure stack
 */
async function handleDown(options: InfraCommandOptions): Promise<void> {
  status("Stopping infrastructure stack...", "info");

  const result = await dockerCompose("down", {
    dryRun: options.dryRun,
  });

  if (result.exitCode === 0) {
    status("Infrastructure stack stopped", "success");
  } else {
    status(explainDockerFailure(result) ?? "Failed to stop infrastructure stack", "error");
    debug("Docker compose output", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }
}

/**
 * Detect docker missing / daemon down from a failed `docker compose` call and
 * surface a clear message instead of a raw stderr dump.
 */
function explainDockerFailure(result: { exitCode: number; stderr: string }): string | undefined {
  const stderr = result.stderr || "";
  if (result.exitCode === 127 || /command not found|ENOENT/i.test(stderr)) {
    return "Docker CLI not found. Install Docker Desktop (or the docker CLI) and make sure it's on your PATH.";
  }
  if (/cannot connect to the docker daemon|is the docker daemon running/i.test(stderr)) {
    return "Docker daemon is not running. Start Docker Desktop (or `dockerd`) and try again.";
  }
  return undefined;
}

/**
 * `nebutra infra status` — Show service status
 * In JSON format (or non-TTY), outputs docker compose ps --format json
 */
async function handleStatus(options: InfraCommandOptions): Promise<void> {
  status("Checking infrastructure status...", "info");

  // `--format json` isn't understood by older Docker Compose (v1, or early
  // v2) — it exits non-zero with "unknown flag: --format". Detect that and
  // fall back to plain `docker compose ps` text instead of failing outright.
  let result = await dockerCompose("ps --format json", {
    dryRun: options.dryRun,
    interactive: false,
  });

  if (options.dryRun) return;

  const usesLegacyFlag =
    result.exitCode !== 0 && /unknown (flag|shorthand flag)/i.test(result.stderr);

  if (usesLegacyFlag) {
    debug("docker compose ps --format json unsupported, falling back to plain ps", {
      stderr: result.stderr,
    });
    result = await dockerCompose("ps", { interactive: false });
  }

  if (result.exitCode !== 0) {
    const hint = explainDockerFailure(result);
    status(hint ?? "Failed to check infrastructure status", "error");
    debug("Docker compose output", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }

  if (usesLegacyFlag) {
    // No structured data available on old Compose — best effort text output.
    if (options.format === "json") {
      status(
        "This Docker Compose version doesn't support `--format json`; showing plain text instead.",
        "warn",
      );
    }
    output(result.stdout, { format: "plain" });
    return;
  }

  try {
    const services = JSON.parse(result.stdout);

    if (options.format === "json") {
      output(services, { format: "json" });
    } else {
      // Human-readable table format
      const rows = services.map((service: Record<string, unknown>) => ({
        name: service.Name,
        status: service.Status,
        ports: service.Ports || "-",
      }));

      output(rows, { format: "table" });
    }
  } catch (_e) {
    // Fallback: output raw docker compose ps
    output(result.stdout, { format: "plain" });
  }
}

/**
 * `nebutra infra logs [service]` — Show service logs
 */
async function handleLogs(service?: string, options?: InfraCommandOptions): Promise<void> {
  const opts = options || {};
  const label = service ? `Fetching logs for ${service}...` : "Fetching infrastructure logs...";

  status(label, "info");

  const args = ["logs", "--tail", "50"];
  if (service) {
    args.push(service);
  }

  const result = await dockerCompose(args.join(" "), {
    dryRun: opts.dryRun,
  });

  if (result.exitCode === 0) {
    output(result.stdout, { format: "plain" });
  } else {
    status(explainDockerFailure(result) ?? "Failed to fetch logs", "error");
    debug("Docker compose output", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }
}

/**
 * `nebutra infra reset` — Reset infrastructure (DANGEROUS)
 * Removes containers and volumes
 * Requires --yes or interactive confirmation
 */
async function handleReset(options: InfraCommandOptions): Promise<void> {
  const isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true;

  // Check for explicit confirmation
  if (!options.yes && !options.dryRun) {
    if (isInteractive) {
      // Prompt for confirmation in interactive mode
      const confirmed = await p.confirm({
        message: "Reset infrastructure? This will remove all containers and volumes.",
        initialValue: false,
      });

      if (p.isCancel(confirmed) || !confirmed) {
        status("Reset cancelled", "warn");
        process.exit(ExitCode.CANCELLED);
      }
    } else {
      // Non-interactive without --yes is not allowed
      status(
        "Infrastructure reset requires explicit --yes confirmation (use: nebutra infra reset --yes)",
        "error",
      );
      process.exit(ExitCode.INVALID_ARGS);
    }
  }

  status("Resetting infrastructure stack...", "warn");

  const result = await dockerCompose("down -v", {
    dryRun: options.dryRun,
  });

  if (result.exitCode === 0) {
    status("Infrastructure reset successfully", "success");
  } else {
    status(explainDockerFailure(result) ?? "Failed to reset infrastructure", "error");
    debug("Docker compose output", { stderr: result.stderr });
    process.exit(result.exitCode || 1);
  }
}

/**
 * Register the `infra` command group
 * Usage: nebutra infra <subcommand> [args]
 */
export function registerInfraCommand(program: Command): void {
  const infraCommand = program
    .command("infra <verb> [service]")
    .description("Manage Docker Compose infrastructure (PostgreSQL, Redis, etc.)")
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations (especially for reset)")
    .option("--lite", "Use lite stack (PostgreSQL + Redis only)")
    .option("--profile <name>", "Docker Compose profile to use (e.g., search)")
    .option("--format <type>", "Output format: json, plain", "plain")
    .action(
      async (
        verb: string,
        service: string | undefined,
        options: OptionValues,
        command: Command,
      ) => {
        // See the equivalent comment in db.ts's action: `--format` is also a
        // global root-program option, so a user-supplied value binds there,
        // not to this subcommand's local option — read it via
        // `command.optsWithGlobals()`, not `options.optsWithGlobals?.()`
        // (which is always undefined; `options` is a plain object).
        const globalOptions = command.optsWithGlobals?.();
        const mergedOptions: InfraCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (globalOptions?.format || options.format) as "json" | "plain",
          lite: options.lite || false,
          profile: options.profile,
        };

        try {
          switch (verb) {
            case "up":
              await handleUp(mergedOptions);
              break;

            case "down":
              await handleDown(mergedOptions);
              break;

            case "status":
              await handleStatus(mergedOptions);
              break;

            case "logs":
              await handleLogs(service, mergedOptions);
              break;

            case "reset":
              await handleReset(mergedOptions);
              break;

            default:
              status(
                `Unknown infra subcommand: ${verb}. Valid commands: up, down, status, logs, reset`,
                "error",
              );
              process.exit(ExitCode.INVALID_ARGS);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status(`Infrastructure command failed: ${message}`, "error");
          debug("Full error", { error });
          process.exit(ExitCode.ERROR);
        }
      },
    );

  // Add help text
  infraCommand.addHelpText(
    "after",
    `
Examples:
  nebutra infra up                  Start full stack
  nebutra infra up --lite           Start lite stack (PostgreSQL + Redis)
  nebutra infra up --profile search Start with search profile enabled
  nebutra infra down                Stop all services
  nebutra infra status              Show service status (JSON in non-TTY)
  nebutra infra logs                Show last 50 lines of logs
  nebutra infra logs postgres       Show logs for specific service
  nebutra infra reset --yes         Remove all containers & volumes (DANGEROUS)

Flags:
  --dry-run                         Show what would be run without executing
  --yes                             Skip confirmations
  --lite                            Use docker-compose.lite.yml (PostgreSQL + Redis only)
  --profile <name>                  Enable Docker Compose profile (search, notifications, etc.)
  --format <type>                   Output format: json, plain (default: plain, auto-json in non-TTY)
    `,
  );
}
