// =============================================================================
// invitation-cleanup — marks expired pending OrganizationInvitation rows
// =============================================================================
// Scheduled every 6 hours. Idempotent — re-running the same hour is a no-op
// because rows already flipped to `expired` no longer match the WHERE clause.
//
// The job is implemented as two layers:
//   - `runInvitationCleanup({ client })` is the pure async unit, easily
//      testable with an injected fake Prisma client.
//   - `invitationCleanup` is the registry-shaped `ScheduledJob` whose
//      handler resolves the real Prisma client from `@nebutra/db` lazily.
// =============================================================================

import { logger } from "@nebutra/logger";
import type { ScheduledJob, ScheduledJobResult } from "../scheduler";

/**
 * Minimal subset of the Prisma client surface this job needs.
 * Keeps the test fakes tiny and avoids pulling Prisma's full type into hot paths.
 */
interface InvitationCleanupClient {
  organizationInvitation: {
    updateMany(args: {
      where: { status: string; expiresAt: { lt: Date } };
      data: { status: string };
    }): Promise<{ count: number }>;
  };
}

export interface RunInvitationCleanupOptions {
  /** Prisma client (or a structural fake in tests). */
  client: InvitationCleanupClient;
  /** Override "now" for deterministic testing. */
  now?: () => Date;
}

/**
 * Pure handler — flips rows whose `expiresAt < now()` and `status = 'pending'`
 * to `status = 'expired'`. Returns the count of affected rows.
 */
export async function runInvitationCleanup(
  options: RunInvitationCleanupOptions,
): Promise<ScheduledJobResult> {
  const now = (options.now ?? (() => new Date()))();

  const { count } = await options.client.organizationInvitation.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: now },
    },
    data: { status: "expired" },
  });

  logger.info("[scheduled:invitation-cleanup] expired pending invitations", {
    expired: count,
    cutoff: now.toISOString(),
  });

  return { ok: true, details: { expired: count } };
}

/**
 * Registry-shaped definition. The handler resolves the real Prisma client
 * lazily via dynamic import so tests don't need a live database.
 */
export const invitationCleanup: ScheduledJob = {
  name: "invitation-cleanup",
  cron: "0 */6 * * *",
  handler: async () => {
    const { getSystemDb } = await import("@nebutra/db");
    return runInvitationCleanup({ client: getSystemDb() as unknown as InvitationCleanupClient });
  },
};
