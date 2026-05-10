// =============================================================================
// Scheduled Job Registry — Provider-agnostic cron abstraction
// =============================================================================
// This module defines a pure runtime registry for scheduled (cron) jobs.
//
// Schedule activation is decoupled from job definition: jobs are registered
// here with their cron expression, and an external scheduler (Vercel Cron,
// QStash schedules, BullMQ repeatable jobs) triggers them via HTTP route or
// worker.
//
// Default activation in this codebase is Vercel Cron — see
// `apps/web/src/app/api/cron/<name>/route.ts` for the HTTP entry points and
// the root `vercel.json` `crons` block for schedule activation.
// =============================================================================

/**
 * Result returned by a scheduled job handler.
 *
 * - `ok`      — true on success, false on partial / soft failure
 * - `details` — arbitrary structured payload (counts, IDs) for observability
 */
export interface ScheduledJobResult {
  ok: boolean;
  details?: Record<string, unknown>;
}

/**
 * A scheduled job is a cron-triggered idempotent unit of work.
 */
export interface ScheduledJob {
  /** Unique registry key — used by HTTP entry points to look up the handler. */
  name: string;
  /**
   * Cron expression in standard 5-field syntax (minute hour dom month dow).
   * This is metadata only — the registry never schedules anything itself.
   */
  cron: string;
  /** The async unit of work. Must be idempotent. */
  handler: () => Promise<ScheduledJobResult>;
}

// ── Registry (module-scoped Map) ────────────────────────────────────────────

const registry = new Map<string, ScheduledJob>();

/**
 * Register a scheduled job. Re-registering the same name overwrites the
 * previous entry (useful for tests; production code registers once at boot).
 */
export function registerScheduledJob(job: ScheduledJob): void {
  if (!job.name || typeof job.name !== "string") {
    throw new Error("[scheduler] job.name must be a non-empty string");
  }
  if (!job.cron || typeof job.cron !== "string") {
    throw new Error("[scheduler] job.cron must be a non-empty string");
  }
  if (typeof job.handler !== "function") {
    throw new Error("[scheduler] job.handler must be a function");
  }
  registry.set(job.name, job);
}

/**
 * Look up a registered job by name. Returns `undefined` if not registered.
 */
export function getScheduledJob(name: string): ScheduledJob | undefined {
  return registry.get(name);
}

/**
 * List all registered jobs. Returns a snapshot array — mutating it does NOT
 * affect the registry.
 */
export function listScheduledJobs(): ScheduledJob[] {
  return Array.from(registry.values());
}

/**
 * Remove all registered jobs. Intended for tests; production code should not
 * call this.
 */
export function clearScheduledJobs(): void {
  registry.clear();
}
