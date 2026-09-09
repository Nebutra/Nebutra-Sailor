/**
 * Request-log retention sweep.
 *
 * `ai_request_logs` is the debuggable record of one relayed request — model,
 * status, first-byte time, cost. It is not the money record: `usage_ledger_entries`
 * is, and it is kept. So the log expires, and this is what enforces it.
 *
 * The horizon is 30 days (`REQUEST_LOG_RETENTION_DAYS`), which is one billing
 * cycle: a customer reconciling an invoice can still open the request behind
 * every line on it, and a dispute older than that is answered from the ledger.
 * Holding request detail longer would be holding it for no stated purpose.
 *
 * Only rows that carry an `expires_at` are deleted. The column arrived with the
 * Router edge, so every row written before it is null and out of reach — the
 * sweep cannot retroactively eat history nobody promised to delete.
 */

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { RequestLogRepository } from "@nebutra/repositories";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): a cross-tenant retention pass. There is no request tenant,
// and scoping it to one would leave every other tenant's logs past their
// horizon. Same posture as pebbleDiagnosticsRetention.
const systemDb = getSystemDb();

/** Ceiling per run; the hourly cadence drains any backlog within a day. */
const SWEEP_BATCH = 2_000;

export const requestLogRetention: InngestFunction.Any = inngest.createFunction(
  {
    id: "request-log-retention",
    name: "Request Log Retention Sweep",
    concurrency: { limit: 1 },
    // Hourly, off the hour of the other sweeps so they do not contend.
    triggers: [{ cron: "37 * * * *" }],
  },
  async ({ step }) => {
    const deleted = await step.run("purge-expired-request-logs", async () => {
      const repository = new RequestLogRepository(systemDb);
      return repository.purgeExpired(new Date(), SWEEP_BATCH);
    });

    if (deleted > 0) {
      logger.info("Request log retention sweep complete", { deleted });
    }
    return { deleted };
  },
);
