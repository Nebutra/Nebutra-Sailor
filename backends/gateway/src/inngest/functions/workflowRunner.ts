/**
 * Workflow runner — event-triggered (nebutra/workflow.run.requested). For one
 * workflow it: validates tenant ownership, opens an idempotent RUNNING
 * WorkflowRun row, executes the tenant scriptSource inside the QuickJS sandbox
 * wired to the real provider stack, then finalizes the run (status + return
 * value + events + token usage + agent-call stats). Fired by
 * POST /api/v1/workflows/:id/run.
 */

import { randomUUID } from "node:crypto";
import { logger } from "@nebutra/logger";
import { getWorkflowRepository, getWorkflowRunRepository } from "@nebutra/repositories";
import type { InngestFunction } from "inngest";
import { runWorkflowDefinition, type WorkflowExecOutcome } from "../../lib/workflow-execute.js";
import { inngest } from "../client.js";

interface WorkflowRunRequested {
  tenantId: string;
  workflowId: string;
  requestedAt: string;
  args?: unknown;
  triggeredBy?: string;
}

export const workflowRunner: InngestFunction.Any = inngest.createFunction(
  {
    id: "workflow-runner",
    name: "Workflow Runner",
    concurrency: { limit: 5 },
    retries: 1,
    triggers: [{ event: "nebutra/workflow.run.requested" }],
  },
  async ({ event, step }) => {
    const { tenantId, workflowId, requestedAt, args, triggeredBy } =
      event.data as WorkflowRunRequested;
    if (!tenantId || !workflowId) return { skipped: "missing ids" };

    const wfRepo = getWorkflowRepository(tenantId);
    const runRepo = getWorkflowRunRepository(tenantId);

    // The workflow must belong to this tenant and be active (manual runs may
    // override the active check).
    const def = await step.run("load-workflow", () => wfRepo.findById(workflowId));
    if (!def) return { skipped: "not found" };
    if (def.status !== "ACTIVE" && triggeredBy !== "manual") {
      return { skipped: `status ${def.status}` };
    }

    // Open (or recover on retry) the RUNNING row — idempotent on
    // (tenantId, idempotencyKey). A fresh threadId links the AgentRolloutLine
    // trace of every agent() call in the run.
    const run = await step.run("start-run", () =>
      runRepo.start({
        workflowId,
        threadId: randomUUID(),
        idempotencyKey: `${workflowId}::${requestedAt}`,
        args,
        triggeredBy: triggeredBy ?? "api",
      }),
    );
    if (run.status !== "RUNNING") return { skipped: "already finished", runId: run.id };

    // NOT wrapped in step.run: the sandbox makes live model calls (long,
    // non-deterministic) and owns its own concurrency/caps — step memoization
    // and replay would mis-handle it. Run directly; the rollout store persists
    // each agent turn's trace, and failures finalize as a FAILED run below.
    let outcome: WorkflowExecOutcome;
    try {
      outcome = await runWorkflowDefinition({
        tenantId,
        threadId: run.threadId,
        defaultModel: def.defaultModel,
        scriptSource: def.scriptSource,
        args: args ?? {},
        limits: {
          maxConcurrency: def.maxConcurrency,
          maxAgentsPerRun: def.maxAgentsPerRun,
          maxRetries: def.maxRetries,
          timeoutMs: def.timeoutMs,
        },
      });
    } catch (err) {
      outcome = {
        ok: false,
        returnValue: null,
        error: err instanceof Error ? err.message : String(err),
        events: [],
        usage: { inputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 },
        agentCalls: 0,
      };
    }

    await step.run("finish-run", () =>
      runRepo.finish(run.id, {
        status: outcome.ok ? "SUCCEEDED" : "FAILED",
        result: outcome.returnValue,
        error: outcome.error ?? null,
        events: [...outcome.events],
        stats: { agentCalls: outcome.agentCalls },
        tokenUsage: { ...outcome.usage },
      }),
    );

    logger.info("[workflow] run finished", {
      workflowId,
      runId: run.id,
      ok: outcome.ok,
      agentCalls: outcome.agentCalls,
    });
    return { runId: run.id, ok: outcome.ok };
  },
);
