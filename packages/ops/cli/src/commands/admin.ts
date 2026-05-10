import type { Command } from "commander";
import pc from "picocolors";
import { delegate, findMonorepoRoot } from "../utils/delegate.js";
import { ExitCode } from "../utils/exit-codes.js";
import { logger } from "../utils/logger.js";

interface AdminCommandOptions {
  dryRun?: boolean;
  format?: string;
  yes?: boolean;
  limit?: number;
  offset?: number;
  status?: string;
  period?: string;
  top?: number;
  actor?: string;
  action?: string;
  since?: string;
}

/**
 * Admin API fetch helper
 * Handles authentication, dry-run, and structured error responses
 */
async function adminFetch(
  path: string,
  options: {
    method?: string;
    body?: Record<string, any>;
    dryRun?: boolean;
  } = {},
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const apiUrl = process.env.NEBUTRA_API_URL || "http://localhost:3100";
  const adminKey = process.env.NEBUTRA_ADMIN_KEY;

  // Validate admin key
  if (!adminKey) {
    return {
      ok: false,
      status: 401,
      error: "NEBUTRA_ADMIN_KEY environment variable not set. Set it to your admin API key.",
    };
  }

  const url = new URL(path, apiUrl).toString();
  const method = options.method || "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  // Dry-run mode: output request as JSON
  if (options.dryRun) {
    const dryRunOutput = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      method,
      url,
      ...(body && { body: JSON.parse(body) }),
      headers: {
        "X-Admin-Key": "***",
        "Content-Type": "application/json",
      },
    };
    console.log(JSON.stringify(dryRunOutput, null, 2));
    return { ok: true, status: 0, data: dryRunOutput };
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "X-Admin-Key": adminKey,
        "Content-Type": "application/json",
      },
      ...(body && { body }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error || `HTTP ${response.status}`,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Format output based on requested format
 */
function formatOutput(data: Record<string, any>, format?: string, label?: string) {
  if (format === "json") {
    const output = {
      command: label || "admin",
      ...data,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Handle 'nebutra admin tenants' command
 * List all tenants/organizations
 */
async function handleAdminTenants(options: AdminCommandOptions) {
  logger.info("Fetching tenants...");

  const queryParams = new URLSearchParams();
  if (options.limit) queryParams.append("limit", String(options.limit));
  if (options.offset) queryParams.append("offset", String(options.offset));
  if (options.status) queryParams.append("status", options.status);

  const path = `/api/v1/admin/tenants${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const result = await adminFetch(path, { dryRun: options.dryRun });

  if (!result.ok) {
    logger.error(`Failed to fetch tenants: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:tenants");
    return;
  }

  const output = {
    tenants: result.data?.tenants || [],
    total: result.data?.total || 0,
    limit: result.data?.limit,
    offset: result.data?.offset,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:tenants");
  } else {
    logger.info(`Found ${output.total} tenant(s)`);
    if (output.tenants.length > 0) {
      console.log("\nTenants:");
      output.tenants.forEach((tenant: any) => {
        console.log(`  ${pc.blue(tenant.id)} — ${tenant.name || "(unnamed)"}`);
        console.log(`    Status: ${tenant.status}`);
        if (tenant.plan) console.log(`    Plan: ${tenant.plan}`);
      });
    }
  }
}

/**
 * Handle 'nebutra admin tenant <id>' command
 * Get tenant details
 */
async function handleAdminTenant(tenantId: string, options: AdminCommandOptions) {
  logger.info(`Fetching tenant ${tenantId}...`);

  const result = await adminFetch(`/api/v1/admin/tenants/${tenantId}`, {
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to fetch tenant: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:tenant");
    return;
  }

  if (options.format === "json") {
    formatOutput({ tenant: result.data }, options.format, "admin:tenant");
  } else {
    const tenant = result.data;
    logger.success(`Tenant ${pc.blue(tenant.id)}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Status: ${tenant.status}`);
    console.log(`  Plan: ${tenant.plan}`);
    console.log(`  Created: ${tenant.createdAt}`);
    if (tenant.suspendedAt) console.log(`  Suspended: ${tenant.suspendedAt}`);
  }
}

/**
 * Handle 'nebutra admin suspend <id>' command
 * Suspend a tenant
 */
async function handleAdminSuspend(tenantId: string, options: AdminCommandOptions) {
  if (!options.yes) {
    logger.warn(`Suspending tenant ${tenantId} will disable all operations`);
    logger.info("Use --yes to confirm");
    process.exit(ExitCode.CANCELLED);
  }

  logger.info(`Suspending tenant ${tenantId}...`);

  const result = await adminFetch(`/api/v1/admin/tenants/${tenantId}/suspend`, {
    method: "POST",
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to suspend tenant: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:suspend");
    return;
  }

  logger.success(`Tenant ${pc.blue(tenantId)} suspended`);
  if (options.format === "json") {
    formatOutput({ suspended: true, tenantId }, options.format, "admin:suspend");
  }
}

/**
 * Handle 'nebutra admin unsuspend <id>' command
 * Unsuspend a tenant
 */
async function handleAdminUnsuspend(tenantId: string, options: AdminCommandOptions) {
  logger.info(`Unsuspending tenant ${tenantId}...`);

  const result = await adminFetch(`/api/v1/admin/tenants/${tenantId}/unsuspend`, {
    method: "POST",
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to unsuspend tenant: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:unsuspend");
    return;
  }

  logger.success(`Tenant ${pc.blue(tenantId)} unsuspended`);
  if (options.format === "json") {
    formatOutput({ unsuspended: true, tenantId }, options.format, "admin:unsuspend");
  }
}

/**
 * Handle 'nebutra admin usage' command
 * Cross-tenant usage report
 */
async function handleAdminUsage(options: AdminCommandOptions) {
  logger.info("Fetching usage report...");

  const queryParams = new URLSearchParams();
  if (options.period) queryParams.append("period", options.period);
  if (options.top) queryParams.append("top", String(options.top));

  const path = `/api/v1/admin/usage/report${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const result = await adminFetch(path, { dryRun: options.dryRun });

  if (!result.ok) {
    logger.error(`Failed to fetch usage report: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:usage");
    return;
  }

  const output = {
    period: result.data?.period,
    topTenants: result.data?.topTenants || [],
    totalUsage: result.data?.totalUsage,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:usage");
  } else {
    logger.info(`Usage report for period: ${output.period}`);
    console.log(`Total usage: ${output.totalUsage}`);
    if (output.topTenants.length > 0) {
      console.log("\nTop tenants:");
      output.topTenants.forEach((t: any, idx: number) => {
        console.log(`  ${idx + 1}. ${t.tenantName || t.tenantId} — ${t.usage}`);
      });
    }
  }
}

/**
 * Handle 'nebutra admin dlq list' command
 * List failed messages in dead letter queue
 */
async function handleAdminDlqList(options: AdminCommandOptions) {
  logger.info("Fetching dead letter queue...");

  const result = await adminFetch("/api/v1/admin/dlq/list", { dryRun: options.dryRun });

  if (!result.ok) {
    logger.error(`Failed to fetch DLQ: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:dlq:list");
    return;
  }

  const output = {
    messages: result.data?.messages || [],
    count: result.data?.count || 0,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:dlq:list");
  } else {
    logger.info(`Found ${output.count} message(s) in DLQ`);
    if (output.messages.length > 0) {
      console.log("\nMessages:");
      output.messages.forEach((msg: any) => {
        console.log(`  ${pc.blue(msg.id)}`);
        console.log(`    Type: ${msg.type}`);
        console.log(`    Error: ${msg.error}`);
        console.log(`    Created: ${msg.createdAt}`);
      });
    }
  }
}

/**
 * Handle 'nebutra admin dlq replay <id>' command
 * Replay a failed message
 */
async function handleAdminDlqReplay(messageId: string, options: AdminCommandOptions) {
  logger.info(`Replaying DLQ message ${messageId}...`);

  const result = await adminFetch(`/api/v1/admin/dlq/replay/${messageId}`, {
    method: "POST",
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to replay message: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:dlq:replay");
    return;
  }

  logger.success(`Message ${pc.blue(messageId)} replayed`);
  if (options.format === "json") {
    formatOutput({ replayed: true, messageId }, options.format, "admin:dlq:replay");
  }
}

/**
 * Handle 'nebutra admin dlq purge' command
 * Purge the dead letter queue
 */
async function handleAdminDlqPurge(options: AdminCommandOptions) {
  if (!options.yes) {
    logger.warn("This will permanently delete all messages in the DLQ");
    logger.info("Use --yes to confirm");
    process.exit(ExitCode.CANCELLED);
  }

  logger.info("Purging DLQ...");

  const result = await adminFetch("/api/v1/admin/dlq/purge", {
    method: "POST",
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to purge DLQ: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:dlq:purge");
    return;
  }

  logger.success("DLQ purged");
  if (options.format === "json") {
    formatOutput({ purged: true, count: result.data?.count }, options.format, "admin:dlq:purge");
  }
}

/**
 * Handle 'nebutra admin flags list' command
 * List all feature flags
 */
async function handleAdminFlagsList(options: AdminCommandOptions) {
  logger.info("Fetching feature flags...");

  const result = await adminFetch("/api/v1/admin/feature-flags", {
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to fetch flags: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:flags:list");
    return;
  }

  const output = {
    flags: result.data?.flags || [],
    total: result.data?.total || 0,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:flags:list");
  } else {
    logger.info(`Found ${output.total} flag(s)`);
    if (output.flags.length > 0) {
      console.log("\nFlags:");
      output.flags.forEach((flag: any) => {
        const value =
          flag.override !== undefined
            ? pc.yellow(String(flag.override))
            : pc.gray(String(flag.default));
        console.log(`  ${pc.blue(flag.name)} = ${value}`);
      });
    }
  }
}

/**
 * Handle 'nebutra admin flags set <flag> <value>' command
 * Set a feature flag override
 */
async function handleAdminFlagsSet(flag: string, value: string, options: AdminCommandOptions) {
  logger.info(`Setting flag ${flag}...`);

  // Parse value as JSON if possible (true/false/number), otherwise as string
  let parsedValue: any = value;
  if (value === "true") parsedValue = true;
  else if (value === "false") parsedValue = false;
  else if (!Number.isNaN(Number(value))) parsedValue = Number(value);

  const result = await adminFetch(`/api/v1/admin/feature-flags/${flag}`, {
    method: "POST",
    body: { value: parsedValue },
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to set flag: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:flags:set");
    return;
  }

  logger.success(`Flag ${pc.blue(flag)} set to ${parsedValue}`);
  if (options.format === "json") {
    formatOutput({ flag, value: parsedValue }, options.format, "admin:flags:set");
  }
}

/**
 * Handle 'nebutra admin flags unset <flag>' command
 * Remove a feature flag override
 */
async function handleAdminFlagsUnset(flag: string, options: AdminCommandOptions) {
  logger.info(`Unsetting flag ${flag}...`);

  const result = await adminFetch(`/api/v1/admin/feature-flags/${flag}`, {
    method: "DELETE",
    dryRun: options.dryRun,
  });

  if (!result.ok) {
    logger.error(`Failed to unset flag: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:flags:unset");
    return;
  }

  logger.success(`Flag ${pc.blue(flag)} unset`);
  if (options.format === "json") {
    formatOutput({ flag, unset: true }, options.format, "admin:flags:unset");
  }
}

/**
 * Handle 'nebutra admin audit' command
 * Query audit log with filters
 */
async function handleAdminAudit(options: AdminCommandOptions) {
  logger.info("Fetching audit log...");

  const queryParams = new URLSearchParams();
  if (options.actor) queryParams.append("actor", options.actor);
  if (options.action) queryParams.append("action", options.action);
  if (options.since) queryParams.append("since", options.since);
  if (options.limit) queryParams.append("limit", String(options.limit));

  const path = `/api/v1/admin/audit${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const result = await adminFetch(path, { dryRun: options.dryRun });

  if (!result.ok) {
    logger.error(`Failed to fetch audit log: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:audit");
    return;
  }

  const output = {
    entries: result.data?.entries || [],
    total: result.data?.total || 0,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:audit");
  } else {
    logger.info(`Found ${output.total} audit log entries`);
    if (output.entries.length > 0) {
      console.log("\nAudit entries:");
      output.entries.forEach((entry: any) => {
        console.log(`  ${entry.timestamp} — ${pc.blue(entry.action)} by ${entry.actor}`);
        if (entry.details) console.log(`    ${entry.details}`);
      });
    }
  }
}

/**
 * Handle 'nebutra admin health' command
 * Platform-wide health check
 */
async function handleAdminHealth(options: AdminCommandOptions) {
  logger.info("Running platform health check...");

  const result = await adminFetch("/api/v1/system/status", { dryRun: options.dryRun });

  if (!result.ok) {
    logger.error(`Failed to fetch health status: ${result.error}`);
    process.exit(ExitCode.NETWORK_ERROR);
  }

  if (options.dryRun) {
    formatOutput(result.data, options.format, "admin:health");
    return;
  }

  const output = {
    status: result.data?.status || "unknown",
    services: result.data?.services || {},
    timestamp: result.data?.timestamp,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:health");
  } else {
    const statusColor =
      output.status === "healthy" ? pc.green : output.status === "degraded" ? pc.yellow : pc.red;
    logger.info(`Platform status: ${statusColor(output.status)}`);

    if (output.services && Object.keys(output.services).length > 0) {
      console.log("\nServices:");
      Object.entries(output.services).forEach(([service, health]: [string, any]) => {
        const icon = health.status === "healthy" ? pc.green("✓") : pc.red("✗");
        console.log(`  ${icon} ${service}: ${health.status}`);
        if (health.latency) console.log(`    Latency: ${health.latency}ms`);
        if (health.error) console.log(`    Error: ${health.error}`);
      });
    }
  }
}

/**
 * Register the admin command group with all subcommands
 */
export function registerAdminCommand(program: Command) {
  const admin = program.command("admin").description("Platform admin operations");

  // nebutra admin tenants
  admin
    .command("tenants")
    .description("List all tenants/organizations")
    .option("--limit <n>", "Maximum number of tenants to return", (v) => parseInt(v, 10))
    .option("--offset <n>", "Offset for pagination", (v) => parseInt(v, 10))
    .option("--status <status>", "Filter by status (active|suspended)")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminTenants({
        limit: options.limit,
        offset: options.offset,
        status: options.status,
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin tenant <id>
  admin
    .command("tenant <id>")
    .description("Get tenant details")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (id, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminTenant(id, {
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin suspend <id>
  admin
    .command("suspend <id>")
    .description("Suspend a tenant (requires --yes)")
    .option("--yes", "Confirm suspension")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (id, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminSuspend(id, {
        yes: options.yes || globalOptions.yes,
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin unsuspend <id>
  admin
    .command("unsuspend <id>")
    .description("Unsuspend a tenant")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (id, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminUnsuspend(id, {
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin usage
  admin
    .command("usage")
    .description("Cross-tenant usage report")
    .option("--period <period>", "Report period (daily|weekly|monthly)")
    .option("--top <n>", "Show top N tenants", (v) => parseInt(v, 10))
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminUsage({
        period: options.period,
        top: options.top,
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin dlq
  const dlq = admin.command("dlq").description("Dead letter queue management");

  // nebutra admin dlq list
  dlq
    .command("list")
    .description("List failed messages in DLQ")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminDlqList({
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin dlq replay <id>
  dlq
    .command("replay <id>")
    .description("Replay a failed message")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (id, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminDlqReplay(id, {
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin dlq purge
  dlq
    .command("purge")
    .description("Purge the dead letter queue (requires --yes)")
    .option("--yes", "Confirm purge")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminDlqPurge({
        yes: options.yes || globalOptions.yes,
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin flags
  const flags = admin.command("flags").description("Feature flag management");

  // nebutra admin flags list
  flags
    .command("list")
    .description("List all feature flags")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminFlagsList({
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin flags set <flag> <value>
  flags
    .command("set <flag> <value>")
    .description("Set a feature flag override")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (flag, value, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminFlagsSet(flag, value, {
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin flags unset <flag>
  flags
    .command("unset <flag>")
    .description("Remove a feature flag override")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (flag, options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminFlagsUnset(flag, {
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin audit
  admin
    .command("audit")
    .description("Query audit log with optional filters")
    .option("--actor <userId>", "Filter by actor/user ID")
    .option("--action <type>", "Filter by action type")
    .option("--since <date>", "Filter entries since date (ISO format)")
    .option("--limit <n>", "Maximum number of entries to return", (v) => parseInt(v, 10))
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminAudit({
        actor: options.actor,
        action: options.action,
        since: options.since,
        limit: options.limit,
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });

  // nebutra admin health
  admin
    .command("health")
    .description("Platform-wide health check")
    .option("--format <type>", "Output format: json or plain")
    .option("--dry-run", "Show request without executing")
    .action(async (options) => {
      const globalOptions = options.optsWithGlobals?.() || options;
      await handleAdminHealth({
        format: options.format || globalOptions.format,
        dryRun: options.dryRun || globalOptions.dryRun,
      });
    });
}
