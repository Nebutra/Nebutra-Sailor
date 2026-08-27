/**
 * AgentOrchestrator — single-agent routing for the gateway's chat surface.
 *
 * Routes a message to the best-matching registered agent and executes it.
 * Multi-agent fan-out / pipeline orchestration deliberately does NOT live here:
 * that grammar is owned by @nebutra/agent-runtime (planWaves / runAgentWaves
 * over a node topology), the single source of truth for wave scheduling. The
 * previous `broadcast()` / `pipeline()` methods were unwired @experimental
 * duplicates and were removed to keep one orchestration substrate.
 */

import { BaseAgent } from "./agent";
import { AgentRouter } from "./router";
import { checkAgentQuota } from "./tenant";
import type { AgentContext, AgentMessage, AgentResponse, OrchestratorConfig } from "./types";

export class AgentOrchestrator {
  private readonly agents: Map<string, BaseAgent>;
  private readonly router: AgentRouter;
  private readonly defaultAgentId: string | undefined;

  constructor(config: OrchestratorConfig) {
    this.agents = new Map();
    this.defaultAgentId = config.defaultAgentId;

    // Register agents — callers provide AgentConfig[], we wrap in BaseAgent.
    // In practice, callers will register concrete subclasses (VercelAIAgent, etc.)
    for (const agentConfig of config.agents) {
      this.agents.set(agentConfig.id, new BaseAgent(agentConfig));
    }

    this.router = new AgentRouter(config.router ?? { strategy: "keyword" });
  }

  /**
   * Register a pre-built agent instance (e.g. VercelAIAgent).
   * Overwrites any agent with the same ID.
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.config.id, agent);
  }

  /** Get a registered agent by ID. */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /** Route a message to the best agent and execute. */
  async chat(message: string, context: AgentContext): Promise<AgentResponse> {
    await this.assertQuota(context.tenantId);

    const agentConfigs = [...this.agents.values()].map((a) => a.config);
    const agentId = await this.router.route(message, agentConfigs, context, this.defaultAgentId);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent "${agentId}" not found in orchestrator`);
    }

    const messages: AgentMessage[] = [{ role: "user", content: message, timestamp: new Date() }];

    return agent.run(messages, context);
  }

  /** Check tenant quota before execution. */
  private async assertQuota(tenantId: string): Promise<void> {
    const { allowed } = await checkAgentQuota(tenantId);
    if (!allowed) {
      throw new Error(`Tenant "${tenantId}" has exceeded agent execution quota`);
    }
  }
}
