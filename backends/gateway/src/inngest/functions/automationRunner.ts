/**
 * Automation runner — event-triggered (nebutra/automation.run.requested). For
 * one due automation it: validates tenant ownership, opens an idempotent
 * RUNNING AutomationRun row, loads the memory read-back context, drives a
 * headless agent turn, then finalizes the run (status + summary + token usage +
 * memory snapshot). Also fired manually by POST /api/v1/automations/:id/run.
 */

import { randomUUID } from "node:crypto";
import { logger } from "@nebutra/logger";
import {
  getAutomationRepository,
  getAutomationRunRepository,
  type MemoryContext,
} from "@nebutra/repositories";
import type { InngestFunction } from "inngest";
import { runAgentTurn } from "../../lib/agent-run.js";
import { inngest } from "../client.js";

interface RunRequested {
  tenantId: string;
  automationId: string;
  scheduledAt: string;
  triggeredBy?: string;
}

/** Render the memory read-back block prepended to the automation prompt. */
function renderMemory(memory: MemoryContext): string {
  const hasRuns = memory.recentRuns.length > 0;
  if (!hasRuns && memory.knownIssues.length === 0) return "";
  const lines: string[] = ["## Automation Memory Context"];
  if (memory.knownIssues.length > 0) {
    lines.push("Known issues:");
    for (const issue of memory.knownIssues) lines.push(`- ${issue}`);
  }
  if (memory.lastOutcome) lines.push(`Last outcome: ${memory.lastOutcome}`);
  if (hasRuns) {
    lines.push("Recent runs:");
    for (const r of memory.recentRuns) {
      lines.push(`- [${r.status}] ${(r.summary ?? "").slice(0, 200)}`);
    }
  }
  return `${lines.join("\n")}\n\n`;
}

export const automationRunner: InngestFunction.Any = inngest.createFunction(
  {
    id: "automation-runner",
    name: "Automation Runner",
    concurrency: { limit: 5 },
    retries: 1,
    triggers: [{ event: "nebutra/automation.run.requested" }],
  },
  async ({ event, step }) => {
    const { tenantId, automationId, scheduledAt, triggeredBy } = event.data as RunRequested;
    if (!tenantId || !automationId) return { skipped: "missing ids" };

    const autoRepo = getAutomationRepository(tenantId);
    const runRepo = getAutomationRunRepository(tenantId);

    // Defend against malformed/replayed events — the automation must belong to
    // this tenant and still be active.
    const automation = await step.run("load-automation", () => autoRepo.findById(automationId));
    if (!automation) return { skipped: "not found" };
    if (automation.status !== "ACTIVE" && triggeredBy !== "manual") {
      return { skipped: `status ${automation.status}` };
    }

    // Open (or recover, on retry) the RUNNING row — idempotent on the
    // (tenantId, idempotencyKey) unique. A fresh threadId per run links the
    // AgentRolloutLine trace without seq collisions across instances.
    const run = await step.run("start-run", () =>
      runRepo.start({
        automationId,
        threadId: randomUUID(),
        idempotencyKey: `${automationId}::${scheduledAt}`,
        scheduledAt: new Date(scheduledAt),
        triggeredBy: triggeredBy ?? "scheduler",
      }),
    );
    if (run.status !== "RUNNING") return { skipped: "already finished", runId: run.id };

    const memory = await step.run("load-memory", () =>
      runRepo.loadMemoryContext(automationId, automation.knownIssues, 5),
    );

    const prompt = renderMemory(memory) + automation.prompt;

    const result = await step.run("run-turn", () =>
      runAgentTurn({
        tenantId,
        threadId: run.threadId,
        input: prompt,
        model: automation.model,
      }),
    );

    await step.run("finish-run", () =>
      runRepo.finish(run.id, {
        status: result.ok ? "SUCCEEDED" : "FAILED",
        summary: result.summary,
        tokenUsage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
        memorySnapshot: {
          lastOutcome: result.ok ? "SUCCEEDED" : "FAILED",
          recentSummaries: [result.summary.slice(0, 200)],
          knownIssues: automation.knownIssues,
        },
      }),
    );

    logger.info("[automation] run finished", { automationId, runId: run.id, ok: result.ok });
    return { runId: run.id, ok: result.ok };
  },
);
