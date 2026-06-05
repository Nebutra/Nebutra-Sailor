/**
 * runWorkflowDefinition — the end-to-end workflow closure.
 *
 * Executes a tenant's untrusted scriptSource inside the QuickJS sandbox
 * (@nebutra/workflow-runtime), wiring the guest `agent()` binding to the REAL
 * provider stack: each call resolves its per-node model (opts.model →
 * resolveModelSpec) and drives one runTurn (runTurnCapture). `log`/`phase`
 * become workflow events; token usage + agent-call count are aggregated for the
 * WorkflowRun row.
 *
 * The per-call model execution is injectable (WorkflowAgentCaller) so the whole
 * closure — sandbox + host + aggregation — is testable without a provider.
 */

import { generateStructured, type ModelMessage } from "@nebutra/agents";
import { resolveModelSpec } from "@nebutra/ai-providers/catalog";
import { getWorkflowRepository } from "@nebutra/repositories";
import {
  type AgentCallOpts,
  createQuickJSSandbox,
  type HostBindings,
  type SandboxLimits,
} from "@nebutra/workflow-runtime";
import { runTurnCapture } from "./agent-turn.js";

/** Max runWorkflow() nesting depth — one level, mirroring Claude Code's workflow(). */
const MAX_WORKFLOW_DEPTH = 1;

export interface WorkflowEvent {
  readonly type: "log" | "phase";
  readonly message: string;
}

/**
 * Live event surfaced via {@link WorkflowExecInput.onEvent} as the run
 * progresses. Superset of the persisted {@link WorkflowEvent}: adds per-agent
 * start/finish so a client can render activity, not just narration. Only
 * log/phase are persisted to WorkflowRun.events.
 */
export type WorkflowStreamEvent =
  | WorkflowEvent
  | { readonly type: "agent_start"; readonly index: number; readonly label?: string }
  | { readonly type: "agent_finish"; readonly index: number };

export interface WorkflowExecInput {
  readonly tenantId: string;
  readonly threadId: string;
  readonly defaultModel: string;
  readonly scriptSource: string;
  readonly args: unknown;
  readonly limits: SandboxLimits;
  /** Optional live event sink (e.g. an SSE writer). Omit for a headless run. */
  readonly onEvent?: (event: WorkflowStreamEvent) => void;
  /** Nesting depth of this run (0 = top-level). Set by runWorkflow() recursion. */
  readonly depth?: number;
}

/** Minimal shape a sub-workflow loader must return (a WorkflowDefinition is assignable). */
export interface LoadedWorkflow {
  readonly defaultModel: string;
  readonly scriptSource: string;
  readonly maxConcurrency: number;
  readonly maxAgentsPerRun: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly status?: string;
}

/** Resolve a sub-workflow definition by id, tenant-scoped. Injectable for tests. */
export type WorkflowLoader = (
  workflowId: string,
  tenantId: string,
) => Promise<LoadedWorkflow | null>;

const liveWorkflowLoader: WorkflowLoader = (workflowId, tenantId) =>
  getWorkflowRepository(tenantId).findById(workflowId);

export interface WorkflowUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
}

export interface WorkflowExecOutcome {
  readonly ok: boolean;
  readonly returnValue: unknown;
  readonly error?: string;
  readonly events: readonly WorkflowEvent[];
  readonly usage: WorkflowUsage;
  readonly agentCalls: number;
}

/**
 * One agent call → output + usage. `output` is the model text, OR — when the
 * call carries a `schema` — a schema-validated object. Injectable so the whole
 * closure is provider-free testable.
 */
export type WorkflowAgentCaller = (
  prompt: string,
  opts: AgentCallOpts | undefined,
  ctx: { readonly tenantId: string; readonly threadId: string; readonly defaultModel: string },
) => Promise<{
  readonly output: unknown;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
}>;

/**
 * Default caller: resolve the per-call model, then either force a
 * schema-validated structured object (opts.schema) or run a text turn.
 */
const liveAgentCaller: WorkflowAgentCaller = async (prompt, opts, ctx) => {
  const model = await resolveModelSpec(opts?.model ?? {}, ctx.defaultModel);

  if (opts?.schema) {
    const messages: ModelMessage[] = [{ role: "user", content: prompt }];
    const { output, usage } = await generateStructured(messages, opts.schema, { model });
    return { output, ...usage };
  }

  const capture = await runTurnCapture({
    tenantId: ctx.tenantId,
    threadId: ctx.threadId,
    model,
    input: prompt,
  });
  return {
    output: capture.text,
    inputTokens: capture.inputTokens,
    outputTokens: capture.outputTokens,
    reasoningOutputTokens: capture.reasoningOutputTokens,
  };
};

export async function runWorkflowDefinition(
  input: WorkflowExecInput,
  agentCaller: WorkflowAgentCaller = liveAgentCaller,
  loadWorkflow: WorkflowLoader = liveWorkflowLoader,
): Promise<WorkflowExecOutcome> {
  const events: WorkflowEvent[] = [];
  const emit = input.onEvent;
  const depth = input.depth ?? 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningOutputTokens = 0;
  let agentCalls = 0;

  const host: HostBindings = {
    async runWorkflow(workflowId, subArgs) {
      if (depth >= MAX_WORKFLOW_DEPTH) {
        throw new Error(`runWorkflow nesting is limited to ${MAX_WORKFLOW_DEPTH} level`);
      }
      const subDef = await loadWorkflow(workflowId, input.tenantId);
      if (!subDef) throw new Error(`workflow not found: ${workflowId}`);
      if (subDef.status && subDef.status !== "ACTIVE") {
        throw new Error(`workflow ${workflowId} is ${subDef.status}`);
      }

      const sub = await runWorkflowDefinition(
        {
          tenantId: input.tenantId,
          threadId: `${input.threadId}:w${agentCalls}`,
          defaultModel: subDef.defaultModel,
          scriptSource: subDef.scriptSource,
          args: subArgs ?? {},
          limits: {
            maxConcurrency: subDef.maxConcurrency,
            maxAgentsPerRun: subDef.maxAgentsPerRun,
            maxRetries: subDef.maxRetries,
            timeoutMs: subDef.timeoutMs,
          },
          depth: depth + 1,
          ...(emit ? { onEvent: emit } : {}),
        },
        agentCaller,
        loadWorkflow,
      );

      // Roll the sub-run's cost into this run so WorkflowRun stats are complete.
      inputTokens += sub.usage.inputTokens;
      outputTokens += sub.usage.outputTokens;
      reasoningOutputTokens += sub.usage.reasoningOutputTokens;
      agentCalls += sub.agentCalls;

      if (!sub.ok) throw new Error(sub.error ?? "sub-workflow failed");
      return sub.returnValue;
    },
    async agent(prompt, opts) {
      const callIndex = agentCalls;
      agentCalls += 1;
      emit?.({
        type: "agent_start",
        index: callIndex,
        ...(opts?.label ? { label: opts.label } : {}),
      });
      const capture = await agentCaller(prompt, opts, {
        tenantId: input.tenantId,
        threadId: `${input.threadId}:a${callIndex}`,
        defaultModel: input.defaultModel,
      });
      inputTokens += capture.inputTokens;
      outputTokens += capture.outputTokens;
      reasoningOutputTokens += capture.reasoningOutputTokens;
      emit?.({ type: "agent_finish", index: callIndex });
      return capture.output;
    },
    log(message) {
      const event: WorkflowEvent = { type: "log", message };
      events.push(event);
      emit?.(event);
    },
    phase(title) {
      const event: WorkflowEvent = { type: "phase", message: title };
      events.push(event);
      emit?.(event);
    },
  };

  const result = await createQuickJSSandbox().run({
    scriptSource: input.scriptSource,
    args: input.args,
    limits: input.limits,
    host,
  });

  return {
    ok: result.ok,
    returnValue: result.returnValue,
    ...(result.error ? { error: result.error } : {}),
    events,
    usage: { inputTokens, outputTokens, reasoningOutputTokens },
    agentCalls,
  };
}
