/**
 * runTurnCapture — drive ONE agent turn against the real provider stack at a
 * concrete model, returning the final text + token usage. The shared primitive
 * behind both the workflow node executor (lib/workflow-run.ts) and the workflow
 * sandbox host (lib/workflow-execute.ts) — so the runTurn + AgentsModelInvoker
 * wiring lives in exactly one place.
 *
 * Tools are an empty registry (text completion on tenant data); any approval
 * request auto-denies so an automated turn never stalls on a human.
 */

import {
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runTurn,
  ToolRegistry,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import { createAgentsModelInvoker } from "@nebutra/agent-runtime/adapters";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import { getTenantDb } from "@nebutra/db";

export interface TurnCaptureInput {
  readonly tenantId: string;
  readonly threadId: string;
  /** Concrete model id (already resolved from any NodeModelSpec). */
  readonly model: string;
  readonly input: string;
}

export interface TurnCapture {
  readonly text: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
}

/**
 * Durable rollout store — rollout lines persist for replay/debug. The single
 * shared builder (previously duplicated across agent-run / agent-runtime-route /
 * workflow-run).
 */
export function durableRolloutStore(): RolloutStore {
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

export async function runTurnCapture(opts: TurnCaptureInput): Promise<TurnCapture> {
  let text = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningOutputTokens = 0;

  const base = createAgentsModelInvoker();
  const invoker: ModelInvoker = {
    async invoke(request) {
      const round = await base.invoke(request);
      for (const emission of round.emissions) {
        if (emission.kind === "text") text = emission.text;
      }
      inputTokens += round.usage?.inputTokens ?? 0;
      outputTokens += round.usage?.outputTokens ?? 0;
      reasoningOutputTokens += round.usage?.reasoningOutputTokens ?? 0;
      return round;
    },
  };

  const config: TurnConfig = {
    model: opts.model,
    provider: "gateway",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  };

  const events = runTurn(opts.input, {
    tenantId: opts.tenantId,
    threadId: opts.threadId,
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
    // no-op: the rollout store persists the trace; we keep the final capture.
  }

  return { text, inputTokens, outputTokens, reasoningOutputTokens };
}
