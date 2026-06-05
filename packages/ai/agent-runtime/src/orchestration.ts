import { type GraphEdge, hasCycleFrom } from "@nebutra/graph-model";
import { z } from "zod";
import type { TurnUsage } from "./model";

export interface BudgetCap {
  readonly durationMs: number;
  readonly costUsd: number;
  readonly tokenLimit: number;
}

/** Thinking/reasoning effort for a node (maps to provider reasoning controls). */
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

/** Output modality a node produces. Mirrors @nebutra/ai-providers ModelModality. */
export type ModelModality = "text" | "image" | "video" | "audio" | "embedding";

/**
 * Per-node model selection — the full model meta-info a node can declare. ALL
 * fields optional; an unset field inherits the run-level default
 * (WorkflowDefinition.defaultModel / runTurn config). The executor resolves
 * these HINTS against @nebutra/ai-providers/catalog (listModelsByModality /
 * resolveFrontierModel) to a concrete model — so a node can either PIN one
 * (`id`) or DESCRIBE what it needs ("the latest fast text model with vision").
 */
export interface NodeModelSpec {
  /** Explicit pin: preset alias (`flagship`/`reasoning`/`fast`) or `provider/model` id. */
  readonly id?: string;
  /** Thinking effort: `low` → cheap/quick, `xhigh` → deepest reasoning. */
  readonly reasoningEffort?: ReasoningEffort;
  /** Output modality — selects a model of this modality when `id` is unset. */
  readonly modality?: ModelModality;
  /** Capabilities the selected model MUST have (e.g. a node needing image input). */
  readonly capabilities?: {
    readonly vision?: boolean;
    readonly toolCall?: boolean;
    readonly reasoning?: boolean;
  };
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
  /** Per-node model meta-info (id/preset · thinking effort · modality · capabilities). */
  readonly model?: NodeModelSpec;
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
  model: z
    .object({
      id: z.string().trim().min(1).optional(),
      reasoningEffort: z.enum(["low", "medium", "high", "xhigh"]).optional(),
      modality: z.enum(["text", "image", "video", "audio", "embedding"]).optional(),
      capabilities: z
        .object({
          vision: z.boolean().optional(),
          toolCall: z.boolean().optional(),
          reasoning: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
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
  model: {
    message: "brief.model is invalid",
    suggestion: "Use a preset alias or 'provider/model' id, or omit to inherit the run default.",
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

/** Dependency edges (dep → brief) over the brief set; refs to unknown ids drop. */
function briefEdges(briefs: readonly Brief[]): GraphEdge[] {
  const ids = new Set(briefs.map((brief) => brief.id));
  const edges: GraphEdge[] = [];
  for (const brief of briefs) {
    for (const dep of brief.dependsOn ?? []) {
      if (ids.has(dep)) edges.push({ from: dep, to: brief.id });
    }
  }
  return edges;
}

/**
 * Cycle guard via the SINGLE repo-wide cycle-detection algorithm
 * (`@nebutra/graph-model` `hasCycleFrom`). No private DFS cycle-walker lives here.
 */
function assertAcyclic(briefs: readonly Brief[], edges: readonly GraphEdge[]): void {
  for (const brief of briefs) {
    if (hasCycleFrom(edges, brief.id)) {
      fail(
        `subagent dependency cycle includes '${brief.id}'`,
        "Remove the cycle or collapse the dependent work into one sequential brief.",
      );
    }
  }
}

/**
 * Dependency-resolved execution WAVES — the agent node-topology scheduler. Each
 * wave is the set of briefs whose dependencies are satisfied by earlier waves;
 * waves run in order, briefs within a wave run in parallel. Input order is
 * preserved within a wave.
 */
export function planWaves(briefs: readonly Brief[]): readonly (readonly Brief[])[] {
  const edges = briefEdges(briefs);
  assertAcyclic(briefs, edges);

  const byId = new Map(briefs.map((brief) => [brief.id, brief]));
  const done = new Set<string>();
  const waves: Brief[][] = [];

  while (done.size < briefs.length) {
    const wave: Brief[] = [];
    for (const brief of briefs) {
      if (done.has(brief.id)) continue;
      const deps = (brief.dependsOn ?? []).filter((dep) => byId.has(dep));
      if (deps.every((dep) => done.has(dep))) wave.push(brief);
    }
    if (wave.length === 0) {
      // assertAcyclic already ruled out cycles; only a logic bug reaches here.
      fail(
        "subagent dependencies cannot be resolved into waves",
        "Ensure every dependsOn id references a brief in the set.",
      );
    }
    for (const brief of wave) done.add(brief.id);
    waves.push(wave);
  }
  return waves;
}

function topologicalOrder(briefs: readonly Brief[]): Brief[] {
  return planWaves(briefs).flat();
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

/**
 * Execute briefs as a dependency graph: each wave runs in parallel, waves run
 * sequentially. The node-topology execution path — `fanOutSubagents` is the
 * degenerate single-wave (all-independent) case of this.
 */
export async function runAgentWaves(
  briefs: readonly Brief[],
  run: (brief: Brief) => Promise<SubagentResult>,
): Promise<readonly SubagentResult[]> {
  for (const brief of briefs) validateBrief(brief);
  const results: SubagentResult[] = [];
  for (const wave of planWaves(briefs)) {
    const waveResults = await Promise.all(wave.map((brief) => run(brief)));
    results.push(...waveResults);
  }
  return results;
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
