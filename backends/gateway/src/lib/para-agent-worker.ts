/**
 * PARA agent worker — the thing that actually advances a run.
 *
 * Registered on `@nebutra/queue`, the provider-agnostic queue CLAUDE.md calls canonical and the one
 * configured on the Fly origin (QStash there; BullMQ where Redis is a TCP connection; memory in
 * tests). The run lives in the database, so this handler claims a QUEUED run, drives one turn and
 * leaves it COMPLETED, FAILED or AWAITING_APPROVAL. Resolving an approval re-enqueues the same job,
 * and a parked run resumes without the browser doing anything but watching.
 */

import { logger } from "@nebutra/logger";
import { createJob, type QueueProvider } from "@nebutra/queue";
import { advanceParaRun } from "./para-agent-run.js";

export const PARA_QUEUE = "para";
export const PARA_AGENT_RUN_JOB = "agent.run";

export interface ParaAgentRunJob extends Record<string, unknown> {
  tenantId: string;
  runId: string;
  userId?: string;
  role?: string;
  plan?: string;
}

/** Hand a run to the worker. The caller returns immediately; the turn happens elsewhere. */
export async function enqueueParaAgentRun(
  queue: QueueProvider,
  data: ParaAgentRunJob,
): Promise<void> {
  await queue.enqueue(
    createJob(PARA_QUEUE, PARA_AGENT_RUN_JOB, data, {
      tenantId: data.tenantId,
      // One delivery per (run, attempt) — the run's own status guard makes a retry a no-op anyway.
      idempotencyKey: `para-agent-run:${data.runId}:${Date.now()}`,
    }),
  );
}

export function registerParaAgentWorker(queue: QueueProvider): void {
  queue.registerHandler<ParaAgentRunJob>(PARA_QUEUE, PARA_AGENT_RUN_JOB, async (job) => {
    const { tenantId, runId, userId, role, plan } = job.data;
    if (!tenantId || !runId) return;

    const outcome = await advanceParaRun({
      tenantId,
      runId,
      origin: {
        tenantId,
        ...(userId ? { userId } : {}),
        ...(role ? { role } : {}),
        ...(plan ? { plan } : {}),
      },
    });

    if (outcome.kind === "failed") {
      logger.warn("[para-agent-worker] run failed", { runId, tenantId, code: outcome.code });
    }
  });
}
