/**
 * Advance one PARA agent run to its next resting point.
 *
 * Called from a background worker, never from the request that asked for the run — that is what
 * makes agent state frontend-independent: closing the browser cannot stop a turn, and any client
 * can attach to the trace afterwards. The trace itself goes to `agent_rollout_lines` through
 * agent-runtime's persistent rollout store, so the SSE view is a projection, not the source.
 *
 * Resting points: COMPLETED, FAILED, or AWAITING_APPROVAL — the last is a real state, reached when
 * a spending tool call needs a human. The run stops there having spent nothing.
 */

import {
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runTurn,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import type { AgentResponse } from "@nebutra/agents";
import { createAgentContext } from "@nebutra/agents";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { getParaAgentRepository, type RunWithThread } from "@nebutra/repositories";
import { getGatewayOrchestrator } from "../agents/orchestrator-singleton.js";
import type { AuthenticatedAiOriginHeaderInput } from "../routes/ai/origin-headers.js";
import {
  createParaRuleEvaluator,
  createParaToolRegistry,
  estimateToolCost,
} from "./para-agent-tools.js";

export type ParaRunOutcome =
  | { kind: "completed"; summary: string }
  | { kind: "awaiting_approval"; approvalId: string }
  | { kind: "failed"; code: string; message: string }
  | { kind: "skipped"; reason: string };

function durableRolloutStore(): RolloutStore {
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

export interface AdvanceRunInput {
  tenantId: string;
  runId: string;
  /** Signed origin identity for job submission — the worker has no request to derive it from. */
  origin: AuthenticatedAiOriginHeaderInput;
  model?: string;
}

/**
 * Claim a QUEUED run and drive it. A redelivered event finds the run already RUNNING and is
 * skipped, so a turn never executes twice.
 */
export async function advanceParaRun(input: AdvanceRunInput): Promise<ParaRunOutcome> {
  const repo = getParaAgentRepository(input.tenantId);
  const claimed = await repo.startRun(input.runId);
  if (!claimed) return { kind: "skipped", reason: "run is not queued" };

  const run = (await repo.findRunWithThread(input.runId)) as RunWithThread | null;
  if (!run) {
    await repo.finishRun(input.runId, "FAILED", { code: "run_missing", message: "run vanished" });
    return { kind: "failed", code: "run_missing", message: "run vanished" };
  }

  const orchestrator = getGatewayOrchestrator();
  if (!orchestrator) {
    const error = { code: "model_unavailable", message: "model stack unavailable" };
    await repo.finishRun(run.id, "FAILED", error);
    return { kind: "failed", ...error };
  }

  const contextNodeIds = Array.isArray(run.contextNodeIds)
    ? (run.contextNodeIds as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  const tools = createParaToolRegistry({
    tenantId: input.tenantId,
    workspaceId: run.workspaceId,
    origin: input.origin,
    contextNodeIds,
  });

  let summary = "";
  const model: ModelInvoker = {
    async invoke() {
      const response: AgentResponse = await orchestrator.chat(
        run.input,
        createAgentContext(input.tenantId, "para", run.threadId),
      );
      summary = response.messages.at(-1)?.content ?? "";
      return {
        emissions: [{ kind: "text", text: summary }],
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
        },
      };
    },
  };

  // Set by the approval gate when a spending call needs a human; it makes the run park.
  let parkedApprovalId: string | null = null;

  const config: TurnConfig = {
    model: input.model ?? "auto",
    provider: "gateway",
    approvalPolicy: run.thread.autonomy === "ACT" ? "never" : "on_request",
    capabilityPolicy: "external_sandbox",
  };

  try {
    const events = runTurn(run.input, {
      tenantId: input.tenantId,
      threadId: run.threadId,
      config,
      approvalPolicy: { kind: run.thread.autonomy === "ACT" ? "never" : "on_request" },
      model,
      tools,
      store: durableRolloutStore(),
      ruleEvaluator: createParaRuleEvaluator(run.thread.autonomy),
      approvalGate: {
        /**
         * Record the call and deny it for this turn. Denying is what lets the turn end without
         * spending; approving the row later re-enqueues the run. Blocking here instead would hold
         * a worker open waiting on a human, across a deploy that restarts it and a fleet that may
         * not route the answer to the same Machine — the wait has to be a row, not a held process.
         */
        async request(serverRequest) {
          if (parkedApprovalId) return { kind: "denied" };
          const summaryText =
            "summary" in serverRequest
              ? serverRequest.summary
              : "command" in serverRequest
                ? serverRequest.command
                : serverRequest.type;
          const approval = await repo.createApproval({
            runId: run.id,
            toolName: "generate_image",
            args: { summary: summaryText, requestId: serverRequest.requestId },
            estimatedCost: estimateToolCost("generate_image", {}),
          });
          parkedApprovalId = approval.id;
          return { kind: "denied" };
        },
      },
    });

    for await (const _event of events) {
      // The rollout store persists every event; the SSE view replays from there.
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[para-agent] run failed", { runId: run.id, tenantId: input.tenantId, message });
    await repo.finishRun(run.id, "FAILED", { code: "turn_failed", message });
    return { kind: "failed", code: "turn_failed", message };
  }

  if (parkedApprovalId) {
    await repo.parkRun(run.id);
    return { kind: "awaiting_approval", approvalId: parkedApprovalId };
  }
  await repo.finishRun(run.id, "COMPLETED");
  return { kind: "completed", summary };
}
