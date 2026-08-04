// =============================================================================
// @nebutra/queue/scheduled — scheduled (cron) job registry & built-in jobs
// =============================================================================
// Public re-exports:
//   - The scheduler abstraction: register / get / list / clear scheduled jobs
//   - Built-in production jobs: invitation-cleanup, session-cleanup
//   - `registerDefaultScheduledJobs({ getSystemDb })` — inject host DB client
// =============================================================================

export type {
  GetInvitationCleanupClient,
  InvitationCleanupClient,
  RunInvitationCleanupOptions,
} from "./jobs/invitation-cleanup";
export {
  createInvitationCleanup,
  invitationCleanup,
  runInvitationCleanup,
} from "./jobs/invitation-cleanup";
export type {
  GetSessionCleanupClient,
  RunSessionCleanupOptions,
  SessionCleanupClient,
} from "./jobs/session-cleanup";
export {
  createSessionCleanup,
  runSessionCleanup,
  sessionCleanup,
} from "./jobs/session-cleanup";
export type { ScheduledJob, ScheduledJobResult } from "./scheduler";
export {
  clearScheduledJobs,
  getScheduledJob,
  listScheduledJobs,
  registerScheduledJob,
} from "./scheduler";

import { createInvitationCleanup, type InvitationCleanupClient } from "./jobs/invitation-cleanup";
import { createSessionCleanup, type SessionCleanupClient } from "./jobs/session-cleanup";
import { registerScheduledJob } from "./scheduler";

export interface RegisterDefaultScheduledJobsOptions {
  /**
   * Host-owned system DB accessor (e.g. `getSystemDb` from the app data layer).
   * Structural Prisma client is fine — only invitation + session surfaces are used.
   */
  getSystemDb: () => unknown;
}

/**
 * Register the two built-in production scheduled jobs with an injected DB:
 *   - `invitation-cleanup` (every 6h)
 *   - `session-cleanup`    (daily 00:00 UTC)
 *
 * Idempotent — re-registering overwrites the previous entry.
 * Does **not** import `@nebutra/db`; the host supplies the client.
 */
export function registerDefaultScheduledJobs(options: RegisterDefaultScheduledJobsOptions): void {
  registerScheduledJob(
    createInvitationCleanup(() => options.getSystemDb() as InvitationCleanupClient),
  );
  registerScheduledJob(createSessionCleanup(() => options.getSystemDb() as SessionCleanupClient));
}
