/**
 * The gateway's single shared AgentOrchestrator.
 *
 * Three call sites — the chat route (`routes/agents`), the agent-runtime route
 * (`routes/agent-runtime`), and the headless automation runner (`lib/agent-run`)
 * — each used to keep their OWN lazy `let orchestrator` built from the same
 * DEFAULT_AGENTS. That meant three identical instances and three places to
 * drift. This module is the one factory; every call site imports it.
 *
 * Returns null when agents cannot be configured (e.g. missing provider config)
 * so callers degrade gracefully. Tools are referenced by name and resolved when
 * a concrete provider adapter is registered via `orchestrator.registerAgent()`.
 */

import type { AgentConfig } from "@nebutra/agents";
import { AgentOrchestrator } from "@nebutra/agents";
import { logger } from "@nebutra/logger";
import { DEFAULT_AGENTS } from "./default-agents.js";

let orchestrator: AgentOrchestrator | null = null;
let initAttempted = false;

/** Lazily build (once) and return the shared orchestrator, or null if unavailable. */
export function getGatewayOrchestrator(): AgentOrchestrator | null {
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
    logger.info("Agent orchestrator initialized", { agentCount: agents.length });
  } catch (err) {
    logger.warn("gateway: orchestrator unavailable", { error: err });
    orchestrator = null;
  }
  return orchestrator;
}
