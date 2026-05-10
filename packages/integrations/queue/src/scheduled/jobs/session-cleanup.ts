// =============================================================================
// session-cleanup — deletes expired auth_sessions rows
// =============================================================================
// Scheduled daily at midnight UTC. Idempotent — already-deleted rows simply
// don't match the next run's WHERE clause.
//
// Two layers (mirrors invitation-cleanup):
//   - `runSessionCleanup({ client })` — pure async unit, DI-friendly.
//   - `sessionCleanup` — registry-shaped `ScheduledJob`.
// =============================================================================

import { logger } from "@nebutra/logger";
import type { ScheduledJob, ScheduledJobResult } from "../scheduler";

interface SessionCleanupClient {
  authSession: {
    deleteMany(args: { where: { expiresAt: { lt: Date } } }): Promise<{ count: number }>;
  };
}

export interface RunSessionCleanupOptions {
  /** Prisma client (or a structural fake in tests). */
  client: SessionCleanupClient;
  /** Override "now" for deterministic testing. */
  now?: () => Date;
}

export async function runSessionCleanup(
  options: RunSessionCleanupOptions,
): Promise<ScheduledJobResult> {
  const now = (options.now ?? (() => new Date()))();

  const { count } = await options.client.authSession.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  logger.info("[scheduled:session-cleanup] deleted expired auth sessions", {
    deleted: count,
    cutoff: now.toISOString(),
  });

  return { ok: true, details: { deleted: count } };
}

export const sessionCleanup: ScheduledJob = {
  name: "session-cleanup",
  cron: "0 0 * * *",
  handler: async () => {
    const { getSystemDb } = await import("@nebutra/db");
    return runSessionCleanup({ client: getSystemDb() as unknown as SessionCleanupClient });
  },
};
