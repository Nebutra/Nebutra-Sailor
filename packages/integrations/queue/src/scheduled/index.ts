// =============================================================================
// @nebutra/queue/scheduled — scheduled (cron) job registry & built-in jobs
// =============================================================================
// Public re-exports:
//   - The scheduler abstraction: register / get / list / clear scheduled jobs
//   - Built-in production jobs: invitation-cleanup, session-cleanup
//   - `registerDefaultScheduledJobs()` — convenience to register the built-ins
// =============================================================================

export type { RunInvitationCleanupOptions } from "./jobs/invitation-cleanup";
export { invitationCleanup, runInvitationCleanup } from "./jobs/invitation-cleanup";
export type { RunSessionCleanupOptions } from "./jobs/session-cleanup";
export { runSessionCleanup, sessionCleanup } from "./jobs/session-cleanup";
export type { ScheduledJob, ScheduledJobResult } from "./scheduler";
export {
  clearScheduledJobs,
  getScheduledJob,
  listScheduledJobs,
  registerScheduledJob,
} from "./scheduler";

import { invitationCleanup } from "./jobs/invitation-cleanup";
import { sessionCleanup } from "./jobs/session-cleanup";
import { registerScheduledJob } from "./scheduler";

/**
 * Register the two built-in production scheduled jobs:
 *   - `invitation-cleanup` (every 6h)
 *   - `session-cleanup`    (daily 00:00 UTC)
 *
 * Idempotent — re-registering overwrites the previous entry.
 */
export function registerDefaultScheduledJobs(): void {
  registerScheduledJob(invitationCleanup);
  registerScheduledJob(sessionCleanup);
}
