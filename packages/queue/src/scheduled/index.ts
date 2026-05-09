// =============================================================================
// @nebutra/queue/scheduled — scheduled (cron) job registry & built-in jobs
// =============================================================================
// Public re-exports:
//   - The scheduler abstraction: register / get / list / clear scheduled jobs
//   - Built-in production jobs: invitation-cleanup, session-cleanup
//   - `registerDefaultScheduledJobs()` — convenience to register the built-ins
// =============================================================================

export type { RunInvitationCleanupOptions } from "./jobs/invitation-cleanup.js";
export { invitationCleanup, runInvitationCleanup } from "./jobs/invitation-cleanup.js";
export type { RunSessionCleanupOptions } from "./jobs/session-cleanup.js";
export { runSessionCleanup, sessionCleanup } from "./jobs/session-cleanup.js";
export type { ScheduledJob, ScheduledJobResult } from "./scheduler.js";
export {
  clearScheduledJobs,
  getScheduledJob,
  listScheduledJobs,
  registerScheduledJob,
} from "./scheduler.js";

import { invitationCleanup } from "./jobs/invitation-cleanup.js";
import { sessionCleanup } from "./jobs/session-cleanup.js";
import { registerScheduledJob } from "./scheduler.js";

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
