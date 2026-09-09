/**
 * PARA agent runner — event-triggered (`nebutra/para.agent.run.requested`).
 *
 * The run lives in the database, not in a request: this function claims a QUEUED run, drives one
 * turn, and leaves it COMPLETED, FAILED or AWAITING_APPROVAL. Resolving an approval re-sends the
 * same event, so a parked run resumes without the browser doing anything but watching.
 */

import { logger } from "@nebutra/logger";
import type { InngestFunction } from "inngest";
import { advanceParaRun } from "../../lib/para-agent-run.js";
import { inngest } from "../client.js";

export interface ParaRunRequested {
  tenantId: string;
  runId: string;
  userId?: string;
  role?: string;
  plan?: string;
}

export const paraAgentRunner: InngestFunction.Any = inngest.createFunction(
  {
    id: "para-agent-runner",
    name: "PARA Agent Runner",
    concurrency: { limit: 5 },
    retries: 1,
    triggers: [{ event: "nebutra/para.agent.run.requested" }],
  },
  async ({ event }) => {
    const { tenantId, runId, userId, role, plan } = event.data as ParaRunRequested;
    if (!tenantId || !runId) return { skipped: "missing ids" };

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
      logger.warn("[para-agent-runner] run failed", { runId, tenantId, code: outcome.code });
    }
    return { runId, outcome: outcome.kind };
  },
);
