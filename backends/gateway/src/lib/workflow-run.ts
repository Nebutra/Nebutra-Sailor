/**
 * Headless workflow run — the EXECUTION CORE of the agent-workflow runtime.
 *
 * Drives a declarative Brief[] DAG through the converged orchestration substrate:
 *   planWaves (dependency-resolved waves; parallel within a wave, sequential
 *   across) → each node is one `runTurn` against the real provider stack, with
 *   the node's model resolved from its NodeModelSpec via the live catalog →
 *   per-node results + an aggregate cost report.
 *
 * This is the walking skeleton that makes the substrate load-bearing: there is
 * no quickjs authoring layer yet — a workflow IS a Brief[] graph. When the
 * JS-authoring sandbox lands it reuses THIS executor; it does not re-implement
 * wave scheduling or model resolution.
 */

import {
  type Brief,
  costReport,
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runAgentWaves,
  runTurn,
  type SubagentCostReport,
  type SubagentResult,
  ToolRegistry,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import { createAgentsModelInvoker } from "@nebutra/agent-runtime/adapters";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import { resolveModelSpec } from "@nebutra/ai-providers/catalog";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";

export interface WorkflowRunInput {
  readonly tenantId: string;
  readonly threadId: string;
  /** Run-level default model — a node inherits this when its NodeModelSpec is unset. */
  readonly defaultModel: string;
  /** The workflow graph: nodes with optional dependsOn + per-node model. */
  readonly briefs: readonly Brief[];
}

export interface WorkflowRunResult {
  readonly ok: boolean;
  readonly results: readonly SubagentResult[];
  readonly cost: SubagentCostReport;
}

/**
 * How a single node is executed. The default ({@link runBriefAsTurn}) drives a
 * real `runTurn`; injectable so the wave orchestration is testable without a
 * provider, and so the future quickjs `agent()` host can tap/instrument it.
 */
export type BriefRunner = (brief: Brief, input: WorkflowRunInput) => Promise<SubagentResult>;

/**
 * Durable rollout store (rollout lines persist for replay/debug).
 * NOTE: the same builder exists in lib/agent-run.ts and routes/agent-runtime;
 * consolidate into one shared module on next touch.
 */
function durableRolloutStore(): RolloutStore {
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

/**
 * Execute ONE brief as a runTurn against the real provider stack. The node's
 * model is resolved from its NodeModelSpec; output text + token usage are
 * captured by wrapping the AgentsModelInvoker. Tools are an empty registry and
 * approvals auto-deny so an automated wave never stalls on a human.
 */
async function runBriefAsTurn(brief: Brief, input: WorkflowRunInput): Promise<SubagentResult> {
  const startedAt = Date.now();
  const model = await resolveModelSpec(brief.model ?? {}, input.defaultModel);

  let lastText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningOutputTokens = 0;

  const base = createAgentsModelInvoker();
  const invoker: ModelInvoker = {
    async invoke(request) {
      const round = await base.invoke(request);
      for (const emission of round.emissions) {
        if (emission.kind === "text") lastText = emission.text;
      }
      inputTokens += round.usage?.inputTokens ?? 0;
      outputTokens += round.usage?.outputTokens ?? 0;
      reasoningOutputTokens += round.usage?.reasoningOutputTokens ?? 0;
      return round;
    },
  };

  const config: TurnConfig = {
    model,
    provider: "gateway",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  };

  const events = runTurn(brief.objective, {
    tenantId: input.tenantId,
    threadId: `${input.threadId}:${brief.id}`,
    config,
    approvalPolicy: { kind: "on_request" },
    model: invoker,
    tools: new ToolRegistry(),
    store: durableRolloutStore(),
    approvalGate: {
      async request() {
        return { kind: "denied" };
      },
    },
  });
  // Drain to completion; the invoker closure captures the final text + usage.
  for await (const _event of events) {
    // no-op: the rollout store persists the trace; we keep the wave's result.
  }

  return {
    briefId: brief.id,
    output: lastText,
    usage: { inputTokens, cachedInputTokens: 0, outputTokens, reasoningOutputTokens },
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Run a declarative workflow (Brief[] DAG) to completion. Waves are scheduled by
 * planWaves (inside runAgentWaves): nodes in a wave run in parallel, waves run
 * in order. Returns every node's result + an aggregate cost report.
 */
export async function runWorkflow(
  input: WorkflowRunInput,
  runner: BriefRunner = runBriefAsTurn,
): Promise<WorkflowRunResult> {
  if (input.briefs.length === 0) {
    return { ok: false, results: [], cost: costReport([]) };
  }

  try {
    const results = await runAgentWaves(input.briefs, (brief) => runner(brief, input));
    const ok = results.every((r) => typeof r.output === "string" && r.output.length > 0);
    return { ok, results, cost: costReport(results) };
  } catch (err) {
    logger.error("[workflow-run] runAgentWaves failed", {
      error: err instanceof Error ? err.message : String(err),
      tenantId: input.tenantId,
    });
    return { ok: false, results: [], cost: costReport([]) };
  }
}
