/**
 * Pebble diagnostics retention sweep.
 *
 * The contract promises that objects and records expire and that backups or
 * object lifecycle rules never silently resurrect deleted data. This is the
 * enforcement: an hourly pass that deletes the stored object first, then
 * tombstones the row.
 *
 * It also collects the two ways a ticket can leak storage — a token that was
 * issued but never used, and the loser of two concurrent uploads whose object
 * landed before it lost the PENDING_UPLOAD guard.
 */

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { PebbleDiagnosticTicketRepository } from "@nebutra/repositories";
import { getUploadProvider } from "@nebutra/uploads";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): Pebble support data has no tenant — submissions come from
// anonymous desktop clients. Same posture as gdprDeletion: a system-scoped
// maintenance pass over rows that only unauthenticated intake routes create.
const systemDb = getSystemDb();

const SWEEP_BATCH = 200;

export const pebbleDiagnosticsRetention: InngestFunction.Any = inngest.createFunction(
  {
    id: "pebble-diagnostics-retention",
    name: "Pebble Diagnostics Retention Sweep",
    concurrency: { limit: 1 },
    triggers: [{ cron: "17 * * * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    const repository = new PebbleDiagnosticTicketRepository(systemDb);

    const expired = await step.run("find-expired", async () => {
      const rows = await repository.findExpired(now, SWEEP_BATCH);
      return rows.map((row) => ({ id: row.id }));
    });

    if (expired.length === 0) return { swept: 0, failed: 0 };

    const result = await step.run("purge", async () => {
      const provider = await getUploadProvider();
      let swept = 0;
      let failed = 0;

      for (const { id } of expired) {
        try {
          const { object } = await repository.markDeleted(id, now);
          if (object) await provider.deleteFile(object.bucket, object.key);
          swept += 1;
        } catch (error) {
          // One bad object must not strand the rest of the batch; the ticket
          // stays past its horizon and the next hourly pass retries it.
          failed += 1;
          logger.warn("Pebble diagnostic retention purge failed", { ticketId: id, error });
        }
      }

      return { swept, failed };
    });

    logger.info("Pebble diagnostics retention sweep complete", result);
    return result;
  },
);
