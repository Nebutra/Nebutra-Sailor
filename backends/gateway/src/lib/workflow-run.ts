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
  runAgentWaves,
  type SubagentCostReport,
  type SubagentResult,
} from "@nebutra/agent-runtime";
import { resolveModelSpec } from "@nebutra/ai-providers/catalog";
import { logger } from "@nebutra/logger";
import { runTurnCapture } from "./agent-turn.js";

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
 * Execute ONE brief as a runTurn against the real provider stack. The node's
 * model is resolved from its NodeModelSpec; the shared {@link runTurnCapture}
 * drives the turn and returns the final text + usage.
 */
async function runBriefAsTurn(brief: Brief, input: WorkflowRunInput): Promise<SubagentResult> {
  const startedAt = Date.now();
  const model = await resolveModelSpec(brief.model ?? {}, input.defaultModel);
  const capture = await runTurnCapture({
    tenantId: input.tenantId,
    threadId: `${input.threadId}:${brief.id}`,
    model,
    input: brief.objective,
  });

  return {
    briefId: brief.id,
    output: capture.text,
    usage: {
      inputTokens: capture.inputTokens,
      cachedInputTokens: 0,
      outputTokens: capture.outputTokens,
      reasoningOutputTokens: capture.reasoningOutputTokens,
    },
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
