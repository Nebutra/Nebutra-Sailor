import * as p from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { delegate, findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { debug, output, status } from "../utils/output.js";

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
    cwd: findMonorepoRoot(),
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
    cwd: findMonorepoRoot(),
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
      process.exit(0);
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
    cwd: findMonorepoRoot(),
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

  const healthChecks: Array<{ service: string; healthy: boolean; message: string }> = [];

  // PostgreSQL check
  const pgResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "postgres", "pg_isready"],
    cwd: findMonorepoRoot(),
    interactive: false,
    label: "PostgreSQL Health",
    dryRun: options.dryRun,
  });
  healthChecks.push({
    service: "PostgreSQL",
    healthy: pgResult.exitCode === 0,
    message: pgResult.exitCode === 0 ? "Ready" : "Not responding",
  });

  // Redis check
  const redisResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "redis", "redis-cli", "ping"],
    cwd: findMonorepoRoot(),
    interactive: false,
    label: "Redis Health",
    dryRun: options.dryRun,
  });
  healthChecks.push({
    service: "Redis",
    healthy: redisResult.exitCode === 0,
    message: redisResult.exitCode === 0 ? "Ready" : "Not responding",
  });

  // ClickHouse check
  const clickhouseResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "clickhouse", "curl", "-s", "http://localhost:8123/ping"],
    cwd: findMonorepoRoot(),
    interactive: false,
    label: "ClickHouse Health",
    dryRun: options.dryRun,
  });
  healthChecks.push({
    service: "ClickHouse",
    healthy: clickhouseResult.exitCode === 0,
    message: clickhouseResult.exitCode === 0 ? "Ready" : "Not responding",
  });

  // Meilisearch check
  const meilisearchResult = await delegate({
    command: "docker",
    args: ["compose", "exec", "-T", "meilisearch", "curl", "-s", "http://localhost:7700/health"],
    cwd: findMonorepoRoot(),
    interactive: false,
    label: "Meilisearch Health",
    dryRun: options.dryRun,
  });
  healthChecks.push({
    service: "Meilisearch",
    healthy: meilisearchResult.exitCode === 0,
    message: meilisearchResult.exitCode === 0 ? "Healthy" : "Not responding",
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
    cwd: findMonorepoRoot(),
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
    .description(
      "Manage Docker Compose microservices (postgres, redis, clickhouse, meilisearch, novu, openfga, etc.)",
    )
    .option("--dry-run", "Show what would be run without executing")
    .option("--yes", "Skip confirmations")
    .option("--format <type>", "Output format: json, plain, table", "plain")
    .option("--tail <n>", "Number of log lines to show (default: 100)")
    .option("--since <duration>", "Show logs since duration (e.g., 10m, 1h)")
    .option("--timeout <seconds>", "Timeout for service restart")
    .action(
      async (
        verb: string,
        args: string[],
        options: ServiceCommandOptions & { optsWithGlobals?: () => ServiceCommandOptions },
      ) => {
        const globalOptions = options.optsWithGlobals?.();
        const mergedOptions: ServiceCommandOptions = {
          dryRun: options.dryRun || globalOptions?.dryRun,
          yes: options.yes || globalOptions?.yes,
          format: (options.format || globalOptions?.format) as "json" | "plain" | "table",
          tail: options.tail ?? 100,
          since: options.since,
          timeout: options.timeout,
        };

        try {
          switch (verb) {
            case "status":
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
                `Unknown services subcommand: ${verb}. Valid commands: status, logs, restart, health, scale`,
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

  // Add help text
  servicesCommand.addHelpText(
    "after",
    `
Examples:
  nebutra services status                 Show all service status
  nebutra services logs postgres          Stream postgres logs
  nebutra services logs postgres --tail 50  Show last 50 postgres logs
  nebutra services restart redis          Restart redis service
  nebutra services health                 Deep health check (pg, redis, clickhouse, meilisearch)
  nebutra services scale ai-service 3     Scale ai-service to 3 replicas

Services Available:
  postgres, redis, clickhouse, meilisearch, novu, openfga, ai-service, content-service,
  recsys-service, ecommerce-service, web3-service, billing-service, event-ingest, idp,
  jaeger, nginx

Flags:
  --dry-run                       Show what would be run without executing
  --yes                           Skip confirmations
  --format <type>                 Output format: json, plain, table (default: plain)
  --tail <n>                      Log lines to show (default: 100)
  --since <duration>              Show logs since (e.g., 10m, 1h)
  --timeout <seconds>             Timeout for restart
    `,
  );
}
