import type { Command } from "commander";
import pc from "picocolors";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";
import { dryRunOutput } from "../utils/output";

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
type JsonObject = Record<string, unknown>;
type AdminFetchResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

function asJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readProp(value: unknown, key: string): unknown {
  return asJsonObject(value)[key];
}

function readNumber(value: unknown, key: string, fallback = 0): number {
  const v = readProp(value, key);
  return typeof v === "number" ? v : fallback;
}

function str(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

async function adminFetch(
  path: string,
  options: {
    method?: string;
    body?: JsonObject;
    dryRun?: boolean;
  } = {},
): Promise<AdminFetchResult> {
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
    const payload = {
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
    dryRunOutput(payload);
    return { ok: true, status: 0, data: payload };
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

    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = readProp(data, "error");
      return {
        ok: false,
        status: response.status,
        error: typeof errMsg === "string" ? errMsg : `HTTP ${response.status}`,
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
function formatOutput(data: JsonObject, format?: string, label?: string) {
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

function formatUnknown(data: unknown, format?: string, label?: string) {
  formatOutput(asJsonObject(data), format, label);
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
    formatUnknown(result.data, options.format, "admin:tenants");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    tenants: asArray(payload.tenants ?? payload.data),
    total: readNumber(payload, "total") || readNumber(payload.meta, "total"),
    limit: payload.limit ?? readProp(payload.meta, "limit"),
    offset: payload.offset ?? readProp(payload.meta, "offset"),
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:tenants");
  } else {
    logger.info(`Found ${output.total} tenant(s)`);
    if (output.tenants.length > 0) {
      console.log("\nTenants:");
      output.tenants.forEach((tenant) => {
        const row = asJsonObject(tenant);
        console.log(`  ${pc.blue(str(row.id))} — ${str(row.name, "(unnamed)")}`);
        console.log(`    Status: ${str(row.status)}`);
        if (row.plan) console.log(`    Plan: ${str(row.plan)}`);
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
    formatUnknown(result.data, options.format, "admin:tenant");
    return;
  }

  if (options.format === "json") {
    formatOutput({ tenant: asJsonObject(result.data) }, options.format, "admin:tenant");
  } else {
    const tenant = asJsonObject(result.data);
    logger.success(`Tenant ${pc.blue(str(tenant.id))}`);
    console.log(`  Name: ${str(tenant.name)}`);
    console.log(`  Status: ${str(tenant.status)}`);
    console.log(`  Plan: ${str(tenant.plan)}`);
    console.log(`  Created: ${str(tenant.createdAt)}`);
    if (tenant.suspendedAt) console.log(`  Suspended: ${str(tenant.suspendedAt)}`);
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
    formatUnknown(result.data, options.format, "admin:suspend");
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
    formatUnknown(result.data, options.format, "admin:unsuspend");
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
    formatUnknown(result.data, options.format, "admin:usage");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    period: payload.period,
    topTenants: asArray(payload.topTenants ?? payload.data),
    totalUsage: payload.totalUsage,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:usage");
  } else {
    logger.info(`Usage report for period: ${str(output.period)}`);
    console.log(`Total usage: ${str(output.totalUsage)}`);
    if (output.topTenants.length > 0) {
      console.log("\nTop tenants:");
      output.topTenants.forEach((t, idx) => {
        const row = asJsonObject(t);
        console.log(
          `  ${idx + 1}. ${str(row.tenantName || row.tenantId || row.name)} — ${str(row.usage)}`,
        );
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
    formatUnknown(result.data, options.format, "admin:dlq:list");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    messages: asArray(payload.messages ?? payload.data),
    count: readNumber(payload, "count") || readNumber(payload, "total"),
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:dlq:list");
  } else {
    logger.info(`Found ${output.count} message(s) in DLQ`);
    if (output.messages.length > 0) {
      console.log("\nMessages:");
      output.messages.forEach((msg) => {
        const row = asJsonObject(msg);
        console.log(`  ${pc.blue(str(row.id))}`);
        console.log(`    Type: ${str(row.type)}`);
        console.log(`    Error: ${str(row.error)}`);
        console.log(`    Created: ${str(row.createdAt)}`);
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
    formatUnknown(result.data, options.format, "admin:dlq:replay");
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
    formatUnknown(result.data, options.format, "admin:dlq:purge");
    return;
  }

  logger.success("DLQ purged");
  if (options.format === "json") {
    formatOutput(
      { purged: true, count: readProp(result.data, "count") },
      options.format,
      "admin:dlq:purge",
    );
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
    formatUnknown(result.data, options.format, "admin:flags:list");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    flags: asArray(payload.flags ?? payload.data),
    total: readNumber(payload, "total"),
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:flags:list");
  } else {
    logger.info(`Found ${output.total} flag(s)`);
    if (output.flags.length > 0) {
      console.log("\nFlags:");
      output.flags.forEach((flag) => {
        const row = asJsonObject(flag);
        const value =
          row.override !== undefined
            ? pc.yellow(String(row.override))
            : pc.gray(String(row.default ?? ""));
        console.log(`  ${pc.blue(str(row.name))} = ${value}`);
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
  let parsedValue: unknown = value;
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
    formatUnknown(result.data, options.format, "admin:flags:set");
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
    formatUnknown(result.data, options.format, "admin:flags:unset");
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
    formatUnknown(result.data, options.format, "admin:audit");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    entries: asArray(payload.entries ?? payload.data),
    total: readNumber(payload, "total"),
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:audit");
  } else {
    logger.info(`Found ${output.total} audit log entries`);
    if (output.entries.length > 0) {
      console.log("\nAudit entries:");
      output.entries.forEach((entry) => {
        const row = asJsonObject(entry);
        console.log(`  ${str(row.timestamp)} — ${pc.blue(str(row.action))} by ${str(row.actor)}`);
        if (row.details) console.log(`    ${str(row.details)}`);
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
    formatUnknown(result.data, options.format, "admin:health");
    return;
  }

  const payload = asJsonObject(result.data);
  const output = {
    status: str(payload.status, "unknown"),
    services: asJsonObject(payload.services),
    timestamp: payload.timestamp,
  };

  if (options.format === "json") {
    formatOutput(output, options.format, "admin:health");
  } else {
    const statusColor =
      output.status === "healthy" ? pc.green : output.status === "degraded" ? pc.yellow : pc.red;
    logger.info(`Platform status: ${statusColor(output.status)}`);

    if (Object.keys(output.services).length > 0) {
      console.log("\nServices:");
      Object.entries(output.services).forEach(([service, health]) => {
        const h = asJsonObject(health);
        const icon = h.status === "healthy" ? pc.green("✓") : pc.red("✗");
        console.log(`  ${icon} ${service}: ${str(h.status)}`);
        if (h.latency) console.log(`    Latency: ${str(h.latency)}ms`);
        if (h.error) console.log(`    Error: ${str(h.error)}`);
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
