// =============================================================================
// /api/cron — shared auth + dispatch helper
// =============================================================================
// Each cron route shares the same skeleton:
//   1. Verify the Authorization header against CRON_SECRET (rejects if missing
//      or mismatched). Vercel Cron and QStash both support Bearer auth.
//   2. Look up the named ScheduledJob in the registry.
//   3. Run the handler and return its result as JSON.
//
// The whole thing fails closed: if CRON_SECRET is not configured we return
// 500 rather than 200, so a misconfigured deployment cannot accidentally
// expose internal mutating endpoints to the public.
// =============================================================================

import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import {
  getScheduledJob,
  registerDefaultScheduledJobs,
  type ScheduledJobResult,
} from "@nebutra/queue";

// Register the built-in jobs once on module load. `registerScheduledJob` is
// idempotent (overwrites on re-register) so repeated cold-start invocations
// are safe.
registerDefaultScheduledJobs();

const BEARER_PREFIX = "Bearer ";

interface CronJsonBody extends ScheduledJobResult {
  job: string;
  durationMs?: number;
  error?: string;
}

/**
 * Run the named scheduled job after verifying the Authorization header.
 * Always returns a `Response` (no exceptions escape this function).
 */
export async function runCronRoute(request: Request, jobName: string): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    logger.error("[cron] CRON_SECRET is not configured", { job: jobName });
    return jsonError(500, jobName, "CRON_SECRET not configured");
  }

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    return jsonError(401, jobName, "Unauthorized");
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!constantTimeEqual(token, expected)) {
    return jsonError(401, jobName, "Unauthorized");
  }

  const job = getScheduledJob(jobName);
  if (!job) {
    logger.error("[cron] no scheduled job registered for name", { job: jobName });
    return jsonError(500, jobName, `Scheduled job '${jobName}' is not registered`);
  }

  const startedAt = Date.now();
  try {
    const result = await job.handler();
    const durationMs = Date.now() - startedAt;
    const body: CronJsonBody = {
      job: jobName,
      ok: result.ok,
      durationMs,
    };
    if (result.details !== undefined) body.details = result.details;

    // SOC 2 audit — every cron invocation is logged. Cron jobs run as the
    // system actor and are not tenant-scoped (they iterate across tenants).
    await auditLogger(request, {
      actor: { id: "system", type: "system" },
      tenantId: "system",
    }).log({
      action: "cron.run",
      outcome: result.ok ? "success" : "failure",
      resource: { type: "cron_job", id: jobName },
      severity: result.ok ? "info" : "warning",
      metadata: { durationMs },
    });

    return Response.json(body, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[cron] scheduled job handler threw", { job: jobName, error: message });

    await auditLogger(request, {
      actor: { id: "system", type: "system" },
      tenantId: "system",
    }).log({
      action: "cron.run",
      outcome: "failure",
      resource: { type: "cron_job", id: jobName },
      severity: "critical",
      metadata: { error: message, durationMs: Date.now() - startedAt },
    });

    return jsonError(500, jobName, message);
  }
}

function jsonError(status: number, job: string, error: string): Response {
  return Response.json({ ok: false, job, error }, { status });
}

/**
 * Constant-time string comparison to defend against timing-oracle attacks
 * on the cron secret. Returns false fast for length mismatch — that leaks
 * length, which is acceptable for a fixed-length operator-controlled secret.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
