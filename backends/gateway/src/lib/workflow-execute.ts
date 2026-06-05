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

import { resolveModelSpec } from "@nebutra/ai-providers/catalog";
import {
  type AgentCallOpts,
  createQuickJSSandbox,
  type HostBindings,
  type SandboxLimits,
} from "@nebutra/workflow-runtime";
import { runTurnCapture } from "./agent-turn.js";

export interface WorkflowEvent {
  readonly type: "log" | "phase";
  readonly message: string;
}

export interface WorkflowExecInput {
  readonly tenantId: string;
  readonly threadId: string;
  readonly defaultModel: string;
  readonly scriptSource: string;
  readonly args: unknown;
  readonly limits: SandboxLimits;
}

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

/** One agent call → text + usage. Injectable so the closure is provider-free testable. */
export type WorkflowAgentCaller = (
  prompt: string,
  opts: AgentCallOpts | undefined,
  ctx: { readonly tenantId: string; readonly threadId: string; readonly defaultModel: string },
) => Promise<{
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
}>;

/** Default caller: resolve the per-call model from opts.model, then run a turn. */
const liveAgentCaller: WorkflowAgentCaller = async (prompt, opts, ctx) => {
  const model = await resolveModelSpec(opts?.model ?? {}, ctx.defaultModel);
  return runTurnCapture({ tenantId: ctx.tenantId, threadId: ctx.threadId, model, input: prompt });
};

export async function runWorkflowDefinition(
  input: WorkflowExecInput,
  agentCaller: WorkflowAgentCaller = liveAgentCaller,
): Promise<WorkflowExecOutcome> {
  const events: WorkflowEvent[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningOutputTokens = 0;
  let agentCalls = 0;

  const host: HostBindings = {
    async agent(prompt, opts) {
      const callIndex = agentCalls;
      agentCalls += 1;
      const capture = await agentCaller(prompt, opts, {
        tenantId: input.tenantId,
        threadId: `${input.threadId}:a${callIndex}`,
        defaultModel: input.defaultModel,
      });
      inputTokens += capture.inputTokens;
      outputTokens += capture.outputTokens;
      reasoningOutputTokens += capture.reasoningOutputTokens;
      return capture.text;
    },
    log(message) {
      events.push({ type: "log", message });
    },
    phase(title) {
      events.push({ type: "phase", message: title });
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
