import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { delegate, findMonorepoRoot, findMonorepoRootOrExit } from "../utils/delegate";
import { ExitCode } from "../utils/exit-codes";
import { debug, output, status } from "../utils/output";

/**
 * Read the top-level service names straight out of docker-compose.yml,
 * rather than hardcoding a list that drifts every time services are added
 * or removed (this list previously still mentioned meilisearch/novu/openfga,
 * long after those were deleted per ADR 2026-09-24 sailor-convergence).
 * Falls back to a short static list if the compose file can't be parsed.
 */
function listComposeServices(root: string): string[] {
  const fallback = ["postgres", "redis", "clickhouse"];
  const composePath = resolve(root, "docker-compose.yml");
  if (!existsSync(composePath)) return fallback;

  try {
    const content = readFileSync(composePath, "utf-8");
    const lines = content.split("\n");
    const servicesIndex = lines.findIndex((l) => /^services:\s*$/.test(l));
    if (servicesIndex === -1) return fallback;

    const names: string[] = [];
    for (let i = servicesIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      // Next top-level key (volumes:, networks:, etc.) ends the services block.
      if (/^[a-zA-Z]/.test(line)) break;
      const match = line.match(/^ {2}([a-zA-Z0-9_-]+):\s*$/);
      if (match) names.push(match[1]);
    }
    return names.length > 0 ? names : fallback;
  } catch {
    return fallback;
  }
}

interface ServiceCommandOptions {
  dryRun?: boolean;
  yes?: boolean;
  format?: "json" | "plain" | "table";
  tail?: number;
  since?: string;
  timeout?: number;
}

interface ServiceStatus {
  name: string;
  status: "running" | "exited" | "restarting" | "paused";
  exitCode?: number;
  uptime?: string;
  health?: "healthy" | "unhealthy" | "unknown";
}

/**
 * Map docker compose status to human-readable status
 */
function mapDockerStatus(state: string): ServiceStatus["status"] {
  switch (state.toLowerCase()) {
    case "running":
      return "running";
    case "exited":
      return "exited";
    case "restarting":
      return "restarting";
    case "paused":
      return "paused";
    default:
      return "exited";
  }
}

/**
 * Color-code service status for terminal output
 */
function colorStatus(status: ServiceStatus["status"]): string {
  switch (status) {
    case "running":
      return pc.green("●");
    case "exited":
      return pc.red("●");
    case "restarting":
      return pc.yellow("●");
    case "paused":
      return pc.gray("●");
    default:
      return pc.gray("●");
  }
}

/**
 * `nebutra services status` — Show all service health
 * Delegates to: docker compose ps --format json
 */
async function handleStatus(options: ServiceCommandOptions): Promise<void> {
  status("Checking service status...", "info");

  const result = await delegate({
    command: "docker",
    args: ["compose", "ps", "--format", "json"],
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: "Docker Compose PS",
    dryRun: options.dryRun,
  });

  if (result.exitCode !== 0) {
    status("Failed to fetch service status", "error");
    debug("Docker error", { stderr: result.stderr });
    process.exit(ExitCode.ERROR);
  }

  try {
    const services = JSON.parse(result.stdout) as Array<{
      Name: string;
      State: string;
      ExitCode: number;
    }>;

    if (options.format === "json") {
      const mapped = services.map((s) => ({
        name: s.Name,
        status: mapDockerStatus(s.State),
        exitCode: s.ExitCode,
      }));
      output(mapped, { format: "json" });
    } else {
      // Format as human-readable table
      status("Service Status", "info");
      const rows = services.map((s) => ({
        Service: colorStatus(mapDockerStatus(s.State)) + " " + s.Name,
        Status: s.State,
        "Exit Code": s.ExitCode || "—",
      }));

      for (const row of rows) {
        status(`${row.Service} (${row.Status})`, "info");
      }
    }
  } catch (error) {
    status("Failed to parse service status", "error");
    debug("Parse error", { error: String(error) });
    process.exit(ExitCode.ERROR);
  }
}

/**
 * `nebutra services logs <service>` — Stream service logs
 * Delegates to: docker compose logs -f <service>
 */
async function handleLogs(service: string, options: ServiceCommandOptions): Promise<void> {
  status(`Streaming logs for ${pc.cyan(service)}...`, "info");

  const args: string[] = ["compose", "logs"];

  if (options.tail) {
    args.push("--tail", String(options.tail));
  } else {
    args.push("--tail", "100");
  }

  if (options.since) {
    args.push("--since", options.since);
  }

  args.push("-f", service);

  const result = await delegate({
    command: "docker",
    args,
    cwd: findMonorepoRootOrExit(),
    interactive: true,
    label: `Docker Compose Logs (${service})`,
    dryRun: options.dryRun,
  });

  if (result.exitCode !== 0) {
    status(`Failed to stream logs for ${service}`, "error");
    process.exit(ExitCode.ERROR);
  }
}

/**
 * `nebutra services restart <service>` — Restart a specific service
 * Delegates to: docker compose restart <service>
 */
async function handleRestart(service: string, options: ServiceCommandOptions): Promise<void> {
  const isInteractive = process.stdin.isTTY === true && process.stdout.isTTY === true;

  if (!options.yes && !options.dryRun && isInteractive) {
    const confirmed = await p.confirm({
      message: `Restart service ${pc.cyan(service)}?`,
      initialValue: false,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      status("Restart cancelled", "warn");
      process.exit(ExitCode.CANCELLED);
    }
  }

  status(`Restarting service ${pc.cyan(service)}...`, "info");

  const args: string[] = ["compose", "restart"];

  if (options.timeout) {
    args.push("--timeout", String(options.timeout));
  }

  args.push(service);

  const result = await delegate({
    command: "docker",
    args,
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: `Docker Compose Restart (${service})`,
    dryRun: options.dryRun,
  });

  if (result.exitCode === 0) {
    status(`Service ${pc.cyan(service)} restarted successfully`, "success");
  } else {
    status(`Failed to restart service ${service}`, "error");
    debug("Docker error", { stderr: result.stderr });
    process.exit(ExitCode.ERROR);
  }
}

/**
 * `nebutra services health` — Deep health check (pings each service endpoint)
 * Checks: PostgreSQL (pg_isready), Redis (redis-cli ping), ClickHouse (HTTP)
 */
async function handleHealth(options: ServiceCommandOptions): Promise<void> {
  status("Running deep health check...", "info");

  const healthChecks: Array<{
    service: string;
    healthy: boolean;
    message: string;
  }> = [];

  const HEALTH_CHECK_TIMEOUT_MS = 10_000;

  // PostgreSQL check
  const pgResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "postgres", "pg_isready"],
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: "PostgreSQL Health",
    dryRun: options.dryRun,
    timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
  });
  healthChecks.push({
    service: "PostgreSQL",
    healthy: pgResult.exitCode === 0,
    message: pgResult.timedOut ? "Timed out" : pgResult.exitCode === 0 ? "Ready" : "Not responding",
  });

  // Redis check
  const redisResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "redis", "redis-cli", "ping"],
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: "Redis Health",
    dryRun: options.dryRun,
    timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
  });
  healthChecks.push({
    service: "Redis",
    healthy: redisResult.exitCode === 0,
    message: redisResult.timedOut
      ? "Timed out"
      : redisResult.exitCode === 0
        ? "Ready"
        : "Not responding",
  });

  // ClickHouse check
  const clickhouseResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "clickhouse", "curl", "-s", "http://localhost:8123/ping"],
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: "ClickHouse Health",
    dryRun: options.dryRun,
    timeoutMs: HEALTH_CHECK_TIMEOUT_MS,
  });
  healthChecks.push({
    service: "ClickHouse",
    healthy: clickhouseResult.exitCode === 0,
    message: clickhouseResult.timedOut
      ? "Timed out"
      : clickhouseResult.exitCode === 0
        ? "Ready"
        : "Not responding",
  });

  if (options.format === "json") {
    output(healthChecks, { format: "json" });
  } else {
    // Format as human-readable output
    for (const check of healthChecks) {
      const indicator = check.healthy ? pc.green("✓") : pc.red("✖");
      status(
        `${indicator} ${check.service}: ${check.message}`,
        check.healthy ? "success" : "error",
      );
    }

    const allHealthy = healthChecks.every((c) => c.healthy);
    status(
      `Overall health: ${allHealthy ? pc.green("HEALTHY") : pc.red("UNHEALTHY")}`,
      allHealthy ? "success" : "error",
    );
  }
}

/**
 * `nebutra services scale <service> <replicas>` — Scale a service
 * Delegates to: docker compose up -d --scale <service>=<n>
 */
async function handleScale(
  service: string,
  replicas: string,
  options: ServiceCommandOptions,
): Promise<void> {
  const numReplicas = parseInt(replicas, 10);

  if (Number.isNaN(numReplicas) || numReplicas < 0) {
    status("Invalid replica count (must be a non-negative number)", "error");
    process.exit(ExitCode.INVALID_ARGS);
  }

  status(`Scaling ${pc.cyan(service)} to ${pc.cyan(String(numReplicas))} replicas...`, "info");

  const result = await delegate({
    command: "docker",
    args: ["compose", "up", "-d", "--scale", `${service}=${numReplicas}`],
    cwd: findMonorepoRootOrExit(),
    interactive: false,
    label: `Docker Compose Scale (${service})`,
    dryRun: options.dryRun,
  });

  if (result.exitCode === 0) {
    status(`Service ${pc.cyan(service)} scaled to ${numReplicas} replicas`, "success");
  } else {
    status(`Failed to scale service ${service}`, "error");
    debug("Docker error", { stderr: result.stderr });
    process.exit(ExitCode.ERROR);
  }
}

/**
 * Register the `services` command group
 * Usage: nebutra services <subcommand> [args]
 */
export function registerServicesCommand(program: Command): void {
  const servicesCommand = program
    .command("services <verb> [args...]")
    .description("Manage Docker Compose microservices (see `nebutra services --help` for the list)")
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations")
    .option("--format <type>", "Output format: json, plain, table", "plain")
    .option("--tail <n>", "Number of log lines to show (default: 100)")
    .option("--since <duration>", "Show logs since duration (e.g., 10m, 1h)")
    .option("--timeout <seconds>", "Timeout for service restart")
    .action(
      async (verb: string, args: string[], options: ServiceCommandOptions, command: Command) => {
        // See the equivalent comment in db.ts's action: `--format` is also a
        // global root-program option, so a user-supplied value binds there,
        // not to this subcommand's local option — read it via
        // `command.optsWithGlobals()`, not `options.optsWithGlobals?.()`
        // (which is always undefined; `options` is a plain object).
        const globalOptions = command.optsWithGlobals?.() as ServiceCommandOptions | undefined;
        const mergedOptions: ServiceCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (globalOptions?.format || options.format) as "json" | "plain" | "table",
          tail: options.tail ?? 100,
          since: options.since,
          timeout: options.timeout,
        };

        try {
          switch (verb) {
            case "status":
            case "list": // alias — users reflexively try `services list`
              await handleStatus(mergedOptions);
              break;

            case "logs":
              if (args.length === 0) {
                status("logs requires a service name: nebutra services logs <service>", "error");
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleLogs(args[0], mergedOptions);
              break;

            case "restart":
              if (args.length === 0) {
                status(
                  "restart requires a service name: nebutra services restart <service>",
                  "error",
                );
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleRestart(args[0], mergedOptions);
              break;

            case "health":
              await handleHealth(mergedOptions);
              break;

            case "scale":
              if (args.length < 2) {
                status(
                  "scale requires a service name and replica count: nebutra services scale <service> <count>",
                  "error",
                );
                process.exit(ExitCode.INVALID_ARGS);
              }
              await handleScale(args[0], args[1], mergedOptions);
              break;

            default:
              status(
                `Unknown services subcommand: ${verb}. Valid commands: status, list, logs, restart, health, scale`,
                "error",
              );
              process.exit(ExitCode.ERROR);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          status(`Services command failed: ${message}`, "error");
          debug("Full error", { error });
          process.exit(ExitCode.ERROR);
        }
      },
    );

  // Add help text. Computed lazily (only when help is actually printed) so
  // that resolving the project root and reading docker-compose.yml never
  // runs on the hot path of building the program (e.g. `nebutra --version`).
  servicesCommand.addHelpText("after", () => {
    let servicesList =
      "postgres, redis, clickhouse (run `nebutra services status` for the live list)";
    try {
      servicesList = listComposeServices(findMonorepoRoot()).join(", ");
    } catch {
      // No project root found (e.g. help shown outside a Sailor project) —
      // help text still renders with the fallback above, never exits here.
    }

    return `
Examples:
  nebutra services status                 Show all service status
  nebutra services list                   Alias for \`status\`
  nebutra services logs postgres          Stream postgres logs
  nebutra services logs postgres --tail 50  Show last 50 postgres logs
  nebutra services restart redis          Restart redis service
  nebutra services health                 Deep health check (postgres, redis, clickhouse)
  nebutra services scale ai-service 3     Scale ai-service to 3 replicas

Services Available (from docker-compose.yml):
  ${servicesList}

Flags:
  --dry-run                       Show what would be run without executing
  --yes                           Skip confirmations
  --format <type>                 Output format: json, plain, table (default: plain)
  --tail <n>                      Log lines to show (default: 100)
  --since <duration>              Show logs since (e.g., 10m, 1h)
  --timeout <seconds>             Timeout for restart
    `;
  });
}
