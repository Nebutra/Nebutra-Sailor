/**
 * Headless agent turn — drives `runTurn` from @nebutra/agent-runtime to
 * completion and returns the final text + token usage. Used by the automation
 * runner (and any other non-SSE caller). Mirrors the wiring in
 * routes/agent-runtime/index.ts but durable-by-default and non-streaming.
 */

import {
  type ModelInvoker,
  PersistentRolloutStore,
  type RolloutStore,
  runTurn,
  ToolRegistry,
  type TurnConfig,
} from "@nebutra/agent-runtime";
import {
  createPrismaRolloutPersistence,
  type PrismaRolloutDelegate,
} from "@nebutra/agent-runtime/adapters/prisma-rollout";
import type { AgentConfig, AgentResponse } from "@nebutra/agents";
import { AgentOrchestrator, createAgentContext } from "@nebutra/agents";
import { getTenantDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { DEFAULT_AGENTS } from "../agents/default-agents.js";

let orchestrator: AgentOrchestrator | null = null;
let initAttempted = false;

function getOrchestrator(): AgentOrchestrator | null {
  if (orchestrator) return orchestrator;
  if (initAttempted) return null;
  initAttempted = true;
  try {
    const agents: AgentConfig[] = DEFAULT_AGENTS.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      model: a.model,
      instructions: a.instructions,
      maxSteps: a.maxSteps,
      memory: a.memory,
    }));
    orchestrator = new AgentOrchestrator({ agents, defaultAgentId: "assistant" });
  } catch (err) {
    logger.warn("agent-run: orchestrator unavailable", { error: err });
    orchestrator = null;
  }
  return orchestrator;
}

/** Automation runs are durable: rollout lines persist for replay/debugging. */
function durableRolloutStore(): RolloutStore {
  return new PersistentRolloutStore(
    createPrismaRolloutPersistence(async (tid: string) => {
      const db = await getTenantDb(tid);
      return (db as unknown as { agentRolloutLine: PrismaRolloutDelegate }).agentRolloutLine;
    }),
  );
}

export interface AgentTurnInput {
  tenantId: string;
  threadId: string;
  input: string;
  model: string;
}

export interface AgentTurnResult {
  ok: boolean;
  summary: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Run a single agent turn to completion. Tools are an empty registry (text-only
 * research/synthesis on tenant-scoped data); any approval request auto-denies so
 * an automated run never stalls waiting for a human.
 */
export async function runAgentTurn(opts: AgentTurnInput): Promise<AgentTurnResult> {
  const orch = getOrchestrator();
  if (!orch) {
    return { ok: false, summary: "model stack unavailable", inputTokens: 0, outputTokens: 0 };
  }

  let summary = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const model: ModelInvoker = {
    async invoke() {
      const response: AgentResponse = await orch.chat(
        opts.input,
        createAgentContext(opts.tenantId, "automation", opts.threadId),
      );
      const last = response.messages.at(-1);
      summary = last?.content ?? "";
      inputTokens += response.usage.promptTokens;
      outputTokens += response.usage.completionTokens;
      return {
        emissions: [{ kind: "text", text: summary }],
        usage: {
          inputTokens: response.usage.promptTokens,
          outputTokens: response.usage.completionTokens,
        },
      };
    },
  };

  const config: TurnConfig = {
    model: opts.model,
    provider: "gateway",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  };

  try {
    const events = runTurn(opts.input, {
      tenantId: opts.tenantId,
      threadId: opts.threadId,
      config,
      approvalPolicy: { kind: "on_request" },
      model,
      tools: new ToolRegistry(),
      store: durableRolloutStore(),
      approvalGate: {
        async request() {
          return { kind: "denied" };
        },
      },
    });
    // Drain to completion; the modelInvoker closure captures the final text.
    for await (const _event of events) {
      // no-op: rollout store persists the trace; we only need the final summary.
    }
    return { ok: summary.length > 0, summary, inputTokens, outputTokens };
  } catch (err) {
    logger.error("[agent-run] runTurn failed", {
      error: err instanceof Error ? err.message : String(err),
      tenantId: opts.tenantId,
    });
    return { ok: false, summary: summary || "run failed", inputTokens, outputTokens };
  }
}
