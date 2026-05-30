import { z } from "zod";
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

/**
 * Runtime shape + semantic validation for {@link Brief}. The public type keeps
 * its `readonly` immutability contract (see project immutability rules), so we
 * validate against this schema at the boundary rather than deriving the type
 * from it. Each rule mirrors a tailored DX suggestion surfaced via {@link fail}.
 */
const budgetCapSchema = z.object({
  durationMs: z.number().positive(),
  costUsd: z.number().nonnegative(),
  tokenLimit: z.number().positive(),
});

const briefSchema = z.object({
  id: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  outputFormat: z.record(z.string(), z.unknown()),
  allowedTools: z.array(z.string()).min(1),
  contextRefs: z.array(z.string()),
  boundaries: z.array(z.string()).min(1),
  budget: budgetCapSchema,
  dependsOn: z.array(z.string()).optional(),
});

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

/**
 * Per-top-level-field DX messages, keyed by the failing schema path. Keeps the
 * exact "message. Suggestion: …" surface the callers (and tests) rely on while
 * the heavy lifting (shape + bounds) moves into {@link briefSchema}.
 */
const BRIEF_FIELD_FAILURE: Record<string, { message: string; suggestion: string }> = {
  id: { message: "brief.id is required", suggestion: "Use a stable role or task id." },
  objective: {
    message: "brief.objective is required",
    suggestion: "Write a concrete objective before dispatching.",
  },
  outputFormat: {
    message: "brief.outputFormat is invalid",
    suggestion: "Provide an output schema object the worker must conform to.",
  },
  allowedTools: {
    message: "brief.allowedTools is required",
    suggestion: "Constrain each subagent to an explicit tool scope.",
  },
  contextRefs: {
    message: "brief.contextRefs is invalid",
    suggestion: "Pass an array of context references (may be empty).",
  },
  boundaries: {
    message: "brief.boundaries is required",
    suggestion: "State at least one boundary for the worker.",
  },
  budget: {
    message: "brief.budget is invalid",
    suggestion: "Set positive token/time caps and a non-negative cost cap.",
  },
  dependsOn: {
    message: "brief.dependsOn is invalid",
    suggestion: "List dependency brief ids as an array of strings.",
  },
};

function validateBrief(brief: Brief): void {
  const result = briefSchema.safeParse(brief);
  if (result.success) return;

  const topLevelField = result.error.issues[0]?.path[0];
  const failure =
    typeof topLevelField === "string" ? BRIEF_FIELD_FAILURE[topLevelField] : undefined;
  if (failure) fail(failure.message, failure.suggestion);
  fail("brief is invalid", "Provide every required brief field with valid values.");
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
