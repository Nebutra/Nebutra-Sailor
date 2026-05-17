import type { TurnUsage } from "./model";

export interface BudgetCap {
  readonly durationMs: number;
  readonly costUsd: number;
  readonly tokenLimit: number;
}

export interface Brief {
  readonly id: string;
  readonly objective: string;
  readonly outputFormat: Record<string, unknown>;
  readonly allowedTools: readonly string[];
  readonly contextRefs: readonly string[];
  readonly boundaries: readonly string[];
  readonly budget: BudgetCap;
  readonly dependsOn?: readonly string[];
}

export type DispatchStrategy = "auto" | "sequential" | "fanout";

export interface DispatchPlan {
  readonly strategy: Exclude<DispatchStrategy, "auto">;
  readonly order: readonly Brief[];
}

export interface DispatchPlanOptions {
  readonly strategy?: DispatchStrategy;
}

export interface SubagentResult {
  readonly briefId: string;
  readonly output: unknown;
  readonly usage: TurnUsage;
  readonly durationMs: number;
}

export interface SubagentCostReport {
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalReasoningTokens: number;
  readonly maxDurationMs: number;
  readonly subagents: number;
}

function fail(message: string, suggestion: string): never {
  throw new Error(`${message}. Suggestion: ${suggestion}`);
}

function validateBrief(brief: Brief): void {
  if (!brief.id.trim()) fail("brief.id is required", "Use a stable role or task id.");
  if (!brief.objective.trim()) {
    fail("brief.objective is required", "Write a concrete objective before dispatching.");
  }
  if (brief.allowedTools.length === 0) {
    fail("brief.allowedTools is required", "Constrain each subagent to an explicit tool scope.");
  }
  if (brief.boundaries.length === 0) {
    fail("brief.boundaries is required", "State at least one boundary for the worker.");
  }
  if (brief.budget.tokenLimit <= 0 || brief.budget.durationMs <= 0 || brief.budget.costUsd < 0) {
    fail("brief.budget is invalid", "Set positive token/time caps and a non-negative cost cap.");
  }
}

function dependencySet(briefs: readonly Brief[]): Set<string> {
  const dependencies = new Set<string>();
  for (const brief of briefs) {
    for (const dep of brief.dependsOn ?? []) dependencies.add(dep);
  }
  return dependencies;
}

function topologicalOrder(briefs: readonly Brief[]): Brief[] {
  const byId = new Map(briefs.map((brief) => [brief.id, brief]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: Brief[] = [];

  const visit = (brief: Brief): void => {
    if (visited.has(brief.id)) return;
    if (visiting.has(brief.id)) {
      fail(
        `subagent dependency cycle includes '${brief.id}'`,
        "Remove the cycle or collapse the dependent work into one sequential brief.",
      );
    }
    visiting.add(brief.id);
    for (const dep of brief.dependsOn ?? []) {
      const dependency = byId.get(dep);
      if (dependency) visit(dependency);
    }
    visiting.delete(brief.id);
    visited.add(brief.id);
    ordered.push(brief);
  };

  for (const brief of briefs) visit(brief);
  return ordered;
}

export function planSubagentDispatch(
  briefs: readonly Brief[],
  options: DispatchPlanOptions = {},
): DispatchPlan {
  if (briefs.length === 0) {
    fail("at least one brief is required", "Create a concrete worker brief before dispatching.");
  }
  for (const brief of briefs) validateBrief(brief);

  const dependencies = dependencySet(briefs);
  if ((options.strategy ?? "auto") === "fanout" && dependencies.size > 0) {
    fail(
      "fan-out cannot run briefs that depend on each other",
      "Use sequential dispatch for dependent work or split independent briefs only.",
    );
  }

  const order = topologicalOrder(briefs);
  const strategy =
    options.strategy === "fanout" || (options.strategy === "auto" && dependencies.size === 0)
      ? "fanout"
      : "sequential";
  return { strategy, order };
}

export async function fanOutSubagents(
  briefs: readonly Brief[],
  run: (brief: Brief) => Promise<SubagentResult>,
): Promise<readonly SubagentResult[]> {
  const plan = planSubagentDispatch(briefs, { strategy: "fanout" });
  return Promise.all(plan.order.map((brief) => run(brief)));
}

export function costReport(results: readonly SubagentResult[]): SubagentCostReport {
  return {
    totalInputTokens: results.reduce((sum, result) => sum + result.usage.inputTokens, 0),
    totalOutputTokens: results.reduce((sum, result) => sum + result.usage.outputTokens, 0),
    totalReasoningTokens: results.reduce(
      (sum, result) => sum + result.usage.reasoningOutputTokens,
      0,
    ),
    maxDurationMs: results.reduce((max, result) => Math.max(max, result.durationMs), 0),
    subagents: results.length,
  };
}
