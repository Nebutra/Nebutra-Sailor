/**
 * Agent loop runner (WRAP — the turn engine).
 *
 * Faithful re-expression of the upstream loop: a turn is
 * `loop { model_call → emit items → execute tools → feed results back }`
 * until the model stops requesting tools or a bounded step ceiling is hit.
 * Single-threaded (Cognition teaching: shared context, no conflicting
 * sub-agent decisions). Every item is appended to the tenant-scoped rollout
 * as it reaches a terminal state, so the turn is resumable by replay.
 *
 * The model call is abstracted behind {@link ModelInvoker} so this WRAPs an
 * existing model stack (e.g. `@nebutra/agents`) rather than re-porting
 * provider/routing/fallback. No untrusted code runs here — command items are
 * dispatched through the tool registry / external-sandbox seam.
 */

import type { AgentMessageItem, ThreadEvent, ThreadItem, TurnConfig, TurnUsage } from "./model";
import {
  type ApprovalPolicy,
  DENIED,
  isApproval,
  type ReviewDecision,
  type RuleDecision,
  resolveRuleDecision,
} from "./policy";
import type { ServerRequest } from "./protocol";
import { type RolloutLine, type RolloutStore, sanitizeForPersist } from "./rollout";
import type { RuntimeToolRegistry, ToolDispatchContext } from "./tools";

/** A single thing the model emitted in one round. */
export type ModelEmission =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "tool_call";
      readonly id: string;
      readonly name: string;
      readonly args: unknown;
    };

export interface ModelRoundResult {
  readonly emissions: readonly ModelEmission[];
  readonly usage?: Partial<TurnUsage>;
}

export interface ModelRoundRequest {
  readonly config: TurnConfig;
  /** Running transcript: user input, agent text, and tool results. */
  readonly history: readonly { readonly role: string; readonly content: string }[];
  readonly toolNames: readonly string[];
}

/** Abstracts the model stack — implement over `@nebutra/agents`, etc. */
export interface ModelInvoker {
  invoke(request: ModelRoundRequest): Promise<ModelRoundResult>;
}

/** Server-initiated approval transport (see {@link ServerRequest}). */
export interface ApprovalGate {
  request(serverRequest: ServerRequest): Promise<ReviewDecision>;
}

/** Classifies a tool call into a static rule decision before approval. */
export type RuleEvaluator = (toolName: string, args: unknown) => RuleDecision;

export interface RunTurnDeps {
  readonly tenantId: string;
  readonly threadId: string;
  readonly config: TurnConfig;
  readonly approvalPolicy: ApprovalPolicy;
  readonly model: ModelInvoker;
  readonly tools: RuntimeToolRegistry;
  readonly store: RolloutStore;
  readonly approvalGate: ApprovalGate;
  /** Defaults to: everything requires a prompt (safe). */
  readonly ruleEvaluator?: RuleEvaluator;
  /** Bounded steps (parity with upstream step ceiling). Default 20. */
  readonly maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 20;
const requirePrompt: RuleEvaluator = () => "prompt";

function newId(prefix: string): string {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

/**
 * Drive one turn to completion. Yields the {@link ThreadEvent} stream and
 * appends each terminal item + the turn outcome to the rollout store.
 * Never throws to the caller — failures surface as a `turn.failed` event.
 */
export async function* runTurn(userInput: string, deps: RunTurnDeps): AsyncGenerator<ThreadEvent> {
  const at = () => new Date().toISOString();
  const ruleEvaluator = deps.ruleEvaluator ?? requirePrompt;
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  const ctx: ToolDispatchContext = { tenantId: deps.tenantId, threadId: deps.threadId };

  const append = async (line: RolloutLine): Promise<void> => deps.store.append(line);
  const event = async (e: ThreadEvent): Promise<ThreadEvent> => {
    await append({
      tenantId: deps.tenantId,
      threadId: deps.threadId,
      type: "event",
      event:
        e.type === "item.completed"
          ? { type: "item.completed", item: sanitizeForPersist(e.item) }
          : e,
      at: at(),
    });
    return e;
  };

  yield await event({ type: "turn.started" });

  const history: { role: string; content: string }[] = [{ role: "user", content: userInput }];
  let usage: TurnUsage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  };

  try {
    for (let step = 0; step < maxSteps; step++) {
      const round = await deps.model.invoke({
        config: deps.config,
        history,
        toolNames: deps.tools.list().map((t) => t.definition.name),
      });
      if (round.usage) {
        const u = round.usage;
        usage = {
          inputTokens: usage.inputTokens + (u.inputTokens ?? 0),
          cachedInputTokens: usage.cachedInputTokens + (u.cachedInputTokens ?? 0),
          outputTokens: usage.outputTokens + (u.outputTokens ?? 0),
          reasoningOutputTokens: usage.reasoningOutputTokens + (u.reasoningOutputTokens ?? 0),
        };
      }

      const toolCalls = round.emissions.filter(
        (e): e is Extract<ModelEmission, { kind: "tool_call" }> => e.kind === "tool_call",
      );

      for (const e of round.emissions) {
        if (e.kind !== "text") continue;
        const item: AgentMessageItem = { id: newId("msg"), type: "agent_message", text: e.text };
        history.push({ role: "assistant", content: e.text });
        yield await event({ type: "item.completed", item });
      }

      if (toolCalls.length === 0) break; // model is done

      for (const call of toolCalls) {
        const decision = await gateToolCall(call.name, call.args, deps, ruleEvaluator);
        if (!isApproval(decision)) {
          const failed: ThreadItem = {
            id: call.id,
            type: "error",
            message: `tool '${call.name}' not approved (${decision.kind})`,
          };
          history.push({ role: "tool", content: `DENIED: ${call.name}` });
          yield await event({ type: "item.completed", item: failed });
          continue;
        }
        try {
          const output = await deps.tools.dispatch(call.name, call.args, ctx);
          const item: ThreadItem = {
            id: call.id,
            type: "mcp_tool_call",
            server: "native",
            tool: call.name,
            arguments: call.args,
            result: { content: output },
            status: "completed",
          };
          history.push({ role: "tool", content: JSON.stringify(output) });
          yield await event({ type: "item.completed", item });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          history.push({ role: "tool", content: `ERROR: ${message}` });
          yield await event({
            type: "item.completed",
            item: { id: call.id, type: "error", message },
          });
        }
      }
    }

    yield await event({ type: "turn.completed", usage });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield await event({ type: "turn.failed", error: { message } });
  }
}

/** Resolve a tool call's approval, raising a server-initiated request if asked. */
async function gateToolCall(
  name: string,
  args: unknown,
  deps: RunTurnDeps,
  ruleEvaluator: RuleEvaluator,
): Promise<ReviewDecision> {
  const outcome = resolveRuleDecision(ruleEvaluator(name, args), deps.approvalPolicy);
  if (outcome === "auto_allow") return { kind: "approved" };
  if (outcome === "auto_reject") return DENIED;
  return deps.approvalGate.request({
    type: "permissions.request_approval",
    requestId: newId("appr"),
    summary: `tool '${name}'`,
  });
}
